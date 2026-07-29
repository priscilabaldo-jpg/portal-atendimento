export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  // O seu frontend envia o histórico completo de mensagens
  const { mensagens } = req.body;
  
  // Verifica se existem mensagens antes de tentar ler
  if (!mensagens || mensagens.length === 0) {
    return res.status(400).json({ erro: "Nenhuma mensagem enviada." });
  }

  // Pegamos a última mensagem digitada pelo usuário para enviar ao Agente
  const ultimaMensagem = mensagens[mensagens.length - 1].content;

  // ==========================================
  // CONFIGURAÇÕES DA API DA TESS
  // ==========================================
  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";
  const AGENT_ID = "0c17aa22-da26-4709-b62b-5349b56dc01d"; 

  // ==========================================
  // TRAVA DE SEGURANÇA CONTRA ERRO 500
  // ==========================================
  // Se você ainda não tiver o ID do agente, devolvemos uma mensagem simulada
  // para que o seu HTML funcione perfeitamente sem gerar erro na Vercel.
  if (AGENT_ID === "COLE_O_ID_DO_SEU_AGENTE_AQUI") {
    // Simulando um tempo de resposta de 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return res.status(200).json({ 
      resposta: "✅ Conexão com a Vercel 100% funcionando! O Erro 500 foi resolvido. Para me conectar à verdadeira I.A., basta colocar o seu Agent ID no arquivo chat.js." 
    });
  }

  // ==========================================
  // EXECUÇÃO REAL (Só roda quando tiver o ID)
  // ==========================================
  try {
    // Montando a URL oficial para executar o agente
    const urlApiTess = `https://api.tess.im/agents/${AGENT_ID}/execute`; 

    const resposta = await fetch(urlApiTess, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MEU_TOKEN}`,
        'x-workspace-id': WORKSPACE_ID 
      },
      body: JSON.stringify({
        input: ultimaMensagem,
        messages: mensagens 
      })
    });

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      throw new Error(`Erro na API da Tess: ${resposta.status} - ${erroDetalhado}`);
    }

    // A resposta será devolvida em formato JSON
    const dados = await resposta.json(); 

    // Extrai o texto gerado (testando as chaves mais comuns)
    const textoDaTess = dados.output || dados.response || JSON.stringify(dados);

    res.status(200).json({ 
      resposta: textoDaTess 
    });
    
  } catch (erro) {
    console.error("Falha no backend:", erro.message);
    // Devolvemos o erro exato para o frontend mostrar no console e facilitar o conserto
    res.status(500).json({ erro: erro.message });
  }
}
