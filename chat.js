export default async function handler(req, res) {
  // Libera o CORS para a própria Vercel
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Puxa a chave de API das variáveis de ambiente da Vercel
  const apiKey = process.env.GEMINI_API_KEY;
  const { model = 'gemini-3.7-flash', ...body } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro de comunicação com a IA' });
  }
}
