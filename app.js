import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp, arrayUnion, arrayRemove, increment, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:      "AIzaSyA6WjOoM-KCi-Yl4E5rwKbOulF8tBYEClo",
  authDomain:  "portal-atendimento-541ae.firebaseapp.com",
  projectId:   "portal-atendimento-541ae"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const ADMIN_EMAILS = ['priscila.baldo@leveros.com.br', 'matheus.mendes@leveros.com.br'];
let currentUser = null;

// Variável de controle para exportação de auditoria
let logsParaExportacao = [];

// ====================================================================
// 1. UTILITÁRIOS GLOBAIS E UI BÁSICA
// ====================================================================
const anoAtualEl = document.getElementById('anoAtual');
if (anoAtualEl) anoAtualEl.textContent = new Date().getFullYear();

const welcomeDateEl = document.getElementById('welcomeDate');
if (welcomeDateEl) {
  const dias  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const agora = new Date();
  welcomeDateEl.textContent = `${dias[agora.getDay()]}, ${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;
}

const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => { 
    const mobileMenu = document.getElementById('mobileMenu') || document.querySelector('.mobile-menu');
    if (mobileMenu) mobileMenu.classList.toggle('open'); 
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
window.escapeHTML = escapeHTML;

function getInitials(name) { return name ? name.charAt(0).toUpperCase() : 'U'; }

function renderAvatar(nome, photoUrl) {
  if (photoUrl) return `<img src="${photoUrl}" alt="Avatar" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
  return getInitials(nome);
}

