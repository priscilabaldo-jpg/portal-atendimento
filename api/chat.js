export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  // ==========================================
  // CREDENCIAIS DA API DA TESS
  // ==========================================
  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";

  try {
    // Trocamos o endpoint para listar os agentes em vez de executar
    const urlApiTess = `https://api.tess.im/agents`; 

    const resposta = await fetch(urlApiTess, {
      method: 'GET', // Mudamos para GET
      headers: {
        'Authorization': `Bearer ${MEU_TOKEN}`
      }
    });

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      return res.status(200).json({ 
        resposta: `🔍 ERRO AO LISTAR: Status: ${resposta.status}\nDetalhes: ${erroDetalhado}` 
      });
    }

    const dados = await resposta.json(); 
    
    // Transforma o resultado (JSON) em texto para lermos na tela do chat
    const textoDaLista = JSON.stringify(dados, null, 2);

    res.status(200).json({ 
      resposta: `🕵️ LISTA DE AGENTES ENCONTRADOS:\n\n${textoDaLista}` 
    });
    
  } catch (erro) {
    res.status(200).json({ 
        resposta: `🚨 ERRO NO SERVIDOR NODE:\n${erro.message}` 
    });
  }
}
