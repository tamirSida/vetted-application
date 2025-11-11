import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export interface OpenAIRequest {
  model: string;
  input: string;
  reasoning?: {
    effort: 'minimal' | 'low' | 'medium' | 'high';
  };
  text?: {
    verbosity: 'low' | 'medium' | 'high';
  };
  max_output_tokens?: number;
  tools?: any[];
  tool_choice?: any;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created_at: number;
  model: string;
  status: string;
  output?: Array<{
    id: string;
    type: 'reasoning' | 'message';
    content?: Array<{
      type: 'output_text';
      text: string;
    }>;
  }>;
  output_text?: string; // Fallback for old format
  usage?: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens?: number;
    total_tokens: number;
  };
}

export interface ProblemCustomerAnalysis {
  score: number; // 1-10 scale
  isSpecific: boolean;
  hasClearTarget: boolean;
  hasDefinedProblem: boolean;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OpenAIService {
  
  constructor(private http: HttpClient) {}

  /**
   * General method to call OpenAI API via Netlify function
   */
  async callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
    try {
      console.log('🔄 Making OpenAI API request:', request);
      const response = await firstValueFrom(
        this.http.post<OpenAIResponse>('/.netlify/functions/openai-api', request)
      );
      console.log('✅ OpenAI API response:', response);
      return response;
    } catch (error) {
      console.error('❌ OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Analyze Problem & Customer description for Phase 3 applications
   */
  async analyzeProblemCustomer(problemCustomerText: string): Promise<ProblemCustomerAnalysis> {
    const fullPrompt = `You are an expert startup advisor analyzing customer problem descriptions. 

EVALUATION CRITERIA:
- Specific target customer (role, company size, industry)
- Clear problem statement tied to that customer
- Actionable insights vs vague generalizations

GOOD EXAMPLES (Score 8-10):
- "Operations managers at independent logistics companies (10–50 trucks) who struggle with route optimization and driver scheduling due to outdated, manual processes."
- "Parents of children with ADHD who feel overwhelmed managing school communication, therapy coordination, and home routines."
- "New dental practice owners in the U.S. who are unsure how to attract their first 100 patients and manage billing and insurance systems."

BAD EXAMPLES (Score 1-4):
- "Small businesses that need help with marketing." (Too broad)
- "Everyone who wants to be more productive." (Too general)
- "Gen Z consumers who like technology." (Vague demographic)
- "People who want an easier life." (No actionable insight)

Analyze this customer problem description: "${problemCustomerText}"

Provide analysis in JSON format:
{
  "score": <number 1-10>,
  "isSpecific": <boolean>,
  "hasClearTarget": <boolean>, 
  "hasDefinedProblem": <boolean>,
  "feedback": "<detailed explanation of score>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"]
}`;

    const request: OpenAIRequest = {
      model: 'gpt-5-mini',
      input: fullPrompt,
      reasoning: { effort: 'low' },
      text: { verbosity: 'medium' },
      max_output_tokens: 800
    };

    try {
      const response = await this.callOpenAI(request);
      
      // Extract text from the new Responses API format
      let analysisText: string;
      if (response.output && response.output.length > 0) {
        const messageOutput = response.output.find(item => item.type === 'message');
        if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
          analysisText = messageOutput.content[0].text;
        } else {
          throw new Error('No message content found in response');
        }
      } else if (response.output_text) {
        analysisText = response.output_text;
      } else {
        throw new Error('No output found in response');
      }
      
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : analysisText;
      
      return JSON.parse(jsonText) as ProblemCustomerAnalysis;
    } catch (error) {
      console.error('Problem & Customer analysis failed:', error);
      throw new Error('Failed to analyze Problem & Customer description');
    }
  }

  /**
   * General method for text analysis with custom prompts
   */
  async analyzeText(
    text: string, 
    systemPrompt: string, 
    analysisPrompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
      verbosity?: 'low' | 'medium' | 'high';
    }
  ): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n${analysisPrompt}\n\n"${text}"`;
    
    const request: OpenAIRequest = {
      model: options?.model || 'gpt-5-mini',
      input: fullPrompt,
      reasoning: { effort: options?.reasoningEffort || 'low' },
      text: { verbosity: options?.verbosity || 'medium' },
      max_output_tokens: options?.maxTokens || 500
    };

    try {
      const response = await this.callOpenAI(request);
      
      // Extract text from the new Responses API format
      if (response.output && response.output.length > 0) {
        const messageOutput = response.output.find(item => item.type === 'message');
        if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
          return messageOutput.content[0].text;
        }
      }
      
      // Fallback to old format
      return response.output_text || '';
    } catch (error) {
      console.error('Text analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get available models and validate model name
   */
  isValidModel(modelName: string): boolean {
    const validModels = [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ];
    return validModels.includes(modelName);
  }

  /**
   * Estimate token cost for analysis (rough estimation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}