function formatNameFromEmail(email) {
  if (!email) return '';
  return email.split('@')[0].split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

// ====================================================================
// 2. LÓGICA DA PÁGINA INICIAL E BUSCA
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

const EMOJIS = { urgente:'🚨', informativo:'📋', treinamento:'📚', geral:'📌' };

function renderAvisos(avisos, isAdmin) {
  const lista = document.getElementById('avisosLista');
  if (!lista) return;
  if (!avisos.length) { lista.innerHTML = '<div class="avisos-vazio">Nenhum aviso publicado.</div>'; return; }
  
  lista.innerHTML = avisos.map(a => {
    const data = a.criadoEm ? new Date(a.criadoEm.seconds * 1000).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
    const catSafe = escapeHTML(a.categoria || 'geral');
    return `
      <div class="aviso-card ${catSafe}">
        <div class="aviso-body">
          <div class="aviso-meta">
            <span class="aviso-badge ${catSafe}">${EMOJIS[a.categoria] || '📌'} ${catSafe}</span>
            <span class="aviso-autor">${escapeHTML(a.autor || '')}</span>
            <span class="aviso-data">${escapeHTML(data)}</span>
          </div>
          <div class="aviso-texto">${escapeHTML(a.texto || '')}</div>
        </div>
        ${isAdmin ? `<button class="btn-apagar btn-deletar-aviso" data-id="${escapeHTML(a.id || '')}" title="Apagar aviso">✕</button>` : ''}
      </div>`;
  }).join('');
}

function carregarAvisos(isAdmin) {
  if (!document.getElementById('avisosLista')) return;
  const q = query(collection(db, 'avisos'), orderBy('criadoEm', 'desc'));
  onSnapshot(q, snap => renderAvisos(snap.docs.map(d => ({ id: d.id, ...d.data() })), isAdmin));
}

// ====================================================================
// 3. LÓGICA DA TIMELINE E MOEDAS
// ====================================================================
function carregarTickerDiario() {
  const tickerContainer = document.getElementById('tickerContent');
  if (!tickerContainer) return;

  const hoje = new Date().toISOString().slice(0, 10);
  const q = query(collection(db, 'usuarios'), where('ultimoLogin', '==', hoje));

  onSnapshot(q, snap => {
    if (snap.empty) {
      tickerContainer.innerHTML = '<span class="ticker-item">🪙 Ninguém resgatou as moedas de hoje ainda. Seja o primeiro!</span>';
      return;
    }
    let itensHtml = '';
    snap.docs.forEach(docSnap => {
      const user = docSnap.data();
      const primeiroNome = user.nome ? user.nome.split(' ')[0] : 'Alguém';
      itensHtml += `<span class="ticker-item">🪙 <strong>${escapeHTML(primeiroNome)}</strong> acabou de resgatar as moedas diárias!</span>`;
    });
    tickerContainer.innerHTML = itensHtml + itensHtml + itensHtml;
  });
}

function carregarRanking() {
  const list = document.getElementById('rankingList');
  if (!list) return;

  const q = query(collection(db, 'usuarios'), orderBy('pontos', 'desc'));
  onSnapshot(q, snap => {
    if (snap.empty) {
      list.innerHTML = '<div class="avisos-vazio" style="font-size: 10px;">Nenhum dado encontrado.</div>';
      return;
    }
    let html = '';
    let posicao = 1;
    
    snap.docs.forEach(docSnap => {
      const user = docSnap.data();
      let nomePuro = user.nome || 'Usuário';
      let partesNome = nomePuro.split(' ');
      let nomeCurto = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[1]}` : nomePuro;
      if(nomeCurto.length > 18) nomeCurto = nomeCurto.substring(0, 18) + '...';
      
      let iconPos = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `${posicao}º`;
      html += `
        <div class="rank-item pos-${posicao}">
          <div class="rank-info">
            <span class="rank-pos">${iconPos}</span>
            <span class="rank-nome" title="${escapeHTML(nomePuro)}">${escapeHTML(nomeCurto)}</span>
          </div>
          <span class="rank-moedas">${user.pontos || 0} 🪙</span>
        </div>`;
      posicao++;
    });
    list.innerHTML = html;
  });
}

function carregarFeed(isAdmin) {
  const feedList = document.getElementById('feedList');
  if (!feedList) return;

  const q = query(collection(db, 'timeline_posts'), orderBy('criadoEm', 'desc'));
  onSnapshot(q, snap => {
    if (snap.empty) {
      feedList.innerHTML = '<div class="avisos-vazio">Nenhuma publicação ainda. Seja o primeiro!</div>';
      return;
    }
    let html = '';
    snap.docs.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;
      const dataFormatada = post.criadoEm ? new Date(post.criadoEm.seconds * 1000).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Agora';
      const likes = post.likes || [];
      const isLiked = currentUser && likes.includes(currentUser.email);
      const heartIcon = isLiked ? '❤️' : '🤍';
      const likeClass = isLiked ? 'liked' : '';
      
      const comentarios = post.comentarios || [];
      let commentsHtml = '';
      comentarios.forEach(c => {
        const podeApagar = (currentUser && c.email && currentUser.email.toLowerCase() === c.email.toLowerCase()) || isAdmin;
        const commentDataString = encodeURIComponent(JSON.stringify(c));
        commentsHtml += `
          <div class="comment-item" style="position: relative; align-items: flex-start;">
            <div class="user-avatar" style="overflow: hidden; flex-shrink: 0;">${renderAvatar(c.autor, c.foto)}</div>
            <div class="comment-bubble" style="position: relative; padding-right: 30px;">
              <strong>${escapeHTML(c.autor)}</strong>
              ${escapeHTML(c.texto)}
              ${podeApagar ? `<button class="btn-deletar-comentario" data-post="${postId}" data-comment="${commentDataString}" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: rgba(255,255,255,0.3); font-size: 10px; cursor: pointer;">✕</button>` : ''}
            </div>
          </div>`;
      });

      const mediaHtml = post.midiaUrl ? `<div class="post-media"><img src="${escapeHTML(post.midiaUrl)}" alt="Imagem do post" onerror="this.style.display='none'"></div>` : '';

      html += `
        <div class="post-card" style="position: relative;">
          ${isAdmin ? `<button class="btn-deletar-post" data-id="${postId}" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #FF6B6B; font-size: 16px; cursor: pointer; z-index: 10; font-weight: bold;" title="Apagar Publicação">✕</button>` : ''}
          <div class="post-header">
            <div class="user-avatar" style="overflow: hidden;">${renderAvatar(post.autor, post.autorFoto)}</div>
            <div class="post-author-info">
              <h4>${escapeHTML(post.autor)}</h4>
              <span>${dataFormatada}</span>
            </div>
          </div>
          <div class="post-text">${escapeHTML(post.texto)}</div>
          ${mediaHtml}
          <div class="post-actions">
            <button class="action-btn btn-like-post ${likeClass}" data-id="${postId}">
              ${heartIcon} Curtir (${likes.length})
            </button>
            <button class="action-btn" onclick="document.getElementById('comment-${postId}').focus()">
              💬 Comentar (${comentarios.length})
            </button>
          </div>
          <div class="comments-list">${commentsHtml}</div>
          <div class="comment-input-wrap">
            <input type="text" id="comment-${postId}" class="input-comentario" data-id="${postId}" placeholder="Escreva um comentário...">
            <button class="btn-send btn-send-comment" data-id="${postId}">➤</button>
          </div>
        </div>`;
    });
    feedList.innerHTML = html;
  });
}

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

    let html = `<div class="resumo-logs">Total de acessos encontrados: <strong>${logs.length}</strong></div>`;
    const grupos = {};
    
    logs.forEach(log => {
      const dataLog = log.dataAcesso ? new Date(log.dataAcesso.seconds * 1000) : new Date();
      const dataFormatada = dataLog.toLocaleDateString('pt-BR');
      const horaFormatada = dataLog.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      logsParaExportacao.push({
        nome: log.nome || 'Desconhecido',
        email: log.email || 'Sem e-mail',
        data: dataFormatada,
        hora: horaFormatada
      });

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
              <tbody>
      `;
      grupos[data].forEach(item => {
        html += `<tr><td><span class="badge-user">${window.escapeHTML(item.nome)}</span></td><td>${window.escapeHTML(item.email)}</td><td><span class="badge-time">⏱️ ${item.horaFormatada}</span></td></tr>`;
      });
      html += `</tbody></table></div></div>`;
    }
    container.innerHTML = html;
  }, error => {
    container.innerHTML = '<div class="avisos-vazio" style="color:#FF6B6B;">Erro ao buscar dados. Tente limpar os filtros.</div>';
  });
}

// Configuração dos gatilhos de Log
const btnFiltrarLogs = document.getElementById('btnFiltrarLogs');
if (btnFiltrarLogs) {
  btnFiltrarLogs.addEventListener('click', () => {
    const inicio = document.getElementById('dataInicioLog').value;
    const fim = document.getElementById('dataFimLog').value;
    if (!inicio || !fim) return alert("Por favor, selecione a data de início e a data de fim.");
    if (inicio > fim) return alert("A data de início não pode ser maior que a data de fim.");
    carregarLogsAdmin(inicio, fim);
  });
}

const btnLimparLogs = document.getElementById('btnLimparLogs');
if (btnLimparLogs) {
  btnLimparLogs.addEventListener('click', () => {
    document.getElementById('dataInicioLog').value = '';
    document.getElementById('dataFimLog').value = '';
    carregarLogsAdmin();
  });
}

const btnExportarLogs = document.getElementById('btnExportarLogs');
if (btnExportarLogs) {
  btnExportarLogs.addEventListener('click', () => {
    if (logsParaExportacao.length === 0) {
      alert('Nenhum dado na tela para exportar. Tente carregar ou filtrar os logs primeiro.');
      return;
    }
    let csvContent = '\uFEFF'; 
    csvContent += "Nome;E-mail;Data de Acesso;Hora de Acesso\n";
    logsParaExportacao.forEach(log => {
      csvContent += `${log.nome};${log.email};${log.data};${log.hora}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkInvisivel = document.createElement("a");
    linkInvisivel.href = url;
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    linkInvisivel.download = `Relatorio_Acessos_${hoje}.csv`;
    document.body.appendChild(linkInvisivel);
    linkInvisivel.click();
    document.body.removeChild(linkInvisivel);
  });
}

// ====================================================================
// 5. MÓDULO ADMINISTRATIVO 2: GESTÃO DE RECOMPENSAS (`admin_pontos.html`)
// ====================================================================
function carregarPedidos() {
  const lista = document.getElementById('listaPedidos');
  if (!lista) return;
  const q = query(collection(db, "pedidos_lojinha"), orderBy("dataPedido", "desc"));
  
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      lista.innerHTML = '<tr><td colspan="7" style="text-align:center; opacity:0.5;">Nenhum pedido de resgate encontrado.</td></tr>';
      return;
    }

    let html = '';
    snap.docs.forEach(docSnap => {
      const pedido = docSnap.data();
      const pedidoId = docSnap.id;
      const dataTimestamp = pedido.dataPedido ? new Date(pedido.dataPedido.seconds * 1000) : new Date();
      const dataFormatada = dataTimestamp.toLocaleDateString('pt-BR') + ' às ' + dataTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const idFormatado = '#' + pedidoId.substring(0, 8).toUpperCase();
      const isPendente = pedido.status === "Pendente";
      const statusClass = isPendente ? "status-pendente" : "status-entregue";
      
      html += `
        <tr>
          <td>${dataFormatada}</td>
          <td><span style="font-family: monospace; font-size: 11px; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 4px 6px; border-radius: 4px;">${idFormatado}</span></td>
          <td><strong>${pedido.colaboradorNome}</strong><br><span style="font-size:10px; opacity:0.6;">${pedido.colaboradorEmail}</span></td>
          <td>${pedido.produtoNome}</td>
          <td><span style="color:#FFD700; font-weight:bold;">${pedido.valorPago} 🪙</span></td>
          <td><span class="status-badge ${statusClass}">${pedido.status}</span></td>
          <td>
            ${isPendente ? `<button class="btn-entregar" data-id="${pedidoId}">Marcar Entregue</button>` : `<span style="opacity:0.5; font-size:10px;">OK ✅</span>`}
          </td>
        </tr>
      `;
    });
    lista.innerHTML = html;
  });
}

// Função global para dar baixa no pedido associada ao listener interno
async function darBaixaPedido(pedidoId) {
  if (!confirm("Confirmar que o prêmio já foi entregue ao colaborador?")) return;
  try {
    await updateDoc(doc(db, "pedidos_lojinha", pedidoId), { status: "Entregue" });
  } catch(e) {
    console.error("Erro ao atualizar status:", e);
    alert("Erro ao tentar atualizar o status do pedido.");
  }
}
window.marcarEntregue = darBaixaPedido; // Preserva compatibilidade se necessário

// Ouvinte do formulário de moedas manual
const btnLancar = document.getElementById('btnLancar');
if (btnLancar) {
  btnLancar.onclick = async () => {
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const valorInput = parseInt(document.getElementById('pontosValor').value);
    const motivo = document.getElementById('motivo').value.trim();
    const operacao = document.getElementById('tipoOperacao').value;
    
    if (!email || !valorInput || !motivo) return alert("Preencha todos os campos!");
    if (valorInput <= 0) return alert("O valor das moedas deve ser maior que zero!");

    btnLancar.textContent = 'Processando...';
    btnLancar.disabled = true;

    try {
      const userRef = doc(db, "usuarios", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const dadosAtuais = userSnap.data();
        const saldoAtual = dadosAtuais.pontos || 0;
        let valorFinal = Math.abs(valorInput); 
        let tipoString = "Adição";
        
        if (operacao === 'remover') {
          if (saldoAtual < valorFinal) {
            alert(`Operação Cancelada: O colaborador tem apenas ${saldoAtual} moedas. Não é possível deduzir ${valorFinal}.`);
            btnLancar.innerHTML = '✅ Confirmar Operação';
            btnLancar.disabled = false;
            return;
          }
          valorFinal = -valorFinal; 
          tipoString = "Remoção";
        }

        await updateDoc(userRef, { pontos: increment(valorFinal) });
        
        await addDoc(collection(db, "historico_pontos"), {
          adminNome: currentUser.displayName || 'Gestor Admin',
          colaborador: email,
          tipoOperacao: tipoString,
          valor: Math.abs(valorFinal),
          motivo: motivo,
          dataRealizada: serverTimestamp()
        });

        const textoAcao = operacao === 'adicionar' ? 'enviadas para' : 'removidas de';
        alert(`Sucesso! ${Math.abs(valorFinal)} moedas foram ${textoAcao} ${email}.`);
        
        document.getElementById('userEmail').value = '';
        document.getElementById('pontosValor').value = '';
        document.getElementById('motivo').value = '';
      } else {
        alert("Usuário não encontrado. Peça para o colaborador acessar o portal pelo menos uma vez para ativar a carteira!");
      }
    } catch (e) {
      console.error(e);
      alert("Ocorreu um erro ao processar os pontos.");
    } finally {
      btnLancar.innerHTML = '✅ Confirmar Operação';
      btnLancar.disabled = false;
    }
  };
}

// Ouvinte para exportar relatório da lojinha
const btnExportar = document.getElementById('btnExportar');
if (btnExportar) {
  btnExportar.onclick = async () => {
    const dataInicioStr = document.getElementById('relatorioInicio').value;
    const dataFimStr = document.getElementById('relatorioFim').value;

    if (!dataInicioStr || !dataFimStr) return alert("Por favor, selecione as datas de início e fim.");
    if (dataInicioStr > dataFimStr) return alert("A data inicial não pode ser maior que a final.");

    btnExportar.textContent = 'Buscando dados...';
    btnExportar.disabled = true;

    try {
      const start = new Date(dataInicioStr + 'T00:00:00');
      const end = new Date(dataFimStr + 'T23:59:59');

      const q = query(
        collection(db, "historico_pontos"),
        where('dataRealizada', '>=', start),
        where('dataRealizada', '<=', end),
        orderBy('dataRealizada', 'desc')
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("Nenhuma transação encontrada nesse período.");
        return;
      }

      let csvContent = '\uFEFF'; 
      csvContent += "Data da Transação;Horário;Administrador;Colaborador;Operação;Quantidade;Motivo;ID Transacao\n";

      querySnapshot.forEach((docSnap) => {
        const row = docSnap.data();
        const idFormatado = '#' + docSnap.id.substring(0, 8).toUpperCase();
        const dataTimestamp = row.dataRealizada ? new Date(row.dataRealizada.seconds * 1000) : new Date();
        const dataFormatada = dataTimestamp.toLocaleDateString('pt-BR');
        const horaFormatada = dataTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        csvContent += `${dataFormatada};${horaFormatada};${row.adminNome};${row.colaborador};${row.tipoOperacao};${row.valor};${row.motivo};${idFormatado}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const linkInvisivel = document.createElement("a");
      linkInvisivel.href = url;
      const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      linkInvisivel.download = `Relatorio_Lojinha_${hoje}.csv`;
      document.body.appendChild(linkInvisivel);
      linkInvisivel.click();
      document.body.removeChild(linkInvisivel);

    } catch (e) {
      console.error("Erro ao gerar relatório:", e);
      alert("Ocorreu um erro ao exportar o relatório. Tente novamente.");
    } finally {
      btnExportar.innerHTML = '📥 Gerar Relatório (Excel/CSV)';
      btnExportar.disabled = false;
    }
  };
}

// ====================================================================
// 6. DELEGAÇÃO DE EVENTOS GLOBAIS ALTERNATIVOS E COMPATIBILIDADE
// ====================================================================
document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!target) return;

  // Interceptação do botão de entrega em tempo real sem conflito de contexto global inline
  if (target.classList.contains('btn-entregar')) {
    const pedidoId = target.getAttribute('data-id');
    if (pedidoId) await darBaixaPedido(pedidoId);
  }
});

