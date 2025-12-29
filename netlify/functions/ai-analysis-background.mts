import { Context } from "@netlify/functions";

interface AnalysisRequest {
  applicantId: string;
  cohortId: string;
  phase1Data: any;
  phase3Data: any;
  deckUrl?: string;
}

interface MarketSizing {
  category: string;
  tam: {
    qualitative: string;
    bottomUp: string;
    topDown: string;
  };
}

interface CompetitiveLandscape {
  directCompetitors: Array<{
    name: string;
    description: string;
  }>;
  legacyCompetitors: Array<{
    name: string;
    description: string;
  }>;
  differentiatorAnalysis: string;
}

interface ReadinessSummary {
  investmentThesis: string;
}

interface AnalysisResult {
  applicantId: string;
  status: 'completed' | 'failed';
  error?: string;
  analysis?: {
    marketSizing: MarketSizing;
    competitiveLandscape: CompetitiveLandscape;
    readinessSummary: ReadinessSummary;
  };
  threadId?: string;  // OpenAI Thread ID for continuing conversation
  deckIncluded: boolean;
  generatedAt: string;
}

const OPENAI_HEADERS = {
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'assistants=v2'
};

const ASSISTANT_INSTRUCTIONS = `You are an expert venture capital analyst for Vetted, a startup accelerator.
You analyze startup applications and provide structured assessments.

When analyzing an application, you should:
1. Review all provided materials (application data, pitch decks)
2. Provide objective, data-driven analysis
3. Identify strengths and potential concerns
4. Be constructive but honest in your assessment

For the initial analysis, return a JSON object with market sizing, competitive landscape, and readiness summary.
For follow-up questions, respond conversationally while referencing the original application context.`;

