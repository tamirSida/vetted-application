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
    
    // Use pdfjs-dist directly for better serverless compatibility
    console.log('📄 Importing pdfjs-dist...');
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use the default export which should contain getDocument
    const pdfjs = pdfjsLib.default || pdfjsLib;
    console.log('📄 Default export methods:', Object.keys(pdfjs));
    
    // Configure worker for serverless environment
    if (pdfjs.GlobalWorkerOptions) {
      // Try to use the local worker file
      try {
        const path = await import('path');
        const workerPath = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.js');
        pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
        console.log('📄 Set worker path to:', workerPath);
      } catch (error) {
        console.log('📄 Failed to set local worker, trying to disable worker...');
        // As last resort, try to disable worker completely
        pdfjs.GlobalWorkerOptions.workerSrc = false;
      }
    }
    
    console.log('📄 Loading PDF document...');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      disableFontFace: true
    });
    
    const pdf = await loadingTask.promise;
    console.log('📄 PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`📄 Extracting text from page ${pageNum}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    console.log('📄 PDF parsed successfully, text length:', fullText.length);
    return fullText.trim();
    
  } catch (error) {
    console.error('📄 PDF parsing failed:', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}