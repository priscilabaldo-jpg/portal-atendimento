export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;
  
  // Verifica se o frontend enviou as mensagens corretamente
  if (!mensagens || mensagens.length === 0) {
    return res.status(400).json({ erro: "Nenhuma mensagem enviada." });
  }

  // Pega a última mensagem digitada pelo usuário
  const ultimaMensagem = mensagens[mensagens.length - 1].content;

  // ==========================================
  // CONFIGURAÇÕES DA API DA TESS
  // ==========================================
  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";
  const AGENT_ID = "0c17aa22-da26-4709-b62b-5349b56dc01d-dev"; 

  try {
    // URL de execução do agente
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

    // ==========================================
    // MODO DEBUG ATIVADO
    // Em vez de gerar Erro 500, manda o erro da API para o chat
    // ==========================================
    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      return res.status(200).json({ 
        resposta: `🔍 DEBUG DA API TESS:\nA Tess recusou a requisição.\nStatus: ${resposta.status}\nDetalhes: ${erroDetalhado}\n\nCopie esse erro para podermos ajustar a estrutura!` 
      });
    }

    // Se a requisição der certo, extrai a resposta
    const dados = await resposta.json(); 
    
    // Tenta encontrar a resposta nas chaves mais prováveis da Tess
    const textoDaTess = dados.output || dados.response || JSON.stringify(dados);

    res.status(200).json({ 
      resposta: textoDaTess 
    });
    
  } catch (erro) {
    // Se o código Node.js quebrar antes mesmo de enviar a requisição, também avisa no chat
    res.status(200).json({ 
        resposta: `🚨 ERRO NO SERVIDOR NODE:\n${erro.message}` 
    });
  }
}
