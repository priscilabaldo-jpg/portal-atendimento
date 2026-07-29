export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;
  const ultimaMensagem = mensagens[mensagens.length - 1].content;

  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";
  const AGENT_ID = "45"; 

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
        messages: mensagens,
        // Preenchendo os campos obrigatórios que a API exigiu:
        "nome-da-empresa": "Assistente Virtual",
        "descrio": ultimaMensagem, // Usa a pergunta do usuário como descrição
        "diferenciais": "Atendimento rápido e automatizado",
        "call-to-action": "Confira"
      })
    });

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      return res.status(200).json({ 
        resposta: `🔍 ERRO NA API (ID ${AGENT_ID}):\nStatus: ${resposta.status}\nDetalhes: ${erroDetalhado}` 
      });
    }

    const dados = await resposta.json(); 
    
    // Varre as chaves comuns onde a resposta da I.A. costuma vir guardada
    const textoDaTess = dados.output || dados.response || dados.result || JSON.stringify(dados);

    res.status(200).json({ resposta: textoDaTess });
    
  } catch (erro) {
    res.status(200).json({ resposta: `🚨 ERRO NO SERVIDOR NODE:\n${erro.message}` });
  }
}
