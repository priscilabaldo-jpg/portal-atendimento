export default async function handler(req, res) {
  // Bloqueia qualquer requisição que não seja POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;
  
  if (!mensagens || mensagens.length === 0) {
    return res.status(400).json({ erro: "Nenhuma mensagem enviada." });
  }

  // Pega a última mensagem para enviar como input
  const ultimaMensagem = mensagens[mensagens.length - 1].content;

  // ==========================================
  // CREDENCIAIS DA API DA TESS
  // ==========================================
  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";
  const AGENT_ID = "0c17aa22-da26-4709-b62b-5349b56dc01d"; // Mantivemos o ID limpo, sem o -dev

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

    // ==========================================
    // SISTEMA DE DEBUG (Tratamento de Erros)
    // ==========================================
    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      return res.status(200).json({ 
        resposta: `🔍 DEBUG DA API TESS:\nStatus: ${resposta.status}\nDetalhes: ${erroDetalhado}\n\nNota: Se o erro 404 persistir, aquele ID público realmente não serve para o Backend. Precisaremos listar os agentes via código para achar o ID verdadeiro.` 
      });
    }

    // Processamento do sucesso da requisição
    const dados = await resposta.json(); 
    const textoDaTess = dados.output || dados.response || JSON.stringify(dados);

    res.status(200).json({ 
      resposta: textoDaTess 
    });
    
  } catch (erro) {
    // Captura de falhas no servidor da Vercel
    res.status(200).json({ 
        resposta: `🚨 ERRO NO SERVIDOR NODE:\n${erro.message}` 
    });
  }
}