// ====================================================================
// 7. AUTENTICAÇÃO E GERENCIAMENTO DE ESTADO / PONTOS
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

    const saldoEl = document.getElementById('valSaldo');
    const saldoMobEl = document.getElementById('valSaldoMobile');

    if (userSnap.exists()) {
        const dados = userSnap.data();
        let moedasAtuais = dados.pontos || 0;
        
        if (saldoEl) saldoEl.textContent = moedasAtuais;
        if (saldoMobEl) saldoMobEl.textContent = moedasAtuais;

        if (dados.ultimoLogin !== hoje) {
            await updateDoc(userRef, {
                pontos: increment(10),
                ultimoLogin: hoje,
                foto: user.photoURL || null,
                nome: user.displayName || 'Usuário Leveros'
            });
            moedasAtuais += 10;
            if (saldoEl) saldoEl.textContent = moedasAtuais;
            if (saldoMobEl) saldoMobEl.textContent = moedasAtuais;
            alert("Bom dia! Você acabou de ganhar 10 moedas pela sua presença no portal hoje! 🪙");
        } else {
            await updateDoc(userRef, { foto: user.photoURL || null, nome: user.displayName || 'Usuário Leveros' });
        }
    } else {
        await setDoc(userRef, {
            nome: user.displayName || 'Usuário Leveros',
            foto: user.photoURL || null,
            pontos: 50,
            ultimoLogin: hoje
        });
        if (saldoEl) saldoEl.textContent = 50;
        if (saldoMobEl) saldoMobEl.textContent = 50;
        alert("Bem-vindo(a) ao CX Resolve! Você acaba de receber 50 moedas para começar! 🪙");
    }
  } catch (err) { console.error("Erro ao sincronizar saldo.", err); }
}

