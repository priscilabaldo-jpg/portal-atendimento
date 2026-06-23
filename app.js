

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp, arrayUnion, arrayRemove, increment, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
// CORREÇÃO EMAILJS: acesso ao objeto global via window
// ====================================================================
function getEmailJS() {
    if (typeof window.emailjs !== 'undefined') {
        return window.emailjs;
    }
    console.error("EmailJS SDK não encontrado. Verifique se o script está carregado no HTML antes do app.js.");
    return null;
}

// ====================================================================
// CORREÇÃO CENTRAL DE IMAGENS
// Normaliza qualquer URL de imagem para um formato que o browser
// consiga carregar. Suporta Google Drive, lh3.googleusercontent e
// URLs diretas da web.
// ====================================================================
function normalizarUrlImagem(url) {
    if (!url || typeof url !== 'string') return '';

    url = url.trim();

    // Já é um link do lh3 (conversão antiga) → converte para thumbnail confiável
    // Padrão: https://lh3.googleusercontent.com/d/FILE_ID
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match && lh3Match[1]) {
        return `https://drive.google.com/thumbnail?id=${lh3Match[1]}&sz=w1000`;
    }

    // Google Drive – qualquer variante de link compartilhado
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        // Extrai o File ID do link
        const idMatch =
            url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
            url.match(/id=([a-zA-Z0-9_-]+)/) ||
            url.match(/open\?id=([a-zA-Z0-9_-]+)/);

        if (idMatch && idMatch[1]) {
            // Usa o endpoint /thumbnail — funciona sem autenticação adicional
            // quando o arquivo está compartilhado publicamente (Qualquer um com o link)
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
        }
    }

    // URL direta da web (http/https) — retorna como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Não é uma URL válida
    return '';
}

// ====================================================================
// 1. UTILITÁRIOS GLOBAIS E UI BÁSICA
// ====================================================================
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
if(!window.escapeHTML) window.escapeHTML = escapeHTML;

function getInitials(name) { return name ? name.charAt(0).toUpperCase() : 'U'; }

