import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp, arrayUnion, arrayRemove, increment, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
    document.getElementById('mobileMenu').classList.toggle('open'); 
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
    {nome:"Como consultar pedido na BoxLink", categoria:"Material", link:"materiais.html"},
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
// 4. DELEGAÇÃO DE EVENTOS GLOBAIS (Seguro contra XSS e CSP Block)
// ====================================================================
document.addEventListener('click', async (event) => {
  const target = event.target;

  // --- LÓGICA DA PÁGINA INFORMATIVOS (Toggle Metas) ---
  if (target.classList.contains('btn-toggle-detalhes')) {
    const details = target.nextElementSibling;
    if (details) {
      const isOpen = details.classList.toggle('open');
      target.textContent = isOpen ? 'Ocultar detalhes' : 'Ver detalhes';
    }
  }

  // --- LÓGICA DA PÁGINA DE MATERIAIS (Filtro de Cards) ---
  if (target.classList.contains('filtro-btn')) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    target.classList.add('active');
    const cat = target.getAttribute('data-filtro');
    document.querySelectorAll('.card').forEach(card => {
      card.style.display = (cat === 'todos' || card.dataset.cat === cat) ? 'flex' : 'none';
    });
  }

  // --- INTERAÇÕES DO MURAL DE AVISOS ---
  if (target.id === 'btnAdmin') {
    document.getElementById('formAviso').classList.toggle('open');
  }

  if (target.id === 'btnPublicarAviso') {
    if (!currentUser) return;
    const textoInput = document.getElementById('textoAviso');
    const texto = textoInput.value.trim();
    const cat = document.getElementById('catAviso').value;
    if (!texto) return;
    try {
      await addDoc(collection(db, 'avisos'), { texto, categoria: cat, autor: currentUser.displayName?.split(' ')[0] || 'Gestor', criadoEm: serverTimestamp() });
      textoInput.value = ''; document.getElementById('formAviso').classList.remove('open');
    } catch (err) { alert('Sem permissão para publicar avisos.'); }
  }

  if (target.classList.contains('btn-deletar-aviso')) {
    if (!currentUser || !confirm('Apagar este aviso?')) return;
    try { await deleteDoc(doc(db, 'avisos', target.getAttribute('data-id'))); } 
    catch (err) { alert('Sem permissão para apagar este aviso.'); }
  }

  // --- INTERAÇÕES DA TIMELINE ---
  if (target.id === 'btnPublishPost') {
    if (!currentUser) return;
    const textInput = document.getElementById('postText');
    const mediaInput = document.getElementById('postMediaUrl');
    const texto = textInput.value.trim();
    let midiaUrl = mediaInput.value.trim();
    
    const matchDrive = midiaUrl.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchDrive && matchDrive[1]) midiaUrl = `https://drive.google.com/thumbnail?id=${matchDrive[1]}&sz=w1000`;
    
    if (!texto && !midiaUrl) return alert("Escreva algo ou insira uma imagem!");

    target.textContent = 'Enviando...';
    target.disabled = true;

    try {
      await addDoc(collection(db, 'timeline_posts'), {
        texto: texto,
        midiaUrl: midiaUrl,
        autor: currentUser.displayName || 'Usuário Leveros',
        autorEmail: currentUser.email.toLowerCase(),
        autorFoto: currentUser.photoURL || null,
        likes: [],
        comentarios: [], // Mantido por compatibilidade
        criadoEm: serverTimestamp()
      });
      textInput.value = ''; mediaInput.value = '';
    } catch (e) { alert("Erro ao publicar. Verifique as permissões."); }
    finally { target.textContent = 'Publicar'; target.disabled = false; }
  }

  if (target.classList.contains('btn-like-post')) {
    if (!currentUser) return;
    const postId = target.getAttribute('data-id');
    const postRef = doc(db, 'timeline_posts', postId);
    try {
      if (target.classList.contains('liked')) await updateDoc(postRef, { likes: arrayRemove(currentUser.email) });
      else await updateDoc(postRef, { likes: arrayUnion(currentUser.email) });
    } catch(e) {}
  }

  if (target.classList.contains('btn-deletar-post')) {
    if (!confirm('Tem certeza que deseja apagar esta publicação de todos os usuários?')) return;
    try { await deleteDoc(doc(db, 'timeline_posts', target.getAttribute('data-id'))); } 
    catch(e) { alert("Sem permissão para apagar este post."); }
  }

  if (target.classList.contains('btn-send-comment')) {
    enviarComentario(target.getAttribute('data-id'));
  }

  if (target.classList.contains('btn-deletar-comentario')) {
    if (!confirm('Deseja apagar este comentário?')) return;
    try {
      const postId = target.getAttribute('data-post');
      const commentObject = JSON.parse(decodeURIComponent(target.getAttribute('data-comment')));
      await updateDoc(doc(db, 'timeline_posts', postId), { comentarios: arrayRemove(commentObject) });
    } catch(e) { alert("Erro ao apagar comentário."); }
  }
});

document.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && event.target.classList.contains('input-comentario')) {
    enviarComentario(event.target.getAttribute('data-id'));
  }
});

async function enviarComentario(postId) {
  if (!currentUser) return;
  const input = document.getElementById(`comment-${postId}`);
  const texto = input.value.trim();
  if (!texto) return;

  input.disabled = true;
  try {
    const postRef = doc(db, 'timeline_posts', postId);
    await updateDoc(postRef, {
      comentarios: arrayUnion({
        autor: currentUser.displayName || 'Usuário',
        email: currentUser.email.toLowerCase(), 
        foto: currentUser.photoURL || null,
        texto: texto,
        data: new Date().toISOString()
      })
    });
    input.value = '';
  } catch(e) { alert("Erro ao comentar"); } 
  finally { input.disabled = false; }
}

// ====================================================================
// 5. AUTENTICAÇÃO E GERENCIAMENTO DE ESTADO / PONTOS
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

    const loginError = document.getElementById('loginError');
    const loginArea = document.getElementById('login-area');
    // ATUALIZAÇÃO: Container de materiais agora também é verificado para desbloqueio
    const conteudoArea = document.getElementById('conteudo') || document.getElementById('timeline-content') || document.getElementById('informativos-content') || document.getElementById('materiais-content');
    
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
    
    if (document.getElementById('feedList')) {
      carregarFeed(isAdmin);
      carregarRanking();
      carregarTickerDiario();
      await sincronizarPontosDiarios(user);
    }
    
  } else {
    // USUÁRIO DESLOGADO OU COM E-MAIL NÃO CORPORATIVO
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