onAuthStateChanged(auth, async user => {
  if (user && user.email.endsWith('@leveros.com.br')) {
    currentUser = user;
    const emailLogado = user.email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLogado);

    // ===== MURALHA EXTRA: VERIFICAÇÃO DE SUBPÁGINAS GESTORAS =====
    const paginasAdminIDs = ['admin-content', 'admin-logs-content', 'admin-pontos-content', 'centro-custo-content'];
    let containerAdminAtivo = null;

    paginasAdminIDs.forEach(id => {
      const el = document.getElementById(id);
      if (el) containerAdminAtivo = el;
    });

    if (containerAdminAtivo && !isAdmin) {
        alert("Acesso negado. Esta é uma área restrita a gestores.");
        window.location.href = 'index.html';
        return; 
    }
    // =============================================================

    const loginError = document.getElementById('loginError');
    const loginArea = document.getElementById('login-area');
    
    const conteudoArea = document.getElementById('conteudo') || 
                         document.getElementById('timeline-content') || 
                         document.getElementById('informativos-content') || 
                         document.getElementById('materiais-content') || 
                         containerAdminAtivo;
    
    if (loginError) loginError.classList.remove('visible');
    if (loginArea) loginArea.style.display = 'none';
    if (conteudoArea) conteudoArea.style.display = 'block';
    
    const welcomeUser = document.getElementById('welcomeUser');
    if (welcomeUser) welcomeUser.textContent = user.displayName ? user.displayName.split(' ')[0] : 'bem-vindo';
    
    const feedbackNome = document.getElementById('feedbackNome');
    if (feedbackNome) feedbackNome.value = user.displayName || '';
    
    const feedbackEmail = document.getElementById('feedbackEmail');
    if (feedbackEmail) feedbackEmail.value = user.email || '';

    const myAvatar = document.getElementById('myAvatar');
    if (myAvatar) myAvatar.innerHTML = renderAvatar(user.displayName, user.photoURL);

    const menuAdminContainer = document.getElementById('menuAdminContainer');
    const navAdminMobile = document.getElementById('navAdminMobile');
    const btnAdmin = document.getElementById('btnAdmin');

    if (isAdmin) {
      if (btnAdmin) btnAdmin.style.display = 'flex';
      if (menuAdminContainer) menuAdminContainer.style.display = 'block';
      if (navAdminMobile) navAdminMobile.style.display = 'block';
    } else {
      if (btnAdmin) btnAdmin.style.display = 'none';
      if (menuAdminContainer) menuAdminContainer.style.display = 'none';
      if (navAdminMobile) navAdminMobile.style.display = 'none';
    }
    
    registrarAcesso(user);
    carregarAvisos(isAdmin);
    
    // Inicialização condicional baseada na página administrativa carregada
    if (document.getElementById('logsContainer') && isAdmin) {
      carregarLogsAdmin();
    }
    
    if (document.getElementById('listaPedidos') && isAdmin) {
      carregarPedidos();
    }
    
    if (document.getElementById('feedList')) {
      carregarFeed(isAdmin);
      carregarRanking();
      carregarTickerDiario();
      await sincronizarPontosDiarios(user);
    }
    
  } else {
    currentUser = null;
    const loginArea = document.getElementById('login-area');
    
    if (loginArea) {
      loginArea.style.display = 'flex';
      if (document.getElementById('conteudo')) document.getElementById('conteudo').style.display = 'none';
      
      if (user && !user.email.endsWith('@leveros.com.br')) {
        const loginError = document.getElementById('loginError');
        if (loginError) loginError.classList.add('visible');
        signOut(auth);
      }
    } else {
      window.location.href = 'index.html';
    }
  }
});

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  loginBtn.onclick = () => {
    document.getElementById('loginError').classList.remove('visible');
    signInWithPopup(auth, provider).catch(() => document.getElementById('loginError').classList.add('visible'));
  };
}

const logout = () => { sessionStorage.removeItem('logRegistrado'); signOut(auth); window.location.href = 'index.html'; };
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
if (logoutBtn) logoutBtn.onclick = logout;
if (logoutBtnMobile) logoutBtnMobile.onclick = logout;
