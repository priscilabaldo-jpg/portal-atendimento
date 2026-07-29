export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const MEU_TOKEN = "1438635|d6StNI9UXdqi8JkBBDz9IRXeHM4tgRK8ZXIXj2Vqfca23d75";

  try {
    // 1. Pega a primeira página para descobrir o total de páginas
    const res1 = await fetch(`https://api.tess.im/agents?page=1`, {
      headers: { 'Authorization': `Bearer ${MEU_TOKEN}` }
    });
    
    if (!res1.ok) throw new Error("Falha na API da Tess ao buscar a página 1");
    const dados1 = await res1.json();

    let idDoDev = null;

    // 2. Verifica se por sorte ele já está na página 1
    const achouNaPagina1 = dados1.data.find(a => a.title.toLowerCase() === "dev");
    
    if (achouNaPagina1) {
        idDoDev = achouNaPagina1.id;
    } else {
        // 3. Se não achou, dispara buscas para TODAS as outras páginas simultaneamente
        const totalPaginas = dados1.last_page;
        const promessas = [];

        for (let i = 2; i <= totalPaginas; i++) {
            promessas.push(
                fetch(`https://api.tess.im/agents?page=${i}`, {
                    headers: { 'Authorization': `Bearer ${MEU_TOKEN}` }
                }).then(r => r.json())
            );
        }

        const resultados = await Promise.all(promessas);

        // 4. Procura o "Dev" no meio de todos os resultados
        for (const pagina of resultados) {
            // Se a página retornou os dados corretamente
            if (pagina && pagina.data) {
                const encontrado = pagina.data.find(a => a.title.toLowerCase() === "dev");
                if (encontrado) {
                    idDoDev = encontrado.id;
                    break;
                }
            }
        }
    }

    // 5. Devolve o resultado direto no chat
    if (idDoDev) {
         res.status(200).json({ 
            resposta: `🎉 BINGO! Achamos a agulha no palheiro.\n\nO verdadeiro ID numérico do seu agente 'Dev' é: ${idDoDev}\n\nGuarde esse número! Agora basta voltarmos para o código da integração real e colocar: const AGENT_ID = "${idDoDev}";` 
         });
    } else {
         res.status(200).json({ 
            resposta: `🚨 Vasculhei todos os ${dados1.total} agentes, mas não achei nenhum com o nome exato "Dev". Verifique se o nome tem algum espaço extra ou caractere diferente.` 
         });
    }

  } catch (erro) {
     res.status(200).json({ resposta: `🚨 ERRO NO SERVIDOR NODE:\n${erro.message}` });
  }
}