function renderAvatar(nome, photoUrl) {
    if (photoUrl) return `<img src="${photoUrl}" alt="Avatar" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
    return getInitials(nome);
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
// 3. MOTOR DA TIMELINE: RENDERIZAR FEED E PUBLICAR
// ====================================================================

async function notificarTimePorEmail(autor, texto) {
    try {
        const ejs = getEmailJS();
        if (!ejs) {
            throw new Error("EmailJS SDK não está disponível. Verifique o carregamento no HTML.");
        }

        const templateParams = {
            autor_nome: autor,
            mensagem: texto,
            email: 'anapaula.gonçalves@leveros.com.br, bruna.condulucci@leveros.com.br, helen.silva@leveros.com.br, jackeline.cunha@leveros.com.br, jaqueline.silva@leveros.com.br, maria.lima@leveros.com.br, maria.silva@leveros.com.br, simone.leite@leveros.com.br, thais.pinheiro@leveros.com.br, maria.padua@leveros.com.br, camili.furlan@leveros.com.br, dara.melo@leveros.com.br, gabrielle.chadi@leveros.com.br, gabriela.costa@leveros.com.br, isadora.lopes@leveros.com.br, isadora.saraiva@leveros.com.br, maria.moraes@leveros.com.br, eduarda.goes@leveros.com.br, julia.santos@leveros.com.br, mislaine.fachiano@leveros.com.br, pedro.sabino@leveros.com.br, rafael.almeida@leveros.com.br, giovana.moreno@leveros.com.br, layane.medina@leveros.com.br, ariany.santos@leveros.com.br, lorena.anjos@leveros.com.br, matheus.mendes@leveros.com.br, priscila.baldo@leveros.com.br, thaiza.vieira@leveros.com.br, danilo.bernardes@leveros.com.br, leticia.fernandes@leveros.com.br, muriel.santos@leveros.com.br, patricia.oliveira@leveros.com.br, alessandra.mincov@leveros.com.br, evellin.dias@leveros.com.br, flavia.alves@leveros.com.br, matheus.herrera@leveros.com.br'
        };

        const resultado = await ejs.send('service_rc58xfn', 'template_074uqfn', templateParams);
        console.log("E-mail disparado com sucesso via EmailJS!", resultado);
    } catch(e) {
        console.error("Erro ao disparar e-mail via EmailJS (objeto completo):", e);

        let detalhe = '';
        if (e && typeof e === 'object') {
            if (e.text)    detalhe = `Status ${e.status}: ${e.text}`;
            else if (e.message) detalhe = e.message;
            else           detalhe = JSON.stringify(e);
        } else {
            detalhe = String(e);
        }

        alert("O post foi salvo, mas houve uma falha ao disparar o e-mail para a equipe.\n\nDetalhes: " + detalhe);
    }
}

const btnPublishPost = document.getElementById('btnPublishGlobal');
if (btnPublishPost) {
    btnPublishPost.addEventListener('click', async () => {
        const postTextEl = document.getElementById('postTextGlobal');
        const mediaUrlInput = document.getElementById('mediaUrlInputGlobal');
        const sendEmailCheckbox = document.getElementById('sendEmailCheckboxGlobal');

        const texto = postTextEl.value.trim();
        const rawUrl = mediaUrlInput.value.trim();
        const dispararEmail = sendEmailCheckbox ? sendEmailCheckbox.checked : false;

        if (!texto && !rawUrl) {
            alert("Escreva algo ou insira o link de um material para compartilhar com o time!");
            return;
        }

        // CORREÇÃO: normaliza a URL antes de salvar no Firestore
        const mediaUrl = normalizarUrlImagem(rawUrl);

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
                await notificarTimePorEmail(currentUser.displayName || 'Colaborador', texto);
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

// Renderização Principal do Feed
// ====================================================================
// SUBSTITUA COMPLETAMENTE a função window.carregarFeed no seu app.js
// por este bloco inteiro (do "window.carregarFeed" até o fechamento da função).
// Adicione também os listeners de like e comentário logo abaixo.
// ====================================================================

// Renderização Principal do Feed — com Likes e Comentários
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

                const autorNome  = post.autorNome  || post.autor  || post.nome  || 'Colega de Equipe';
                const autorFoto  = post.autorFoto  || post.foto   || null;
                const textoPost  = post.texto      || post.mensagem || post.conteudo || '';
                const rawImgUrl  = post.midiaUrl   || post.imagemUrl || post.image || post.media || post.anexo || post.url || null;

                let dataPost = 'Agora';
                if (post.criadoEm && post.criadoEm.seconds) {
                    dataPost = new Date(post.criadoEm.seconds * 1000).toLocaleString('pt-BR');
                } else if (post.data) {
                    dataPost = post.data;
                }

                const imgUrl     = normalizarUrlImagem(rawImgUrl);
                const imagemHtml = imgUrl
                    ? `<div class="post-media">
                         <img src="${imgUrl}" alt="Imagem da publicação" loading="lazy"
                              referrerpolicy="no-referrer"
                              onerror="this.parentElement.style.display='none'">
                       </div>`
                    : '';

                // — Likes —
                const curtidas      = Array.isArray(post.curtidas) ? post.curtidas : [];
                const totalCurtidas = curtidas.length;
                const euCurti       = currentUser && curtidas.includes(currentUser.email);
                const likeClass     = euCurti ? 'like-btn liked' : 'like-btn';
                const likeTitle     = euCurti ? 'Você curtiu' : 'Curtir';

                // Tooltip com quem curtiu (mostra até 5 nomes, depois "+N")
                const tooltipText = totalCurtidas === 0
                    ? 'Seja o primeiro a curtir!'
                    : curtidas.slice(0, 5).map(e => e.split('@')[0]).join(', ')
                      + (curtidas.length > 5 ? ` e mais ${curtidas.length - 5}` : '');

                // — Comentários —
                const comentarios      = Array.isArray(post.comentarios) ? post.comentarios : [];
                const totalComentarios = comentarios.length;
                const comentariosHtml  = comentarios.map(c => {
                    const cNome = c.autorNome || c.autor || c.email?.split('@')[0] || 'Usuário';
                    const cData = c.criadoEm && c.criadoEm.seconds
                        ? new Date(c.criadoEm.seconds * 1000).toLocaleString('pt-BR')
                        : (c.data || '');
                    const cTexto = c.texto || c.conteudo || '';
                    const cFoto  = c.autorFoto || c.foto || null;
                    const isAdminComment = isAdmin && currentUser && (c.autorEmail === currentUser.email || isAdmin);
                    return `
                        <div class="comment-item" data-comment-id="${window.escapeHTML(c.id || '')}">
                            <div class="comment-avatar">
                                ${cFoto
                                    ? `<img src="${cFoto}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                                    : `<span>${cNome.charAt(0).toUpperCase()}</span>`}
                            </div>
                            <div class="comment-body">
                                <div class="comment-meta">
                                    <strong class="comment-author">${window.escapeHTML(cNome)}</strong>
                                    <span class="comment-date">${window.escapeHTML(cData)}</span>
                                    ${isAdminComment
                                        ? `<button class="btn-del-comment" data-post-id="${postId}" data-comment-id="${window.escapeHTML(c.id || '')}" title="Excluir comentário">✕</button>`
                                        : ''}
                                </div>
                                <p class="comment-text">${window.escapeHTML(cTexto).replace(/\n/g, '<br>')}</p>
                            </div>
                        </div>`;
                }).join('');

                html += `
                <div class="post-card" data-post-id="${postId}">

                    <!-- Cabeçalho do post -->
                    <div class="post-header">
                        <div class="post-user">
                            <div class="post-avatar" style="background: #00c8b3; color: white; flex-shrink:0;">
                                ${autorFoto
                                    ? `<img src="${autorFoto}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;">`
                                    : `<span style="font-weight:bold;">${autorNome.charAt(0).toUpperCase()}</span>`}
                            </div>
                            <div class="post-info">
                                <span class="post-username">${window.escapeHTML(autorNome)}</span>
                                <span class="post-date">${dataPost}</span>
                            </div>
                        </div>
                        ${isAdmin
                            ? `<button class="btn-apagar btn-apagar-post" data-id="${postId}" title="Deletar Publicação">🗑️</button>`
                            : ''}
                    </div>

                    <!-- Texto -->
                    <div class="post-content">
                        ${window.escapeHTML(textoPost).replace(/\n/g, '<br>')}
                    </div>

                    <!-- Imagem (se houver) -->
                    ${imagemHtml}

                    <!-- Barra de interações -->
                    <div class="post-actions">

                        <!-- Botão de Like -->
                        <div class="like-wrap">
                            <button class="${likeClass}" data-post-id="${postId}" title="${likeTitle}">
                                ${euCurti ? '❤️' : '🤍'} Curtir
                            </button>
                            <span class="like-count" title="${window.escapeHTML(tooltipText)}">
                                ${totalCurtidas > 0 ? `<span class="like-num">${totalCurtidas}</span> ${totalCurtidas === 1 ? 'curtida' : 'curtidas'}` : ''}
                            </span>
                        </div>

                        <!-- Botão de Comentar -->
                        <button class="comment-toggle-btn" data-post-id="${postId}">
                            💬 ${totalComentarios > 0 ? `${totalComentarios} comentário${totalComentarios > 1 ? 's' : ''}` : 'Comentar'}
                        </button>

                    </div>

                    <!-- Seção de comentários (colapsável) -->
                    <div class="comments-section" id="comments-${postId}" style="display:none;">

                        <!-- Lista de comentários existentes -->
                        <div class="comments-list" id="comments-list-${postId}">
                            ${comentariosHtml || '<div class="no-comments">Nenhum comentário ainda. Seja o primeiro!</div>'}
                        </div>

                        <!-- Input de novo comentário -->
                        <div class="comment-input-wrap">
                            <div class="comment-input-avatar" style="background:#00c8b3; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; font-weight:bold;">
                                ${currentUser && currentUser.photoURL
                                    ? `<img src="${currentUser.photoURL}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                                    : (currentUser ? currentUser.displayName?.charAt(0).toUpperCase() || 'U' : 'U')}
                            </div>
                            <div class="comment-input-group">
                                <textarea 
                                    class="comment-textarea" 
                                    id="comment-input-${postId}" 
                                    placeholder="Escreva um comentário..." 
                                    rows="1"
                                    data-post-id="${postId}"
                                ></textarea>
                                <button class="comment-send-btn" data-post-id="${postId}">Enviar</button>
                            </div>
                        </div>

                    </div>

                </div>`;

            } catch (err) {
                console.warn("Um post foi ignorado devido a formato incompatível:", err);
            }
        });

        feedList.innerHTML = html;

    }, (error) => {
        console.error("Erro ao puxar dados do Feed:", error);
        feedList.innerHTML = `<div class="avisos-vazio" style="color:#FF6B6B; text-align:center;">Erro ao carregar publicações: ${error.message}</div>`;
    });
};


// ====================================================================
// LISTENERS DE LIKE E COMENTÁRIO
// Adicione este bloco logo após a definição de window.carregarFeed
// (antes da seção de Ranking)
// ====================================================================

// Delegação para likes, toggle de comentários e envio de comentário
document.addEventListener('click', async (e) => {

    // — Toggle da seção de comentários —
    const toggleBtn = e.target.closest('.comment-toggle-btn');
    if (toggleBtn) {
        const postId   = toggleBtn.getAttribute('data-post-id');
        const section  = document.getElementById(`comments-${postId}`);
        if (!section) return;
        const isOpen   = section.style.display !== 'none';
        section.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            // Foca no textarea ao abrir
            const ta = document.getElementById(`comment-input-${postId}`);
            if (ta) setTimeout(() => ta.focus(), 50);
        }
        return;
    }

    // — Curtir / Descurtir —
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
        if (!currentUser) return alert("Você precisa estar logado para curtir.");
        const postId  = likeBtn.getAttribute('data-post-id');
        const postRef = doc(db, 'timeline_posts', postId);

        likeBtn.disabled = true;
        try {
            const snap = await getDoc(postRef);
            if (!snap.exists()) return;
            const curtidas  = snap.data().curtidas || [];
            const jaGostou  = curtidas.includes(currentUser.email);
            await updateDoc(postRef, {
                curtidas: jaGostou ? arrayRemove(currentUser.email) : arrayUnion(currentUser.email)
            });
        } catch (err) {
            console.error("Erro ao processar like:", err);
        } finally {
            likeBtn.disabled = false;
        }
        return;
    }

    // — Enviar comentário (botão) —
    const sendBtn = e.target.closest('.comment-send-btn');
    if (sendBtn) {
        const postId = sendBtn.getAttribute('data-post-id');
        await enviarComentario(postId);
        return;
    }

    // — Excluir comentário —
    const delCommentBtn = e.target.closest('.btn-del-comment');
    if (delCommentBtn) {
        const postId     = delCommentBtn.getAttribute('data-post-id');
        const commentId  = delCommentBtn.getAttribute('data-comment-id');
        if (!postId || !commentId) return;
        if (!confirm("Excluir este comentário?")) return;
        try {
            const postRef = doc(db, 'timeline_posts', postId);
            const snap    = await getDoc(postRef);
            if (!snap.exists()) return;
            const comentarios = (snap.data().comentarios || []).filter(c => c.id !== commentId);
            await updateDoc(postRef, { comentarios });
        } catch (err) {
            console.error("Erro ao excluir comentário:", err);
        }
        return;
    }

});

// Enviar com Ctrl+Enter no textarea
document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const ta = e.target.closest('.comment-textarea');
        if (ta) {
            const postId = ta.getAttribute('data-post-id');
            await enviarComentario(postId);
        }
    }
});

async function enviarComentario(postId) {
    if (!currentUser) return alert("Você precisa estar logado para comentar.");
    const ta = document.getElementById(`comment-input-${postId}`);
    if (!ta) return;

    const texto = ta.value.trim();
    if (!texto) return;

    const sendBtn = document.querySelector(`.comment-send-btn[data-post-id="${postId}"]`);
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }

    try {
        const postRef  = doc(db, 'timeline_posts', postId);
        const novoComentario = {
            id:         Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            autorNome:  currentUser.displayName || 'Colaborador',
            autorEmail: currentUser.email,
            autorFoto:  currentUser.photoURL || null,
            texto:      texto,
            criadoEm:   { seconds: Math.floor(Date.now() / 1000) }  // client-side timestamp para exibição imediata
        };

        const snap = await getDoc(postRef);
        const comentariosAtuais = snap.exists() ? (snap.data().comentarios || []) : [];

        await updateDoc(postRef, {
            comentarios: [...comentariosAtuais, novoComentario]
        });

        ta.value = '';
        ta.style.height = 'auto';

    } catch (err) {
        console.error("Erro ao comentar:", err);
        alert("Erro ao enviar comentário. Tente novamente.");
    } finally {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; }
    }
}

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
    }, (error) => {
        console.error("Erro ao carregar o ranking:", error);
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
    }, (error) => {
        console.error("Erro ao carregar o ticker:", error);
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
function carregarPedidosAdmin() {
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

async function darBaixaPedido(pedidoId) {
  if (!confirm("Confirmar que o prêmio já foi entregue ao colaborador?")) return;
  try {
    await updateDoc(doc(db, "pedidos_lojinha", pedidoId), { status: "Entregue" });
  } catch(e) {
    console.error("Erro ao atualizar status:", e);
    alert("Erro ao tentar atualizar o status do pedido.");
  }
}

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
// 5.5 CADASTRO DE NOVOS PRODUTOS NA LOJINHA 
// ====================================================================
const formNovoProduto = document.getElementById('formNovoProduto');
if (formNovoProduto) {
    formNovoProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = document.getElementById('btnSalvarProduto');
        btnSalvar.textContent = "Processando e Salvando... ⏳"; 
        btnSalvar.disabled = true;

        try {
            const nomeVal = document.getElementById('prodNome').value.trim();
            const descVal = document.getElementById('prodDesc').value.trim();
            const precoVal = parseInt(document.getElementById('prodPreco').value) || 0;
            const estoqueVal = parseInt(document.getElementById('prodEstoque').value) || 0;
            const emojiVal = document.getElementById('prodEmoji').value.trim() || '🎁';
            const linkBruto = document.getElementById('prodFoto').value.trim();

            // CORREÇÃO: usa normalizarUrlImagem para produtos também
            let imagemFinal = linkBruto ? normalizarUrlImagem(linkBruto) : emojiVal;
            // Se normalizarUrlImagem retornar vazio (não era URL) mas tinha algo digitado,
            // trata como emoji/texto
            if (!imagemFinal && linkBruto) imagemFinal = linkBruto;
            if (!imagemFinal) imagemFinal = emojiVal;

            if (precoVal <= 0) {
                alert("O preço deve ser maior que zero!");
                btnSalvar.textContent = "➕ Adicionar ao Catálogo"; 
                btnSalvar.disabled = false;
                return;
            }

            await addDoc(collection(db, 'produtos_loja'), {
                imagem: imagemFinal,
                nome: nomeVal,
                desc: descVal,
                preco: precoVal,
                estoque: estoqueVal,
                criadoEm: serverTimestamp()
            });

            alert(`✅ Sucesso! O item "${nomeVal}" foi adicionado ao catálogo.`);
            formNovoProduto.reset(); 

        } catch (error) {
            console.error("Erro detalhado:", error);
            alert(`❌ Erro: ${error.message}`);
        } finally {
            btnSalvar.textContent = "➕ Adicionar ao Catálogo"; 
            btnSalvar.disabled = false;
        }
    });
}

// ====================================================================
// 6. MÓDULO ADMINISTRATIVO 3: ORÇAMENTO BACKOFFICE (`centrodecusto.html`)
// ====================================================================
const ORCAMENTO_TEMPORADA = {
  "Despesa Viagem": 65000,
  "Folha de Pagamento": 2400000,
  "Impostos, Taxas e Contribuições": 670,
  "Infraestrutura": 45400,
  "Outras Despesas": 243200
};

function formatarMoeda(valor) {
  return "R$ " + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcularIndicadores(orcado, realizado) {
  const percentual = orcado > 0 ? (realizado / orcado) * 100 : (realizado > 0 ? 100 : 0);
  const delta = orcado - realizado; 
  const estourou = percentual > 100;
  const seta = estourou ? '⬆️' : '⬇️';
  const corClass = estourou ? 'text-red' : 'text-green';
  const sinalDelta = estourou ? '-' : ''; 
  
  return {
    percFormatado: `<span class="${corClass}">${seta} ${percentual.toFixed(1).replace('.',',')}%</span>`,
    deltaFormatado: `<span class="${corClass}">${sinalDelta}${formatarMoeda(Math.abs(delta))}</span>`
  };
}

function desenharGrafico(labels, orcado, realizado) {
  const canvas = document.getElementById('graficoDesvios');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (graficoInstancia) graficoInstancia.destroy();

  graficoInstancia = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { 
          label: 'Orçamento Limite (Saudável)', 
          data: orcado, 
          backgroundColor: 'rgba(0, 45, 50, 0.8)', 
          borderRadius: 6, 
          borderSkipped: false
        },
        { 
          label: 'Gasto Realizado', 
          data: realizado, 
          backgroundColor: 'rgba(231, 76, 60, 0.8)', 
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Segoe UI', size: 13 } } },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: { 
        y: { 
          beginAtZero: true, 
          grid: { color: '#f0f0f0', drawBorder: false }, 
          ticks: { callback: function(value) { return 'R$ ' + value; } }
        },
        x: { grid: { display: false, drawBorder: false } }
      } 
    }
  });
}

function carregarDadosOrcamento() {
  const q = query(collection(db, 'notasFiscais'));
  
  onSnapshot(q, (snapshot) => {
    let dadosAgrupados = {};
    let totalGastoMes = 0;
    let totalOrcadoMes = 0;
    nfParaExportacao = [];
    
    for (let categoria in ORCAMENTO_TEMPORADA) {
      dadosAgrupados[categoria] = {
        orcadoMensal: ORCAMENTO_TEMPORADA[categoria] / 12,
        realizado: 0,
        itens: []
      };
      totalOrcadoMes += (ORCAMENTO_TEMPORADA[categoria] / 12);
    }

    snapshot.forEach((docSnap) => {
      const dado = docSnap.data();
      const valor = parseFloat(dado.valor) || 0;
      
      if (!dadosAgrupados[dado.categoria]) {
        dadosAgrupados[dado.categoria] = { orcadoMensal: 0, realizado: 0, itens: [] };
      }
      
      dadosAgrupados[dado.categoria].realizado += valor;
      dadosAgrupados[dado.categoria].itens.push({ id: docSnap.id, ...dado, valorNum: valor });
      totalGastoMes += valor;

      nfParaExportacao.push({
        nf: dado.numeroNf || '-',
        descricao: dado.descricao || '-',
        emissao: dado.dataEmissao || '-',
        categoria: dado.categoria || '-',
        valor: valor,
        link: dado.linkPdf || 'Sem Anexo'
      });
    });

    const cardOrcMes = document.getElementById('cardOrcamentoMes');
    if (cardOrcMes) cardOrcMes.textContent = formatarMoeda(totalOrcadoMes);
    
    const cardReaMes = document.getElementById('cardRealizadoMes');
    if (cardReaMes) cardReaMes.textContent = formatarMoeda(totalGastoMes);

    const tbody = document.getElementById('tabelaMatriz');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let labelsGrafico = [];
    let dataOrcadoGrafico = [];
    let dataRealizadoGrafico = [];

    for (let categoria in dadosAgrupados) {
      const catData = dadosAgrupados[categoria];
      if (catData.orcadoMensal === 0 && catData.realizado === 0) continue; 

      labelsGrafico.push(categoria);
      dataOrcadoGrafico.push(catData.orcadoMensal);
      dataRealizadoGrafico.push(catData.realizado);

      const ind = calcularIndicadores(catData.orcadoMensal, catData.realizado);
      const trNivel1 = document.createElement('tr');
      trNivel1.className = 'nivel1';
      trNivel1.innerHTML = `
        <td>⊟ ${categoria}</td>
        <td>${formatarMoeda(catData.orcadoMensal)}</td>
        <td>${formatarMoeda(catData.realizado)}</td>
        <td>${ind.percFormatado}</td>
        <td>${ind.deltaFormatado}</td>
        <td></td>
      `;
      tbody.appendChild(trNivel1);

      catData.itens.forEach(item => {
        const linkPdf = item.linkPdf ? `<a href="${item.linkPdf}" target="_blank" style="text-decoration:none; background:#eef2f3; padding:4px 8px; border-radius:4px; font-size:12px; color:#002D32; font-weight:bold;">📄 Ver</a>` : '';
        const btnApagar = `<button class="btn-apagar-nf" data-id="${item.id}" style="background:none; border:none; cursor:pointer; font-size:14px; margin-left:10px;" title="Excluir NF">🗑️</button>`;
        
        const trNivel2 = document.createElement('tr');
        trNivel2.className = 'nivel2';
        trNivel2.innerHTML = `
          <td>${item.descricao} <span style="color:#aaa; font-size:11px;">(NF: ${item.numeroNf})</span></td>
          <td style="color:#bbb;">-</td>
          <td>${formatarMoeda(item.valorNum)}</td>
          <td style="color:#bbb;">-</td>
          <td style="color:#bbb;">-</td>
          <td style="text-align:right;">${linkPdf} ${btnApagar}</td>
        `;
        tbody.appendChild(trNivel2);
      });
    }

    const indTotal = calcularIndicadores(totalOrcadoMes, totalGastoMes);
    const tbodyTotal = document.getElementById('tabelaMatrizTotal');
    if (tbodyTotal) {
      tbodyTotal.innerHTML = `
        <tr class="linha-total">
          <td>Total Geral da Operação</td>
          <td>${formatarMoeda(totalOrcadoMes)}</td>
          <td>${formatarMoeda(totalGastoMes)}</td>
          <td>${indTotal.percFormatado}</td>
          <td>${indTotal.deltaFormatado}</td>
          <td></td>
        </tr>
      `;
    }

    desenharGrafico(labelsGrafico, dataOrcadoGrafico, dataRealizadoGrafico);
  });
}

async function apagarNF(id) {
  if (confirm('⚠️ Tem certeza que deseja excluir permanentemente este lançamento?')) {
    try { await deleteDoc(doc(db, 'notasFiscais', id)); } 
    catch (err) { alert('Erro ao excluir. Verifique permissões.'); }
  }
}

const formOrcamento = document.getElementById('formOrcamento');
if (formOrcamento) {
  formOrcamento.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.textContent = "Salvando... ⏳"; 
    btnSalvar.disabled = true;

    try {
      let urlDoPdf = ""; 
      const inputArquivo = document.getElementById('arquivoNf');
      const arquivoSelecionado = inputArquivo && inputArquivo.files ? inputArquivo.files[0] : null; 
      
      if (arquivoSelecionado) {
        const local = ref(storage, 'comprovantes/' + Date.now() + '_' + arquivoSelecionado.name);
        await uploadBytes(local, arquivoSelecionado);
        urlDoPdf = await getDownloadURL(local);
      }
      
      let valRaw = document.getElementById('valor').value;
      let valNum = parseFloat(valRaw.replace(',', '.')) || 0;
      
      await addDoc(collection(db, 'notasFiscais'), {
        numeroNf: document.getElementById('numeroNf').value,
        descricao: document.getElementById('descricao').value,
        dataEmissao: document.getElementById('dataEmissao').value,
        categoria: document.getElementById('categoria').value,
        valor: valNum, 
        linkPdf: urlDoPdf, 
        criadoEm: serverTimestamp()
      });
      formOrcamento.reset(); 
    } catch (error) { 
      console.error(error);
      alert("Erro ao salvar o lançamento."); 
    } 
    finally { 
      btnSalvar.textContent = "Salvar Lançamento →"; 
      btnSalvar.disabled = false; 
    }
  });
}

const btnExportarExcel = document.getElementById('btnExportarExcel');
if (btnExportarExcel) {
  btnExportarExcel.addEventListener('click', () => {
    if (nfParaExportacao.length === 0) return alert("Não há dados financeiros para exportar.");
    
    let csvContent = '\uFEFF'; 
    csvContent += "NF;Descrição;Emissão;Categoria;Valor(R$);Comprovante PDF\n";
    
    nfParaExportacao.forEach(nf => {
      const valorAjustado = nf.valor.toString().replace('.', ',');
      csvContent += `${nf.nf};${nf.descricao};${nf.emissao};${nf.categoria};${valorAjustado};${nf.link}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkInvisivel = document.createElement("a");
    linkInvisivel.href = url;
    
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    linkInvisivel.download = `Relatorio_Orcamento_${hoje}.csv`;
    
    document.body.appendChild(linkInvisivel);
    linkInvisivel.click();
    document.body.removeChild(linkInvisivel);
  });
}

