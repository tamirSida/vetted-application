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
  deckIncluded: boolean;
  generatedAt: string;
}

export default async (request: Request, context: Context) => {
  console.log('🤖 AI Analysis Background Function Started');
  let requestData!: AnalysisRequest;

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    requestData = await request.json();
    console.log('📊 Processing analysis for applicant:', requestData.applicantId);

    // Initialize Firebase (client-side for now)
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

    // Generate AI Analysis (PDF is sent directly to OpenAI)
    console.log('🧠 Generating AI analysis...');
    const analysis = await generateAnalysis(
      requestData.phase1Data,
      requestData.phase3Data,
      requestData.deckUrl
    );

    // Save results to Firestore
    const result: AnalysisResult = {
      applicantId: requestData.applicantId,
      status: 'completed',
      analysis,
      deckIncluded: !!requestData.deckUrl,
      generatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'aiAnalyses', requestData.applicantId), result);
    console.log('✅ Analysis saved successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Analysis failed:', error);

    try {
      // Only save to Firestore if we have the applicantId
      if (requestData?.applicantId) {
        // Save error to Firestore
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

async function generateAnalysis(
  phase1Data: any,
  phase3Data: any,
  deckUrl?: string
): Promise<any> {
  const prompt = `You are an expert venture capital analyst. Analyze this startup application and provide a structured assessment.

CONTEXT:
Phase 1 Data: ${JSON.stringify(phase1Data, null, 2)}
Phase 3 Data: ${JSON.stringify(phase3Data, null, 2)}
${deckUrl ? 'Pitch Deck: See attached PDF file' : 'No pitch deck provided'}

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

  // Build the content array for OpenAI
  const content: any[] = [
    { type: 'input_text', text: prompt }
  ];

  // Add PDF file if URL is provided
  if (deckUrl) {
    console.log('📄 Including PDF deck in analysis:', deckUrl);
    content.push({
      type: 'input_file',
      file_url: deckUrl
    });
  }

  // Use OpenAI Responses API which supports native PDF input
  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!openaiResponse.ok) {
    const errorBody = await openaiResponse.text();
    console.error('OpenAI API error:', errorBody);
    throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`);
  }

  const result = await openaiResponse.json();
  let analysisText = result.output?.[0]?.content?.[0]?.text || result.choices?.[0]?.message?.content;

  if (!analysisText) {
    console.error('Unexpected OpenAI response structure:', JSON.stringify(result));
    throw new Error('No content in OpenAI response');
  }

  // Remove markdown code blocks if present
  analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(analysisText);
  } catch (parseError) {
    throw new Error(`Failed to parse AI response: ${analysisText}`);
  }
}