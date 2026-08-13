document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("perguntaAssistente");
  const botao = document.getElementById("btnPerguntarAssistente");
  const status = document.getElementById("statusAssistente");
  const respostaBox = document.getElementById("respostaAssistente");
  const textoResposta = document.getElementById("textoRespostaAssistente");

  if (!botao) return; // seção não existe nesta página

  async function perguntar() {
    const pergunta = input.value.trim();
    if (!pergunta) return;

    botao.disabled = true;
    status.textContent = "Consultando a base de conhecimento...";
    respostaBox.style.display = "none";

    try {
      const resp = await fetch("/api/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: [{ role: "user", content: pergunta }],
        }),
      });

      if (!resp.ok) throw new Error("Erro " + resp.status);

      const dados = await resp.json();

      status.textContent = "";
      textoResposta.innerHTML = (dados.resposta || "Sem resposta.").replace(/\n/g, "<br>");
      respostaBox.style.display = "block";
    } catch (erro) {
      status.textContent = "Não foi possível consultar o assistente agora. Tente novamente.";
      console.error(erro);
    } finally {
      botao.disabled = false;
    }
  }

  botao.addEventListener("click", perguntar);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") perguntar();
  });
});

