import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Configuração de Data e Ano
document.getElementById('anoAtual').textContent = new Date().getFullYear();
const dias  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const agora = new Date();
document.getElementById('welcomeDate').textContent = 
  `${dias[agora.getDay()]}, ${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;

// Dados da Busca
const dados = [
  {nome:"GLPI",categoria:"Sistema",link:"https://glpi.leveros.com.br"},
  {nome:"Uappi",categoria:"Sistema",link:"https://www.vendas.leveros.com.br/wapstore/acesso"},
  {nome:"BoxLink",categoria:"Sistema",link:"https://matriz.boxlink.com.br/home"},
  {nome:"Intergrall",categoria:"Sistema",link:"https://wwws.intergrall.com.br/callcenter/cc_login.php"},
  {nome:"Book de Atendimento N1 N2 N3",categoria:"Material",link:"materiais.html"},
  {nome:"Fluxo de Pedido não faturado",categoria:"Material",link:"materiais.html"},
  {nome:"Como consultar pedido na BoxLink",categoria:"Material",link:"materiais.html"},
  {nome:"Como usar a Uappi",categoria:"Material",link:"materiais.html"},
  {nome:"Consulta na FUP",categoria:"Material",link:"materiais.html"}
];

const buscaEl      = document.getElementById('busca');
const resultadosEl = document.getElementById('resultados');

// CORREÇÃO: Função de escape fortalecida contra null/undefined
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

buscaEl.addEventListener('keyup', function() {
  const texto = this.value.toLowerCase();
  resultadosEl.innerHTML = '';
  if (texto.length < 2) { resultadosEl.style.display = 'none'; return; }
  const encontrados = dados.filter(d => d.nome.toLowerCase().includes(texto));
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
document.getElementById('hamburger').addEventListener('click', () => { document.getElementById('mobileMenu').classList.toggle('open'); });

if(document.getElementById('btnAdmin')){
  document.getElementById('btnAdmin').addEventListener('click', () => { document.getElementById('formAviso').classList.toggle('open'); });
}

const EMOJIS = { urgente:'🚨', informativo:'📋', treinamento:'📚', geral:'📌' };

function renderAvisos(avisos, isAdmin) {
  const lista = document.getElementById('avisosLista');
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
        ${isAdmin ? `<button class="btn-apagar btn-deletar-dinamico" data-id="${escapeHTML(a.id || '')}" title="Apagar aviso">✕</button>` : ''}
      </div>`;
  }).join('');
}

function carregarAvisos(isAdmin) {
  const q = query(collection(db, 'avisos'), orderBy('criadoEm', 'desc'));
  onSnapshot(q, snap => renderAvisos(snap.docs.map(d => ({ id: d.id, ...d.data() })), isAdmin));
}

document.getElementById('btnPublicarAviso').addEventListener('click', async () => {
  if (!currentUser) return;
  const textoInput = document.getElementById('textoAviso');
  const texto = textoInput.value.trim();
  const cat = document.getElementById('catAviso').value;
  if (!texto) return;
  try {
    await addDoc(collection(db, 'avisos'), { texto, categoria: cat, autor: currentUser.displayName?.split(' ')[0] || 'Gestor', criadoEm: serverTimestamp() });
    textoInput.value = ''; document.getElementById('formAviso').classList.remove('open');
  } catch (err) { alert('Sem permissão para publicar avisos.'); }
});

document.getElementById('avisosLista').addEventListener('click', async function(event) {
  if (event.target.classList.contains('btn-deletar-dinamico')) {
    if (!currentUser || !confirm('Apagar este aviso?')) return;
    try { await deleteDoc(doc(db, 'avisos', event.target.getAttribute('data-id'))); } 
    catch (err) { alert('Sem permissão para apagar este aviso.'); }
  }
});

async function registrarAcesso(usuario) {
  if (sessionStorage.getItem('logRegistrado')) return; 
  try {
    await addDoc(collection(db, 'acessos'), { nome: usuario.displayName || 'Usuário', email: usuario.email, dataAcesso: serverTimestamp() });
    sessionStorage.setItem('logRegistrado', 'true');
  } catch (error) { console.error("Erro ao registrar log", error); }
}

onAuthStateChanged(auth, user => {
  if (user && user.email.endsWith('@leveros.com.br')) {
    currentUser = user;
    document.getElementById('loginError').classList.remove('visible');
    document.getElementById('login-area').style.display = 'none';
    document.getElementById('conteudo').style.display  = 'block';
    
    document.getElementById('welcomeUser').textContent = user.displayName ? user.displayName.split(' ')[0] : 'bem-vindo';
    document.getElementById('feedbackNome').value = user.displayName || '';
    document.getElementById('feedbackEmail').value = user.email || '';

    const emailLogado = user.email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLogado);

    if (isAdmin) {
      document.getElementById('btnAdmin').style.display = 'flex';
      document.getElementById('menuAdminContainer').style.display = 'block';
      document.getElementById('navAdminMobile').style.display = 'block';
    } else {
      document.getElementById('btnAdmin').style.display = 'none';
      document.getElementById('formAviso').classList.remove('open');
      document.getElementById('menuAdminContainer').style.display = 'none';
      document.getElementById('navAdminMobile').style.display = 'none';
    }
    
    carregarAvisos(isAdmin);
    registrarAcesso(user);
    
  } else if (user) {
    signOut(auth); currentUser = null;
    document.getElementById('loginError').classList.add('visible');
    document.getElementById('login-area').style.display  = 'flex';
    document.getElementById('conteudo').style.display   = 'none';
  } else {
    currentUser = null;
    document.getElementById('login-area').style.display = 'flex';
    document.getElementById('conteudo').style.display  = 'none';
  }
});

document.getElementById('loginBtn').onclick = () => {
  document.getElementById('loginError').classList.remove('visible');
  signInWithPopup(auth, provider).catch(() => document.getElementById('loginError').classList.add('visible'));
};

const logout = () => { sessionStorage.removeItem('logRegistrado'); signOut(auth); };
document.getElementById('logoutBtn').onclick = logout;
document.getElementById('logoutBtnMobile').onclick = logout;
