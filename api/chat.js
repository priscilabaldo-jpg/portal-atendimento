export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;
  const ultimaMensagem = mensagens[mensagens.length - 1].content;

  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";
  
  // Vamos testar o ID numérico 1 (ou você pode trocar para outro número como 2, 3, etc.)
  const AGENT_ID = "1"; 

  try {
    const urlApiTess = `https://api.tess.im/agents/${AGENT_ID}/execute`; 

    const resposta = await fetch(urlApiTess, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MEU_TOKEN}`
      },
      body: JSON.stringify({
        input: ultimaMensagem,
        messages: mensagens 
      })
    });

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      return res.status(200).json({ 
        resposta: `🔍 TESTE COM ID ${AGENT_ID}:\nStatus: ${resposta.status}\nDetalhes: ${erroDetalhado}` 
      });
    }

    const dados = await resposta.json(); 
    const textoDaTess = dados.output || dados.response || JSON.stringify(dados);

    res.status(200).json({ resposta: textoDaTess });
    
  } catch (erro) {
    res.status(200).json({ resposta: `🚨 ERRO: ${erro.message}` });
  }
}
