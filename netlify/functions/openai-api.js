const https = require('https');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    
    // Validate required fields
    if (!requestBody.model || !requestBody.input) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ error: 'Missing required fields: model and input' })
      };
    }

    // Get OpenAI API key from environment variable
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    // Prepare OpenAI API request for Responses API
    const openaiRequest = {
      model: requestBody.model,
      input: requestBody.input,
      reasoning: requestBody.reasoning || { effort: 'low' },
      text: requestBody.text || { verbosity: 'medium' },
      max_output_tokens: requestBody.max_output_tokens || 500,
      tools: requestBody.tools,
      tool_choice: requestBody.tool_choice
    };

    // Make request to OpenAI API
    const response = await callOpenAI(openaiRequest, openaiApiKey);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

// Helper function to call OpenAI API
function callOpenAI(requestBody, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`OpenAI API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse OpenAI response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    // Set timeout
    req.setTimeout(30000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    // Write data to request body
    req.write(postData);
    req.end();
  });
}