export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { mensagens } = req.body;
  
  if (!mensagens || mensagens.length === 0) {
    return res.status(400).json({ erro: "Nenhuma mensagem enviada." });
  }

  const ultimaMensagem = mensagens[mensagens.length - 1].content;

  try {
    // Simula o tempo de "pensamento" e digitação da I.A. (1.5 segundos)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Lógica simples para simular uma conversa
    let respostaSimulada = "";
    const textoMinusculo = ultimaMensagem.toLowerCase();

    if (textoMinusculo.includes("oi") || textoMinusculo.includes("olá")) {
        respostaSimulada = "Olá! Eu sou o seu clone da Tess. Como posso te ajudar hoje?";
    } else if (textoMinusculo.includes("tudo bem")) {
        respostaSimulada = "Tudo ótimo por aqui! Minha interface está funcionando perfeitamente.";
    } else {
        respostaSimulada = `Você digitou: "${ultimaMensagem}".\n\nComo estamos no modo Clone (sem o agente real conectado), eu ainda não tenho inteligência para responder a isso, mas o seu sistema de envio e recebimento está nota 10!`;
    }

    // Devolve a resposta simulada para o seu HTML
    res.status(200).json({ 
      resposta: respostaSimulada 
    });
    
  } catch (erro) {
    console.error("Erro interno:", erro);
    res.status(500).json({ erro: "Erro interno no servidor simulado." });
  }
}
