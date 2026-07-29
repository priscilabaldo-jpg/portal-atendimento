export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;

  // ==========================================
  // COLOQUE O SEU TOKEN DA TESS AQUI DENTRO
  // ==========================================
  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75"; 

  try {
    // ATENÇÃO: Substitua a URL abaixo pelo endpoint oficial que consta na doc da Tess
    const urlApiTess = "https://api.tess.com/v1/chat/completions"; 

    const resposta = await fetch(urlApiTess, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aqui o código usa a variável que você preencheu acima
        'Authorization': `Bearer ${MEU_TOKEN}` 
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

    res.status(200).json({ 
      resposta: dados.choices[0].message.content 
    });
    
  } catch (erro) {
    console.error("Erro no backend:", erro.message);
    res.status(500).json({ erro: "Erro ao contatar a I.A." });
  }
}
