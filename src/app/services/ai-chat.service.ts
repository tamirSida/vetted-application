import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, firstValueFrom } from 'rxjs';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export interface AiAnalysisWithChat {
  applicantId: string;
  status: 'completed' | 'failed';
  analysis?: any;
  threadId?: string;
  chatHistory?: ChatMessage[];
  deckIncluded: boolean;
  generatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {

  constructor(private http: HttpClient) {}

  /**
   * Send a message and get a response (non-streaming)
   */
  async sendMessage(applicantId: string, message: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<ChatResponse>('/.netlify/functions/ai-chat', {
        applicantId,
        message,
        stream: false
      })
    );

    if (!response.success) {
      throw new Error(response.error || 'Chat request failed');
    }

    // Save to chat history in Firestore
    await this.saveChatMessage(applicantId, 'user', message);
    await this.saveChatMessage(applicantId, 'assistant', response.response!);

    return response.response!;
  }

  /**
   * Stream a message response (SSE)
   * Returns a Subject that emits text chunks as they arrive
   */
  streamMessage(applicantId: string, message: string): Observable<string> {
    const subject = new Subject<string>();
    let fullResponse = '';

    // Save user message immediately
    this.saveChatMessage(applicantId, 'user', message);

    const eventSource = new EventSource(
      `/.netlify/functions/ai-chat-stream?applicantId=${encodeURIComponent(applicantId)}&message=${encodeURIComponent(message)}`
    );

    // For POST-based SSE, we need to use fetch with ReadableStream
    this.streamWithFetch(applicantId, message, subject, fullResponse);

    return subject.asObservable();
  }

  private async streamWithFetch(
    applicantId: string,
    message: string,
    subject: Subject<string>,
    fullResponse: string
  ): Promise<void> {
    try {
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId,
          message,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullResponse += data.text;
                subject.next(data.text);
              }
              if (data.done) {
                // Save assistant response to history
                await this.saveChatMessage(applicantId, 'assistant', fullResponse);
                subject.complete();
                return;
              }
              if (data.error) {
                subject.error(new Error(data.error));
                return;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Save assistant response if stream ended without done signal
      if (fullResponse) {
        await this.saveChatMessage(applicantId, 'assistant', fullResponse);
      }
      subject.complete();
    } catch (error) {
      subject.error(error);
    }
  }

  /**
   * Get chat history for an applicant
   */
  async getChatHistory(applicantId: string): Promise<ChatMessage[]> {
    const db = getFirestore();
    const analysisDoc = await getDoc(doc(db, 'aiAnalyses', applicantId));

    if (!analysisDoc.exists()) {
      return [];
    }

    const data = analysisDoc.data() as AiAnalysisWithChat;
    return data.chatHistory || [];
  }

  /**
   * Check if chat is available (has threadId)
   */
  async isChatAvailable(applicantId: string): Promise<boolean> {
    const db = getFirestore();
    const analysisDoc = await getDoc(doc(db, 'aiAnalyses', applicantId));

    if (!analysisDoc.exists()) {
      return false;
    }

    const data = analysisDoc.data() as AiAnalysisWithChat;
    return !!data.threadId;
  }

  /**
   * Save a chat message to Firestore
   */
  private async saveChatMessage(
    applicantId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const db = getFirestore();
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date()
    };

    try {
      await updateDoc(doc(db, 'aiAnalyses', applicantId), {
        chatHistory: arrayUnion(message)
      });
    } catch (error) {
      console.error('Failed to save chat message:', error);
    }
  }

  /**
   * Clear chat history (keeps the analysis and threadId)
   */
  async clearChatHistory(applicantId: string): Promise<void> {
    const db = getFirestore();
    await updateDoc(doc(db, 'aiAnalyses', applicantId), {
      chatHistory: []
    });
  }
}
