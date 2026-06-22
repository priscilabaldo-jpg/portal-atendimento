import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp, increment, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
    apiKey:      "AIzaSyA6WjOoM-KCi-Yl4E5rwKbOulF8tBYEClo",
    authDomain:  "portal-atendimento-541ae.firebaseapp.com",
    projectId:   "portal-atendimento-541ae",
    storageBucket: "portal-atendimento-541ae.appspot.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

const ADMIN_EMAILS = ['priscila.baldo@leveros.com.br', 'matheus.mendes@leveros.com.br'];
let currentUser = null;

// Variáveis Globais de Dados e Controle
let logsParaExportacao = [];
let nfParaExportacao = []; 
let graficoInstancia = null; 
let saldoAtualUsuario = 0;
let produtosLojaCache = [];

// ====================================================================
// 1. UTILITÁRIOS GLOBAIS E UI BÁSICA
// ====================================================================
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
window.escapeHTML = escapeHTML;

function getInitials(name) { return name ? name.charAt(0).toUpperCase() : 'U'; }

function renderAvatar(nome, photoUrl) {
    if (photoUrl) return `<img src="${photoUrl}" alt="Avatar" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%;">`;
    return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${getInitials(nome)}</div>`;
}

const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => { 
    const mobileMenu = document.getElementById('mobileMenu') || document.querySelector('.mobile-menu');
    if (mobileMenu) mobileMenu.classList.toggle('open'); 
  });
}

// ====================================================================
// 2. LÓGICA DE BUSCA DA PÁGINA INICIAL
// ====================================================================
const buscaEl = document.getElementById('busca');
const resultadosEl = document.getElementById('resultados');

if (buscaEl && resultadosEl) {
    const dadosBusca = [
        {nome:"GLPI", categoria:"Sistema", link:"https://glpi.leveros.com.br"},
        {nome:"Uappi", categoria:"Sistema", link:"https://www.vendas.leveros.com.br/wapstore/acesso"},
        {nome:"BoxLink", categoria:"Sistema", link:"https://matriz.boxlink.com.br/home"},
        {nome:"Intergrall", categoria:"Sistema", link:"https://wwws.intergrall.com.br/callcenter/cc_login.php"},
        {nome:"Book de Atendimento N1 N2 N3", categoria:"Material", link:"materiais.html"},
        {nome:"Fluxo de Pedido não faturado", categoria:"Material", link:"materiais.html"},
        {nome:"Como consultar pedido na BoxLink", category:"Material", link:"materiais.html"},
        {nome:"Como usar a Uappi", categoria:"Material", link:"materiais.html"},
        {nome:"Consulta na FUP", categoria:"Material", link:"materiais.html"}
    ];

    buscaEl.addEventListener('keyup', function() {
        const texto = this.value.toLowerCase();
        resultadosEl.innerHTML = '';
        if (texto.length < 2) { resultadosEl.style.display = 'none'; return; }
        
        const encontrados = dadosBusca.filter(d => d.nome.toLowerCase().includes(texto));
        if (!encontrados.length) {
            resultadosEl.innerHTML = "<div class='resultado' style='opacity:0.5;font-size:12px;padding:12px 14px;'>Nenhum resultado</div>";
        } else {
            encontrados.forEach(item => {
                resultadosEl.innerHTML += `<div class="resultado"><a href="${escapeHTML(item.link)}"><strong>${escapeHTML(item.nome)}</strong><span class="res-badge">${escapeHTML(item.categoria)}</span></a></div>`;
            });
        }
        resultadosEl.style.display = 'block';
    });

    document.addEventListener('click', e => { if (!buscaEl.contains(e.target)) resultadosEl.style.display = 'none'; });
}

// ====================================================================
// 3. MOTOR DA TIMELINE: RENDERIZAR FEED E PUBLICAR
// ====================================================================
async function notificarTimePorEmail(autor, texto) {
    try {
        const templateParams = { autor_nome: autor, mensagem: texto };
        await emailjs.send('service_rc58xfn', 'template_074uqfn', templateParams);
        console.log("E-mail disparado com sucesso via EmailJS!");
    } catch(e) {
        console.error("Erro ao disparar e-mail via EmailJS:", e);
    }
}

const btnPublishPost = document.getElementById('btnPublishGlobal');
if (btnPublishPost) {
    btnPublishPost.addEventListener('click', async () => {
        const postTextEl = document.getElementById('postTextGlobal');
        const mediaUrlInput = document.getElementById('mediaUrlInputGlobal');
        const sendEmailCheckbox = document.getElementById('sendEmailCheckboxGlobal');

        const texto = postTextEl.value.trim();
        let mediaUrl = mediaUrlInput.value.trim();
        const dispararEmail = sendEmailCheckbox ? sendEmailCheckbox.checked : false;

        if (!texto && !mediaUrl) {
            alert("Escreva algo ou insira o link de um material para compartilhar com o time!");
            return;
        }

        // Conversor LH3 para imagens direto do Google Drive (Evita CSP e Cookies)
        if (mediaUrl.includes("drive.google.com")) {
            const idMatch = mediaUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || mediaUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) {
                mediaUrl = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
            }
        }

        btnPublishPost.textContent = "Publicando...";
        btnPublishPost.disabled = true;

        try {
            await addDoc(collection(db, 'timeline_posts'), {
                autorNome: currentUser.displayName || 'Colaborador',
                autorEmail: currentUser.email,
                autorFoto: currentUser.photoURL || null,
                texto: texto,
                midiaUrl: mediaUrl,
                curtidas: [],
                criadoEm: serverTimestamp()
            });

            if (dispararEmail) {
                await notificarTimePorEmail(currentUser.displayName, texto);
            }

            postTextEl.value = '';
            mediaUrlInput.value = '';
            
        } catch (error) {
            console.error("Erro ao publicar na timeline:", error);
            alert("Erro ao publicar. Verifique sua conexão.");
        } finally {
            btnPublishPost.textContent = "Publicar";
            btnPublishPost.disabled = false;
        }
    });
}

window.carregarFeed = function(isAdmin) {
    const feedList = document.getElementById('feedListGlobal');
    if (!feedList) return;

    const q = query(collection(db, 'timeline_posts'), orderBy('criadoEm', 'desc'));

    onSnapshot(q, (snap) => {
        if (snap.empty) {
            feedList.innerHTML = '<div class="avisos-vazio" style="color: white; text-align: center;">Nenhuma publicação ainda. Seja o primeiro a postar!</div>';
            return;
        }

        let html = '';
        snap.docs.forEach(docSnap => {
            try {
                const post = docSnap.data();
                const postId = docSnap.id;
                
                const autorNome = post.autorNome || post.autor || post.nome || 'Colega de Equipe';
                const autorFoto = post.autorFoto || post.foto || null;
                const textoPost = post.texto || post.mensagem || post.conteudo || '';
                const imgUrl = post.midiaUrl || post.imagemUrl || post.image || post.media || post.anexo || post.url || null;
                
                let dataPost = 'Agora';
                if (post.criadoEm && post.criadoEm.seconds) {
                    dataPost = new Date(post.criadoEm.seconds * 1000).toLocaleString('pt-BR');
                } else if (post.data) {
                    dataPost = post.data; 
                }
                
                let safeImgUrl = imgUrl ? String(imgUrl).replace(/"/g, '%22') : '';

                // Correção de renderização retroativa
                if (safeImgUrl.includes("drive.google.com") || safeImgUrl.includes("picture/3") || safeImgUrl.includes("thumbnail")) {
                    const idMatch = safeImgUrl.match(/id=([a-zA-Z0-9_-]+)/) || safeImgUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || safeImgUrl.match(/picture\/3([a-zA-Z0-9_-]+)/);
                    if (idMatch && idMatch[1]) {
                        safeImgUrl = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
                    }
                }

                const imagemHtml = safeImgUrl 
                    ? `<div class="post-media"><img src="${safeImgUrl}" alt="Imagem da publicação" loading="lazy"></div>` 
                    : '';

                html += `
                <div class="post-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                            <div style="width: 35px; height: 35px; border-radius: 50%; background: #00c8b3; color: white; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${renderAvatar(autorNome, autorFoto)}
                            </div>
                            <div>
                                <strong style="display: block; font-size: 14px;">${window.escapeHTML(autorNome)}</strong>
                                <span style="font-size: 10px; color: #aaa;">${dataPost}</span>
                            </div>
                        </div>
                        ${isAdmin ? `<button class="btn-apagar btn-apagar-post" data-id="${postId}" style="background:transparent; border:none; color:#FF6B6B; cursor:pointer;" title="Deletar Publicação">🗑️</button>` : ''}
                    </div>
                    
                    <div style="font-size: 14px; line-height: 1.5; margin-top: 8px;">
                        ${window.escapeHTML(textoPost).replace(/\n/g, '<br>')}
                    </div>
                    
                    ${imagemHtml}
                </div>`;
            } catch (err) {
                console.warn("Um post foi ignorado devido a formato incompatível:", err);
            }
        });
        
        feedList.innerHTML = html;
    });
};

// ====================================================================
// 3.5 MOTOR DO RANKING E CARROSSEL (TICKER)
// ====================================================================
window.carregarRanking = function() {
    const rankingList = document.getElementById('rankingListGlobal');
    if (!rankingList) return;

    const q = query(collection(db, 'usuarios'), orderBy('pontos', 'desc'));

    onSnapshot(q, (snap) => {
        if (snap.empty) {
            rankingList.innerHTML = '<div class="avisos-vazio" style="font-size: 10px; color: white; text-align: center;">Nenhum usuário encontrado.</div>';
            return;
        }

        let html = '';
        let posicao = 1;

        snap.docs.forEach(docSnap => {
            const user = docSnap.data();
            let classPos = posicao <= 3 ? `pos-${posicao}` : '';
            let badge = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `${posicao}º`;

            html += `
            <div class="rank-item ${classPos}">
                <div class="rank-left">
                    <span class="num">${badge}</span>
                    <span class="rank-username">${window.escapeHTML(user.nome || 'Usuário')}</span>
                </div>
                <div class="rank-right">
                    <span>${user.pontos || 0} 🪙</span>
                </div>
            </div>`;
            
            posicao++;
        });

        rankingList.innerHTML = html;
    });
};

window.carregarTickerDiario = function() {
    const tickerEl = document.getElementById('tickerContent');
    if (!tickerEl) return;

    const q = query(collection(db, 'usuarios'), orderBy('pontos', 'desc'));

    onSnapshot(q, (snap) => {
        if (snap.empty) {
            tickerEl.innerHTML = '<span class="ticker-item">🪙 Continue engajando para aparecer aqui!</span>';
            return;
        }

        let html = '';
        let count = 1;

        snap.docs.forEach(docSnap => {
            if (count > 5) return; 
            const user = docSnap.data();
            let badge = count === 1 ? '🥇' : count === 2 ? '🥈' : count === 3 ? '🥉' : '🏅';
            
            html += `<span class="ticker-item" style="margin-right: 40px;">${badge} ${window.escapeHTML(user.nome || 'Usuário')} (${user.pontos} 🪙)</span>`;
            count++;
        });

        tickerEl.innerHTML = html + html;
    });
};

// ====================================================================
// 4. MÓDULO ADMINISTRATIVO 1: AUDITORIA DE LOGS (`admin_logs.html`)
// ====================================================================
function carregarLogsAdmin(dataInicioStr = null, dataFimStr = null) {
  const container = document.getElementById('logsContainer');
  if (!container) return;
  container.innerHTML = '<div class="avisos-vazio">Buscando histórico...</div>';
  
  let restricoes = [collection(db, 'acessos')];
  if (dataInicioStr && dataFimStr) {
    const start = new Date(dataInicioStr + 'T00:00:00');
    const end = new Date(dataFimStr + 'T23:59:59');
    restricoes.push(where('dataAcesso', '>=', start));
    restricoes.push(where('dataAcesso', '<=', end));
  }
  restricoes.push(orderBy('dataAcesso', 'desc'));
  
  onSnapshot(query(...restricoes), snap => {
    const logs = snap.docs.map(d => d.data());
    logsParaExportacao = [];

    if (!logs.length) {
      container.innerHTML = '<div class="avisos-vazio">Nenhum acesso registrado neste período.</div>';
      return;
    }

    let html = `<div class="resumo-logs">Total de acessos registrados: <strong>${logs.length}</strong></div>`;
    const grupos = {};
    
    logs.forEach(log => {
      const dataLog = log.dataAcesso ? new Date(log.dataAcesso.seconds * 1000) : new Date();
      const dataFormatada = dataLog.toLocaleDateString('pt-BR');
      const horaFormatada = dataLog.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      logsParaExportacao.push({ nome: log.nome || 'Desconhecido', email: log.email || 'Sem e-mail', data: dataFormatada, hora: horaFormatada });
      if (!grupos[dataFormatada]) grupos[dataFormatada] = [];
      grupos[dataFormatada].push({ ...log, horaFormatada });
    });

    for (const data in grupos) {
      html += `
        <div class="log-group">
          <div class="log-date-header">🗓️ Data: ${data} <span style="opacity:0.5; font-size:9px; margin-left:auto;">(${grupos[data].length} acessos)</span></div>
          <div class="log-table-wrap">
            <table class="log-table">
              <thead><tr><th>Usuário</th><th>E-mail Corporativo</th><th>Horário</th></tr></thead>
              <tbody>`;
      grupos[data].forEach(item => {
        html += `<tr><td><span class="badge-user">${window.escapeHTML(item.nome)}</span></td><td>${window.escapeHTML(item.email)}</td><td><span class="badge-time">⏱️ ${item.horaFormatada}</span></td></tr>`;
      });
      html += `</tbody></table></div></div>`;
    }
    container.innerHTML = html;
  });
}

const btnFiltrarLogs = document.getElementById('btnFiltrarLogs');
if (btnFiltrarLogs) {
  btnFiltrarLogs.addEventListener('click', () => {
    const inicio = document.getElementById('dataInicioLog').value;
    const fim = document.getElementById('dataFimLog').value;
    if (!inicio || !fim) return alert("Por favor, selecione as datas corretas.");
    carregarLogsAdmin(inicio, fim);
  });
}

// ====================================================================
// 5. MÓDULO ADMINISTRATIVO 2: GESTÃO DE RECOMPENSAS E PEDIDOS LOJINHA
// ====================================================================
function carregarPedidosAdmin() {
  const lista = document.getElementById('listaPedidos');
  if (!lista) return;
  const q = query(collection(db, "pedidos_lojinha"), orderBy("dataPedido", "desc"));
  
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      lista.innerHTML = '<tr><td colspan="7" style="text-align:center; opacity:0.5;">Nenhum resgate encontrado.</td></tr>';
      return;
    }

    let html = '';
    snap.docs.forEach(docSnap => {
      const pedido = docSnap.data();
      const pedidoId = docSnap.id;
      const dataTimestamp = pedido.dataPedido ? new Date(pedido.dataPedido.seconds * 1000) : new Date();
      const dataFormatada = dataTimestamp.toLocaleDateString('pt-BR') + ' às ' + dataTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const isPendente = pedido.status === "Pendente";
      
      html += `
        <tr>
          <td>${dataFormatada}</td>
          <td><span style="font-family: monospace;">#${pedidoId.substring(0, 8).toUpperCase()}</span></td>
          <td><strong>${pedido.colaboradorNome}</strong><br><span style="font-size:10px; opacity:0.6;">${pedido.colaboradorEmail}</span></td>
          <td>${pedido.produtoNome}</td>
          <td><span style="color:#FFD700; font-weight:bold;">${pedido.valorPago} 🪙</span></td>
          <td><span class="status-badge ${isPendente ? 'status-pendente' : 'status-entregue'}">${pedido.status}</span></td>
          <td>
            ${isPendente ? `<button class="btn-entregar" data-id="${pedidoId}">Marcar Entregue</button>` : `<span style="opacity:0.5; font-size:10px;">OK ✅</span>`}
          </td>
        </tr>`;
    });
    lista.innerHTML = html;
  });
}

async function darBaixaPedido(pedidoId) {
  if (!confirm("Confirmar que o prêmio já foi entregue ao colaborador?")) return;
  try {
    await updateDoc(doc(db, "pedidos_lojinha", pedidoId), { status: "Entregue" });
  } catch(e) { console.error(e); }
}

const btnLancar = document.getElementById('btnLancar');
if (btnLancar) {
  btnLancar.onclick = async () => {
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const valorInput = parseInt(document.getElementById('pontosValor').value);
    const motivo = document.getElementById('motivo').value.trim();
    const operacao = document.getElementById('tipoOperacao').value;
    
    if (!email || !valorInput || !motivo) return alert("Preencha todos os campos!");

    try {
      const userRef = doc(db, "usuarios", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        let valorFinal = Math.abs(valorInput); 
        if (operacao === 'remover') valorFinal = -valorFinal;

        await updateDoc(userRef, { pontos: increment(valorFinal) });
        await addDoc(collection(db, "historico_pontos"), {
          adminNome: currentUser.displayName || 'Gestor Admin',
          colaborador: email,
          tipoOperacao: operacao === 'adicionar' ? 'Adição' : 'Remoção',
          valor: Math.abs(valorFinal),
          motivo: motivo,
          dataRealizada: serverTimestamp()
        });

        alert("Carteira atualizada com sucesso!");
        document.getElementById('userEmail').value = '';
        document.getElementById('pontosValor').value = '';
        document.getElementById('motivo').value = '';
      } else { alert("Colaborador não encontrado."); }
    } catch (e) { console.error(e); }
  };
}

// ====================================================================
// 5.5 CADASTRO DE NOVOS PRODUTOS NA LOJINHA 
// ====================================================================
const formNovoProduto = document.getElementById('formNovoProduto');
if (formNovoProduto) {
    formNovoProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btnSalvarProduto');
        btnSalvar.disabled = true;

        try {
            const nomeVal = document.getElementById('prodNome').value.trim();
            const descVal = document.getElementById('prodDesc').value.trim();
            const precoVal = parseInt(document.getElementById('prodPreco').value) || 0;
            const estoqueVal = parseInt(document.getElementById('prodEstoque').value) || 0;
            let linkBruto = document.getElementById('prodFoto').value.trim();
            
            if (linkBruto.includes("drive.google.com")) {
                const idMatch = linkBruto.match(/\/d\/([a-zA-Z0-9_-]+)/) || linkBruto.match(/id=([a-zA-Z0-9_-]+)/);
                if (idMatch && idMatch[1]) linkBruto = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
            }

            await addDoc(collection(db, 'produtos_loja'), {
                imagem: linkBruto || '🎁',
                nome: nomeVal,
                desc: descVal,
                preco: precoVal,
                estoque: estoqueVal,
                criadoEm: serverTimestamp()
            });

            alert("Item cadastrado com sucesso!");
            formNovoProduto.reset(); 
        } catch (error) { console.error(error); } 
        finally { btnSalvar.disabled = false; }
    });
}

// ====================================================================
// 6. MÓDULO ADMINISTRATIVO 3: ORÇAMENTO FINANÇAS (`centrodecusto.html`)
// ====================================================================
const ORCAMENTO_TEMPORADA = { "Despesa Viagem": 65000, "Folha de Pagamento": 2400000, "Impostos, Taxas e Contribuições": 670, "Infraestrutura": 45400, "Outras Despesas": 243200 };

function formatarMoeda(valor) { return "R$ " + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }

function carregarDadosOrcamento() {
  const q = query(collection(db, 'notasFiscais'));
  onSnapshot(q, (snapshot) => {
    let totalGastoMes = 0;
    snapshot.forEach((docSnap) => { totalGastoMes += parseFloat(docSnap.data().valor) || 0; });
    const cardReaMes = document.getElementById('cardRealizadoMes');
    if (cardReaMes) cardReaMes.textContent = formatarMoeda(totalGastoMes);
  });
}

const formOrcamento = document.getElementById('formOrcamento');
if (formOrcamento) {
  formOrcamento.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      let valRaw = document.getElementById('valor').value;
      let valNum = parseFloat(valRaw.replace(',', '.')) || 0;
      
      await addDoc(collection(db, 'notasFiscais'), {
        numeroNf: document.getElementById('numeroNf').value,
        descricao: document.getElementById('descricao').value,
        dataEmissao: document.getElementById('dataEmissao').value,
        categoria: document.getElementById('categoria').value,
        valor: valNum, 
        criadoEm: serverTimestamp()
      });
      formOrcamento.reset();
      alert("Lançamento salvo com sucesso!");
    } catch (error) { console.error(error); }
  });
}

// ====================================================================
// 7. VITRINE DE PRÊMIOS DA LOJINHA
// ====================================================================
function carregarVitrine() {
  const grid = document.getElementById('lojaGrid');
  if (!grid) return;
  
  onSnapshot(query(collection(db, 'produtos_loja')), (snap) => {
      produtosLojaCache = [];
      let html = '';
      snap.docs.forEach(docSnap => {
          const produto = { id: docSnap.id, ...docSnap.data() };
          produtosLojaCache.push(produto);
          const isEsgotado = produto.estoque <= 0;

          html += `
              <div class="produto-card" style="${isEsgotado ? 'opacity: 0.5;' : ''}">
                  <div class="produto-nome"><strong>${escapeHTML(produto.nome)}</strong></div>
                  <div class="produto-desc">${escapeHTML(produto.desc)}</div>
                  <div class="produto-preco">🪙 ${produto.preco}</div>
                  <button class="btn-comprar" ${isEsgotado ? 'disabled' : ''} onclick="window.realizarResgate('${produto.id}')">Resgatar</button>
              </div>`;
      });
      grid.innerHTML = html;
  });
}

// ====================================================================
// 8. DELEGAÇÃO DE EVENTOS GLOBAIS (APAGAR POSTS, AVISOS E PEDIDOS)
// ====================================================================
document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!target) return;

  if (target.classList.contains('btn-entregar')) {
    const pedidoId = target.getAttribute('data-id');
    if (pedidoId) await darBaixaPedido(pedidoId);
  }
  
  const btnApagarPost = target.closest('.btn-apagar-post');
  if (btnApagarPost) {
    const postId = btnApagarPost.getAttribute('data-id');
    if (postId && confirm("Tem certeza que deseja apagar esta publicação?")) {
        await deleteDoc(doc(db, 'timeline_posts', postId));
    }
  }

  const btnApagarAviso = target.closest('.btn-deletar-aviso');
  if (btnApagarAviso) {
    const avisoId = btnApagarAviso.getAttribute('data-id');
    if (avisoId && confirm("Apagar permanentemente?")) {
        await deleteDoc(doc(db, 'avisos', avisoId));
    }
  }
});

// ====================================================================
// 9. AUTENTICAÇÃO E CARREGAMENTO DE ESTADO
// ====================================================================
async function registrarAcesso(usuario) {
  if (sessionStorage.getItem('logRegistrado')) return; 
  try {
    await addDoc(collection(db, 'acessos'), { nome: usuario.displayName || 'Usuário', email: usuario.email, dataAcesso: serverTimestamp() });
    sessionStorage.setItem('logRegistrado', 'true');
  } catch (error) {}
}

async function sincronizarPontosDiarios(user) {
  try {
    const emailLogado = user.email.toLowerCase();
    const userRef = doc(db, "usuarios", emailLogado);
    const userSnap = await getDoc(userRef);
    const hoje = new Date().toISOString().slice(0, 10); 

    const saldoEl = document.getElementById('valSaldoGlobal');
    if (userSnap.exists()) {
        const dados = userSnap.data();
        let moedasAtuais = dados.pontos || 0;
        if (saldoEl) saldoEl.textContent = moedasAtuais;
        saldoAtualUsuario = moedasAtuais;

        if (dados.ultimoLogin !== hoje) {
            await updateDoc(userRef, { pontos: increment(10), ultimoLogin: hoje, foto: user.photoURL || null, nome: user.displayName || 'Usuário Leveros' });
            moedasAtuais += 10;
            if (saldoEl) saldoEl.textContent = moedasAtuais;
            saldoAtualUsuario = moedasAtuais;
            alert("Presença diária confirmada! Você ganhou 10 moedas corporativas! 🪙");
        }
    } else {
        await setDoc(userRef, { nome: user.displayName || 'Usuário Leveros', foto: user.photoURL || null, pontos: 50, ultimoLogin: hoje });
        if (saldoEl) saldoEl.textContent = 50;
        saldoAtualUsuario = 50;
    }
  } catch (err) { console.error(err); }
}

onAuthStateChanged(auth, async user => {
  if (user && user.email.endsWith('@leveros.com.br')) {
    currentUser = user;
    const emailLogado = user.email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLogado);

    const menuAdminContainer = document.getElementById('menuAdminContainer');
    if (menuAdminContainer) menuAdminContainer.style.display = isAdmin ? 'block' : 'none';
    
    registrarAcesso(user);
    carregarAvisos(isAdmin);
    
    if (document.getElementById('lojinha-content')) carregarVitrine();
    if (document.getElementById('logsContainer') && isAdmin) carregarLogsAdmin();
    if (document.getElementById('listaPedidos') && isAdmin) carregarPedidosAdmin(); 
    if (document.getElementById('tabelaMatriz') && isAdmin) carregarDadosOrcamento();

    if (document.getElementById('feedListGlobal')) {
      window.carregarFeed(isAdmin);
      window.carregarRanking();
      window.carregarTickerDiario();
      await sincronizarPontosDiarios(user);
    }
  } else if (user) { signOut(auth); }
});

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) { loginBtn.onclick = () => { signInWithPopup(auth, provider).catch(console.error); }; }

const logout = () => { sessionStorage.removeItem('logRegistrado'); signOut(auth); window.location.href = 'index.html'; };
const logoutBtnGlobal = document.getElementById('logoutBtnGlobal');
if (logoutBtnGlobal) logoutBtnGlobal.onclick = logout;
