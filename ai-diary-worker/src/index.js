export default {
  async fetch(request, env) {

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const MODEL_NAME = "gemini-2.0-flash";
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${env.GEMINI_API_KEY}`;

      let geminiBody;

      if (body.type === 'audio') {
        // Llamada con audio en base64
        geminiBody = body.payload;
      } else {
        // Llamada de texto normal
        geminiBody = {
          contents: [{ parts: [{ text: body.prompt }] }]
        };
      }

      const geminiResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      });

      const data = await geminiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';

      return new Response(JSON.stringify({ result: text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
