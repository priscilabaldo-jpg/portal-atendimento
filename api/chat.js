// Lida com o CORS preflight (a requisição de segurança do navegador)
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*', 
      'Access-Control-Allow-Headers': 'Content-Type, x-goog-api-key',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

// Lida com a requisição real para o Gemini
export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-goog-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  try {
    const body = await request.json();
    const model = body.model || 'gemini-3.7-flash';
    
    // Remove o 'model' do body para enviar ao Google apenas o payload correto
    const { model: _, ...geminiBody } = body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // AQUI o sistema puxa a variável que você salvou no painel!
          'x-goog-api-key': env.GEMINI_API_KEY 
        },
        body: JSON.stringify(geminiBody)
      }
    );

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro de comunicação' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