export default async (request: Request, context: Context) => {
  console.log('🤖 AI Analysis Background Function Started');
  let requestData!: AnalysisRequest;

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    requestData = await request.json();
    console.log('📊 Processing analysis for applicant:', requestData.applicantId);

    // Initialize Firebase
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');

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

    // Step 1: Get or create Assistant
    const assistantId = await getOrCreateAssistant();
    console.log('🤖 Using assistant:', assistantId);

    // Step 2: Upload PDF if provided
    let fileId: string | undefined;
    if (requestData.deckUrl) {
      console.log('📄 Uploading PDF deck...');
      fileId = await uploadPdfFromUrl(requestData.deckUrl);
      console.log('📄 PDF uploaded with file ID:', fileId);
    }

    // Step 3: Create Thread
    console.log('🧵 Creating thread...');
    const threadId = await createThread();
    console.log('🧵 Thread created:', threadId);

    // Step 4: Add message with analysis request
    console.log('💬 Adding analysis message...');
    await addMessage(threadId, buildAnalysisPrompt(requestData.phase1Data, requestData.phase3Data), fileId);

    // Step 5: Run the assistant and wait for completion
    console.log('🏃 Running assistant...');
    const response = await runAssistantAndWait(threadId, assistantId);
    console.log('✅ Assistant run completed');

    // Step 6: Parse the analysis from the response
    const analysis = parseAnalysisResponse(response);

    // Step 7: Save results to Firestore (including threadId for future chat)
    const result: AnalysisResult = {
      applicantId: requestData.applicantId,
      status: 'completed',
      analysis,
      threadId,  // Store for continuing conversation later
      deckIncluded: !!requestData.deckUrl,
      generatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'aiAnalyses', requestData.applicantId), result);
    console.log('✅ Analysis saved successfully with threadId for future chat');

    return new Response(JSON.stringify({ success: true, threadId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Analysis failed:', error);

    try {
      if (requestData?.applicantId) {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');

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

        const errorResult: AnalysisResult = {
          applicantId: requestData.applicantId,
          status: 'failed',
          error: error.message,
          deckIncluded: false,
          generatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'aiAnalyses', requestData.applicantId), errorResult);
      }
    } catch (saveError) {
      console.error('Failed to save error:', saveError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Get existing assistant or create one
async function getOrCreateAssistant(): Promise<string> {
  // Check if we have a stored assistant ID
  if (process.env.OPENAI_ASSISTANT_ID) {
    return process.env.OPENAI_ASSISTANT_ID;
  }

  // Create a new assistant
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      name: 'Vetted Application Analyst',
      instructions: ASSISTANT_INSTRUCTIONS,
      model: 'gpt-4.1',
      tools: [{ type: 'file_search' }]  // Enable file search for PDF analysis
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create assistant: ${error}`);
  }

  const assistant = await response.json();
  console.log('📝 Created new assistant. Add this to your env: OPENAI_ASSISTANT_ID=' + assistant.id);
  return assistant.id;
}

// Upload PDF from URL to OpenAI
async function uploadPdfFromUrl(url: string): Promise<string> {
  // Fetch the PDF
  const pdfResponse = await fetch(url);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF from ${url}`);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

  // Create form data for upload
  const formData = new FormData();
  formData.append('file', pdfBlob, 'pitch-deck.pdf');
  formData.append('purpose', 'assistants');

  // Upload to OpenAI
  const uploadResponse = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload PDF: ${error}`);
  }

  const file = await uploadResponse.json();
  return file.id;
}

// Create a new thread
async function createThread(): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create thread: ${error}`);
  }

  const thread = await response.json();
  return thread.id;
}

// Add a message to a thread
async function addMessage(threadId: string, content: string, fileId?: string): Promise<void> {
  const body: any = {
    role: 'user',
    content,
  };

  // Attach file if provided
  if (fileId) {
    body.attachments = [
      {
        file_id: fileId,
        tools: [{ type: 'file_search' }]
      }
    ];
  }

  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add message: ${error}`);
  }
}

// Run the assistant and wait for completion
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

  // Poll for completion (max 5 minutes)
  const maxAttempts = 60;
  const pollInterval = 5000; // 5 seconds

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

  throw new Error('Run timed out after 5 minutes');
}

// Build the analysis prompt
function buildAnalysisPrompt(phase1Data: any, phase3Data: any): string {
  return `Analyze this startup application and provide a structured assessment.

PHASE 1 APPLICATION DATA:
${JSON.stringify(phase1Data, null, 2)}

PHASE 3 IN-DEPTH APPLICATION DATA:
${JSON.stringify(phase3Data, null, 2)}

${phase1Data.deckUrl || phase3Data.deckUrl ? 'A pitch deck PDF has been attached for your review.' : 'No pitch deck was provided.'}

Generate a comprehensive analysis with the following structure:

1. MARKET SIZING & CONTEXT
- Market Category: Identify the primary industry/sector
- Hypothesized TAM: Provide qualitative assessment and both bottom-up and top-down estimates

2. COMPETITIVE LANDSCAPE
- Direct Competitors: 3 startups with similar solutions
- Legacy Competitors: 3 established companies solving similar problems
- Differentiator Analysis: How this startup differentiates

3. OVERALL READINESS SUMMARY
- Investment Thesis: 1-2 sentence high-level assessment

Return ONLY a valid JSON object with this exact structure:
{
  "marketSizing": {
    "category": "string",
    "tam": {
      "qualitative": "string",
      "bottomUp": "string",
      "topDown": "string"
    }
  },
  "competitiveLandscape": {
    "directCompetitors": [
      {"name": "string", "description": "string"},
      {"name": "string", "description": "string"},
      {"name": "string", "description": "string"}
    ],
    "legacyCompetitors": [
      {"name": "string", "description": "string"},
      {"name": "string", "description": "string"},
      {"name": "string", "description": "string"}
    ],
    "differentiatorAnalysis": "string"
  },
  "readinessSummary": {
    "investmentThesis": "string"
  }
}`;
}

// Parse the analysis response
function parseAnalysisResponse(response: string): any {
  // Remove markdown code blocks if present
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    throw new Error(`Failed to parse AI response: ${cleaned}`);
  }
}
