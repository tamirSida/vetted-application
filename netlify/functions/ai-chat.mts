import { Context } from "@netlify/functions";

interface ChatRequest {
  applicantId: string;
  message: string;
  stream?: boolean;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}

const OPENAI_HEADERS = {
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'assistants=v2'
};

export default async (request: Request, context: Context) => {
  console.log('💬 AI Chat Function Started');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { applicantId, message, stream = false }: ChatRequest = await request.json();

    if (!applicantId || !message) {
      throw new Error('applicantId and message are required');
    }

    console.log('💬 Chat request for applicant:', applicantId);

    // Initialize Firebase and get the analysis with threadId
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');

    if (getApps().length === 0) {
      initializeApp({
        apiKey: "AIzaSyC8dVIhL8ug7R5dV7S7ZVo_YTgz4ZS4_UA",
        authDomain: "vetted-application.firebaseapp.com",
        projectId: "vetted-application",
        storageBucket: "vetted-application.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef123456789012345"
      });
    }

    const db = getFirestore();

    // Get existing analysis with threadId
    const analysisDoc = await getDoc(doc(db, 'aiAnalyses', applicantId));

    if (!analysisDoc.exists()) {
      throw new Error('No analysis found for this applicant. Run the analysis first.');
    }

    const analysisData = analysisDoc.data();

    if (!analysisData.threadId) {
      throw new Error('No thread ID found. This analysis may have been created before the chat feature was added.');
    }

    const threadId = analysisData.threadId;
    console.log('🧵 Using existing thread:', threadId);

    // Get assistant ID
    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    if (!assistantId) {
      throw new Error('OPENAI_ASSISTANT_ID environment variable not set');
    }

    // Add the user's message to the thread
    await addMessage(threadId, message);
    console.log('💬 Message added to thread');

    if (stream) {
      // Streaming response
      return await streamResponse(threadId, assistantId);
    } else {
      // Non-streaming response
      const response = await runAssistantAndWait(threadId, assistantId);

      const result: ChatResponse = {
        success: true,
        response,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

  } catch (error: any) {
    console.error('❌ Chat failed:', error);

    const result: ChatResponse = {
      success: false,
      error: error.message,
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// Add a message to a thread
async function addMessage(threadId: string, content: string): Promise<void> {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      role: 'user',
      content,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add message: ${error}`);
  }
}

// Run the assistant and wait for completion (non-streaming)
async function runAssistantAndWait(threadId: string, assistantId: string): Promise<string> {
  // Create run
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      assistant_id: assistantId,
    }),
  });

  if (!runResponse.ok) {
    const error = await runResponse.text();
    throw new Error(`Failed to create run: ${error}`);
  }

  const run = await runResponse.json();
  const runId = run.id;

  // Poll for completion (max 2 minutes for chat)
  const maxAttempts = 24;
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers: OPENAI_HEADERS }
    );

    if (!statusResponse.ok) {
      const error = await statusResponse.text();
      throw new Error(`Failed to check run status: ${error}`);
    }

    const runStatus = await statusResponse.json();
    console.log(`🔄 Run status: ${runStatus.status}`);

    if (runStatus.status === 'completed') {
      // Get the assistant's response
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/messages?order=desc&limit=1`,
        { headers: OPENAI_HEADERS }
      );

      if (!messagesResponse.ok) {
        const error = await messagesResponse.text();
        throw new Error(`Failed to get messages: ${error}`);
      }

      const messages = await messagesResponse.json();
      const lastMessage = messages.data[0];

      if (lastMessage.role === 'assistant') {
        return lastMessage.content[0].text.value;
      }
      throw new Error('No assistant response found');
    }

    if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
      throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
    }
  }

  throw new Error('Run timed out');
}

// Stream response using SSE
async function streamResponse(threadId: string, assistantId: string): Promise<Response> {
  // Create a streaming run
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      ...OPENAI_HEADERS,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      assistant_id: assistantId,
      stream: true,
    }),
  });

  if (!runResponse.ok) {
    const error = await runResponse.text();
    throw new Error(`Failed to create streaming run: ${error}`);
  }

  // Create a TransformStream to process the SSE events
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Process the stream in the background
  (async () => {
    try {
      const reader = runResponse.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              // Handle different event types
              if (event.object === 'thread.message.delta') {
                const delta = event.delta?.content?.[0]?.text?.value;
                if (delta) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
                }
              } else if (event.object === 'thread.run' && event.status === 'completed') {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              } else if (event.object === 'thread.run' &&
                        (event.status === 'failed' || event.status === 'cancelled')) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({
                  error: event.last_error?.message || 'Run failed'
                })}\n\n`));
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (error: any) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
