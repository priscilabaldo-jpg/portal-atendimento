export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;

  try {
    // ATENÇÃO: Substitua a URL abaixo pelo endpoint oficial que consta na documentação da Tess
    const urlApiTess = "https://api.tess.com/v1/chat/completions"; 

    const resposta = await fetch(urlApiTess, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // O token seguro configurado na Vercel
        'Authorization': `Bearer ${process.env.TESS_API_TOKEN}` 
      },
      body: JSON.stringify({
        messages: mensagens
        // model: "nome-do-modelo" // Descomente e preencha se a documentação da Tess exigir
      })
    });

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      throw new Error(`Erro na API: ${resposta.status} - ${erroDetalhado}`);
    }

    const dados = await resposta.json();

    // Extrai a resposta (Verifique na doc da Tess se o caminho do JSON é exatamente esse)
    res.status(200).json({ 
      resposta: dados.choices[0].message.content 
    });
    
  } catch (erro) {
    console.error("Erro no backend:", erro.message);
    res.status(500).json({ erro: "Erro ao contatar a I.A." });