// ====================================================================
// 7. MÓDULO PÚBLICO: A LOJINHA (`lojinha.html`)
// ====================================================================

function getEmojiPorProdutoId(idProduto) {
  const prod = produtosLojaCache.find(p => p.id === idProduto);
  return prod ? prod.imagem : "🎁";
}

function carregarVitrine() {
  const grid = document.getElementById('lojaGrid');
  if (!grid) return;
  
  const q = query(collection(db, 'produtos_loja'));
  
  onSnapshot(q, (snap) => {
      produtosLojaCache = [];
      let html = '';

      snap.docs.forEach((docSnap, index) => {
          const produto = { id: docSnap.id, ...docSnap.data() };
          produtosLojaCache.push(produto);

          const delay = index * 0.1; 
          const isEsgotado = produto.estoque <= 0;
          
          const btnText = isEsgotado ? 'Esgotado 🚫' : 'Resgatar Prêmio';
          const btnStyle = isEsgotado ? 'background: #555; cursor: not-allowed; color: #aaa;' : '';
          const cardStyle = isEsgotado ? 'opacity: 0.6; filter: grayscale(0.5);' : '';
          const disableAttr = isEsgotado ? 'disabled' : '';

          // CORREÇÃO: normaliza a URL da imagem do produto
          const imgNormalizada = normalizarUrlImagem(produto.imagem);

          let imgRenderizada = '';
          let imgEstiloContainer = '';
          if (imgNormalizada) {
              imgRenderizada = `<img 
                src="${escapeHTML(imgNormalizada)}" 
                alt="${escapeHTML(produto.nome)}" 
                referrerpolicy="no-referrer"
                onerror="this.parentElement.innerHTML='${escapeHTML(produto.imagem || '🎁')}'"
                style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
              imgEstiloContainer = 'padding: 0; overflow: hidden; border: none; background: transparent;';
          } else {
              imgRenderizada = escapeHTML(produto.imagem || '🎁');
          }

          html += `
              <div class="produto-card" style="animation-delay: ${delay}s; ${cardStyle}">
                  <div class="produto-img" style="${imgEstiloContainer}">
                      ${imgRenderizada}
                  </div>
                  <div class="produto-nome">${escapeHTML(produto.nome)}</div>
                  <div class="produto-desc">${escapeHTML(produto.desc)}</div>
                  <div class="produto-preco">🪙 ${produto.preco}</div>
                  <div class="produto-estoque" style="font-size: 11px; margin-bottom: 10px; color: ${isEsgotado ? '#FF6B6B' : '#4CAF50'};">
                      ${isEsgotado ? 'Sem estoque' : `Disponível: ${produto.estoque}`}
                  </div>
                  <button class="btn-comprar" style="${btnStyle}" onclick="window.realizarResgate('${produto.id}')" id="btn-${produto.id}" ${disableAttr}>
                      ${btnText}
                  </button>
              </div>
          `;
      });
      grid.innerHTML = html;
  });
}

window.abrirRecibo = function(imagem, nomeItem, nomeColab, valor, dataStr, idPedido) {
  const modal = document.getElementById('reciboModal');
  if(!modal) return;
  
  const iconEl = document.getElementById('reciboIcon');
  // CORREÇÃO: normaliza também a imagem do recibo
  const imgNorm = normalizarUrlImagem(imagem);
  if (imgNorm) {
      iconEl.innerHTML = `<img src="${imgNorm}" referrerpolicy="no-referrer" style="width:40px; height:40px; object-fit:cover; border-radius:6px; display:block;">`;
  } else {
      iconEl.innerHTML = imagem;
  }
  
  document.getElementById('reciboItem').textContent = nomeItem;
  document.getElementById('reciboNome').textContent = nomeColab;
  document.getElementById('reciboValor').textContent = valor + ' 🪙';
  document.getElementById('reciboData').textContent = dataStr;
  document.getElementById('reciboId').textContent = '#' + idPedido.substring(0, 8).toUpperCase();
  modal.style.display = 'flex';
}

window.carregarHistoricoPedidos = async function() {
  if(!currentUser) return;
  const lista = document.getElementById('listaMeusPedidos');
  if (!lista) return;
  lista.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.5;">Buscando seus resgates...</td></tr>';
  
  try {
      const q = query(
          collection(db, "pedidos_lojinha"), 
          where("colaboradorEmail", "==", currentUser.email.toLowerCase())
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
          lista.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.5;">Você ainda não resgatou nenhum prêmio.</td></tr>';
          return;
      }

      const pedidos = [];
      snap.forEach(docSnap => {
          pedidos.push({ id: docSnap.id, ...docSnap.data() });
      });

      pedidos.sort((a, b) => {
          const timeA = a.dataPedido ? a.dataPedido.seconds : 0;
          const timeB = b.dataPedido ? b.dataPedido.seconds : 0;
          return timeB - timeA;
      });

      let html = '';
      pedidos.forEach(pedido => {
          const dataTimestamp = pedido.dataPedido ? new Date(pedido.dataPedido.seconds * 1000) : new Date();
          const dataFormatada = dataTimestamp.toLocaleDateString('pt-BR') + ' às ' + dataTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          const isPendente = pedido.status === "Pendente";
          const statusClass = isPendente ? "status-pendente" : "status-entregue";
          const emojiProduto = getEmojiPorProdutoId(pedido.produtoId);
          const idFormatado = '#' + pedido.id.substring(0, 8).toUpperCase();

          html += `
              <tr>
                  <td>${dataTimestamp.toLocaleDateString('pt-BR')}</td>
                  <td><span style="font-family: monospace; font-size: 11px; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 4px 6px; border-radius: 4px;">${idFormatado}</span></td>
                  <td>${escapeHTML(pedido.produtoNome)}</td>
                  <td><span style="color:#FFD700; font-weight:bold;">${pedido.valorPago} 🪙</span></td>
                  <td><span class="status-badge ${statusClass}">${escapeHTML(pedido.status)}</span></td>
                  <td>
                      <button class="btn-ver-recibo" onclick="window.abrirRecibo('${emojiProduto}', '${escapeHTML(pedido.produtoNome)}', '${escapeHTML(pedido.colaboradorNome)}', ${pedido.valorPago}, '${dataFormatada}', '${pedido.id}')">
                          Ver Recibo
                      </button>
                  </td>
              </tr>
          `;
      });
      lista.innerHTML = html;
  } catch(e) {
      console.error("Erro ao puxar histórico", e);
      lista.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Erro ao carregar pedidos. Tente atualizar a página.</td></tr>';
  }
}

window.realizarResgate = async function(idProduto) {
  if (!currentUser) return;
  
  const lojaAberta = true; 
  if (!lojaAberta) {
      alert("🔒 A loja está fechada! Aguarde a janela de resgate definida pela gestão (geralmente na primeira semana do mês).");
      return;
  }

  const produto = produtosLojaCache.find(p => p.id === idProduto);
  if (!produto) return;

  if (produto.estoque <= 0) {
      alert(`O item "${produto.nome}" esgotou! Fique de olho na próxima reposição.`);
      return;
  }

  if (saldoAtualUsuario < produto.preco) {
      alert(`Você tem ${saldoAtualUsuario} moedas. Faltam ${produto.preco - saldoAtualUsuario} moedas para resgatar "${produto.nome}". Continue engajando!`);
      return;
  }

  if (!confirm(`Deseja confirmar o resgate de "${produto.nome}" por ${produto.preco} moedas?`)) return;

  const btn = document.getElementById(`btn-${produto.id}`);
  if (btn) {
      btn.textContent = "Processando...";
      btn.disabled = true;
  }

  try {
      const userEmail = currentUser.email.toLowerCase();
      const userName = currentUser.displayName || 'Colaborador';
      const userRef = doc(db, "usuarios", userEmail);
      
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
          const userData = userSnap.data();
          
          if (userData.bloqueadoParaResgate) {
              const motivo = userData.motivoBloqueio || "Inconsistência na monitoria ou advertência ativa.";
              alert(`🚫 Operação Bloqueada: Você não está elegível para resgates neste ciclo.\n\nMotivo: ${motivo}`);
              if (btn) {
                  btn.textContent = "Resgatar Prêmio";
                  btn.disabled = false;
              }
              return;
          }
      }

      const produtoRef = doc(db, "produtos_loja", produto.id);

      await updateDoc(produtoRef, { estoque: increment(-1) });
      await updateDoc(userRef, { pontos: increment(-produto.preco) });

      const pedidoRef = await addDoc(collection(db, "pedidos_lojinha"), {
          colaboradorNome: userName,
          colaboradorEmail: userEmail,
          produtoId: produto.id,
          produtoNome: produto.nome,
          valorPago: produto.preco,
          status: "Pendente",
          dataPedido: serverTimestamp()
      });

      await addDoc(collection(db, "historico_pontos"), {
          adminNome: "Sistema (Lojinha)",
          colaborador: userEmail,
          tipoOperacao: "Resgate",
          valor: produto.preco,
          motivo: `Resgate de Prêmio: ${produto.nome}`,
          dataRealizada: serverTimestamp()
      });

      saldoAtualUsuario -= produto.preco;
      if (document.getElementById('valSaldoGlobal')) document.getElementById('valSaldoGlobal').textContent = saldoAtualUsuario;
      if (document.getElementById('valSaldoMobile')) document.getElementById('valSaldoMobile').textContent = saldoAtualUsuario;

      const dataAgora = new Date();
      const dataStr = dataAgora.toLocaleDateString('pt-BR') + ' às ' + dataAgora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      
      alert(`🎉 Sucesso! Você acabou de resgatar o prêmio "${produto.nome}".`);

      window.abrirRecibo(produto.imagem, produto.nome, userName, produto.preco, dataStr, pedidoRef.id);

      if (document.getElementById('meusPedidosSection') && document.getElementById('meusPedidosSection').style.display === 'block') {
          if (window.carregarHistoricoPedidos) window.carregarHistoricoPedidos();
      }

  } catch (e) {
      console.error("Erro no resgate:", e);
      alert("Ocorreu um erro na conexão ou o item esgotou antes de você finalizar. Tente novamente.");
  } finally {
      if (btn) {
          btn.textContent = "Resgatar Prêmio";
          btn.disabled = false;
      }
  }
};


// ====================================================================
// 8. DELEGAÇÃO DE EVENTOS GLOBAIS
// ====================================================================
document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!target) return;

  if (target.classList.contains('btn-entregar')) {
    const pedidoId = target.getAttribute('data-id');
    if (pedidoId) await darBaixaPedido(pedidoId);
  }

  const btnApagarNf = target.closest('.btn-apagar-nf');
  if (btnApagarNf) {
    const nfId = btnApagarNf.getAttribute('data-id');
    if (nfId) await apagarNF(nfId);
  }
  
  const btnApagarPost = target.closest('.btn-apagar-post');
  if (btnApagarPost) {
    const postId = btnApagarPost.getAttribute('data-id');
    if (postId && confirm("Tem certeza que deseja apagar esta publicação?")) {
        try { 
            await deleteDoc(doc(db, 'timeline_posts', postId)); 
        } catch (err) { 
            console.error("Erro ao apagar post:", err);
            alert("Erro ao excluir. Verifique suas permissões."); 
        }
    }
  }

  const btnApagarAviso = target.closest('.btn-deletar-aviso');
  if (btnApagarAviso) {
    const avisoId = btnApagarAviso.getAttribute('data-id');
    if (avisoId && confirm("Apagar este aviso permanentemente?")) {
        try { 
            await deleteDoc(doc(db, 'avisos', avisoId)); 
        } catch (err) { 
            console.error("Erro ao apagar aviso:", err); 
        }
    }
  }
});

// ====================================================================
// 9. AUTENTICAÇÃO E GERENCIAMENTO DE ESTADO / PONTOS
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
    const saldoMobEl = document.getElementById('valSaldoMobile');

    if (userSnap.exists()) {
        const dados = userSnap.data();
        let moedasAtuais = dados.pontos || 0;
        
        if (saldoEl) saldoEl.textContent = moedasAtuais;
        if (saldoMobEl) saldoMobEl.textContent = moedasAtuais;
        saldoAtualUsuario = moedasAtuais;

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
            saldoAtualUsuario = moedasAtuais;
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
        saldoAtualUsuario = 50;
        alert("Bem-vindo(a) ao CX Resolve! Você acaba de receber 50 moedas para começar! 🪙");
    }
  } catch (err) { console.error("Erro ao sincronizar saldo.", err); }
}

onAuthStateChanged(auth, async user => {
  if (user && user.email.endsWith('@leveros.com.br')) {
    currentUser = user;
    const emailLogado = user.email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLogado);

    const paginasAdminIDs = ['admin-content', 'admin-logs-content', 'admin-pontos-content', 'centro-custo-content', 'admin-loja-content'];
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

    const loginError = document.getElementById('loginError');
    const loginArea = document.getElementById('login-area');
    
    const lojinhaContent = document.getElementById('lojinha-content');
    const conteudoArea = document.getElementById('conteudo') || 
                         document.getElementById('timeline-content') || 
                         document.getElementById('informativos-content') || 
                         document.getElementById('materiais-content') || 
                         lojinhaContent ||
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

    const myAvatar = document.getElementById('myAvatarGlobal');
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
    
    if (lojinhaContent) {
      carregarVitrine();
    }

    if (document.getElementById('logsContainer') && isAdmin) carregarLogsAdmin();
    if (document.getElementById('listaPedidos') && isAdmin) carregarPedidosAdmin(); 
    
    if (document.getElementById('tabelaMatriz') && isAdmin) {
      let totalTemp = 0;
      for (let cat in ORCAMENTO_TEMPORADA) { totalTemp += ORCAMENTO_TEMPORADA[cat]; }
      const elemTemp = document.getElementById('cardOrcamentoTemp');
      if (elemTemp) elemTemp.textContent = formatarMoeda(totalTemp);
      
      carregarDadosOrcamento();
    }

    if (document.getElementById('feedListGlobal') || lojinhaContent) {
      if(window.carregarFeed) window.carregarFeed(isAdmin);
      if(window.carregarRanking) window.carregarRanking();
      if(window.carregarTickerDiario) window.carregarTickerDiario();
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
const logoutBtnGlobal = document.getElementById('logoutBtnGlobal');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
if (logoutBtnGlobal) logoutBtnGlobal.onclick = logout;
if (logoutBtnMobile) logoutBtnMobile.onclick = logout;
