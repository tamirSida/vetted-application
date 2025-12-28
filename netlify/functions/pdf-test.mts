import { Context } from "@netlify/functions";

interface TestRequest {
  pdfUrl: string;
}

export default async (request: Request, context: Context) => {
  console.log('📄 PDF Test Function Started');
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestData: TestRequest = await request.json();
    console.log('Testing PDF URL:', requestData.pdfUrl);

    // Test PDF parsing
    const text = await parsePDF(requestData.pdfUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      text: text,
      length: text.length,
      wordCount: text.trim().split(/\s+/).length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ PDF Test failed:', error);

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function parsePDF(url: string): Promise<string> {
  console.log('📄 Starting PDF parse for URL:', url);

  try {
    // Fetch the PDF
    console.log('📄 Fetching PDF...');
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('📄 PDF downloaded, size:', arrayBuffer.byteLength, 'bytes');

    const buffer = Buffer.from(arrayBuffer);

    // Use pdf-parse which is designed for Node.js/serverless environments
    console.log('📄 Importing pdf-parse...');
    // @ts-ignore - no type declarations
    const pdfParse = (await import('pdf-parse')).default;
    console.log('📄 pdf-parse loaded successfully');

    console.log('📄 Parsing PDF...');
    const data = await pdfParse(buffer);

    console.log('📄 PDF parsed successfully, pages:', data.numpages, 'text length:', data.text.length);
    return data.text.trim();

  } catch (error: any) {
    console.error('📄 PDF parsing failed:', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}