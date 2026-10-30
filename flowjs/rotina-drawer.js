// Rotina Diária — visão completa da atividade (painel lateral) + comentários.
import { addDoc, collection, db, deleteDoc, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from './firebase.js';
import { STATUS_ROTINA, STATUS_ROTINA_META } from './constants.js';
import { avatar, getMembro, toast } from './helpers.js';
import { fecharModal } from './modals.js';
import { blocoDataRotina, btnRotina, renderPrazoRotina, textoSobreCor, urlExterna } from './rotina-card.js';
import { catDe, catMeta, podeEditarRotina, podeGerirRotina, rotinaColabs, rotinaConcluida, situacaoRotina } from './rotina-data.js';
import { state } from './state.js';
import { apagarEmLotes } from './tarefas-acoes.js';
import { fecharDrawer, feedItemHTML } from './tarefas-drawer.js';
import { $, esc, fmtBR, fmtDataHora, primeiroNome, tsMillis } from './utils.js';

// Comentários ficam na subcoleção Firestore  rotinas/{id}/comentarios  (mesmo formato das tarefas).

const comentariosRef = (id) => collection(db, 'rotinas', id, 'comentarios');

async function logRotina(id, texto, tipo = 'sistema') {
    await addDoc(comentariosRef(id), { tipo, texto, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp() });
}

function cabecalhoRotinaHTML(r) {
    const s = situacaoRotina(r);
    const badge = {
        concluida: ['bg-gray-100 text-gray-600 border-gray-200', '✅ Finalizada'],
        atrasada: ['bg-red-100 text-red-700 border-red-200', '🔴 Atrasada'],
        hoje: ['bg-yellow-100 text-yellow-800 border-yellow-300', '🟡 Vence hoje'],
        aberta: ['bg-blue-100 text-blue-700 border-blue-200', '🔵 Em aberto']
    }[s];
    const cor = r.cor || '#9ca3af';
    return `
        <div class="flex items-center gap-2 min-w-0 flex-wrap">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border" style="background:${cor}1A;color:${textoSobreCor(cor)};border-color:${cor}66"><i class="fas ${catMeta(catDe(r)).icon} mr-1"></i>${esc(catDe(r))}</span>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge[0]}">${badge[1]}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
            ${podeEditarRotina(r) ? btnRotina('editar-rotina', r.id, 'hover:text-leveros-verde2 hover:bg-leveros-verde4/40', 'Editar atividade', 'fa-edit') : ''}
            ${podeGerirRotina(r) ? btnRotina('excluir-rotina', r.id, 'hover:text-red-500 hover:bg-red-50', 'Excluir atividade', 'fa-trash') : ''}
            <button data-action="fechar-drawer" class="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-200" title="Fechar"><i class="fas fa-times"></i></button>
        </div>`;
}

function infoRotinaHTML(r) {
    const editar = podeEditarRotina(r), concluido = rotinaConcluida(r), colabs = rotinaColabs(r);
    const campo = (rotulo, icon, valor, extra = '') => `<div class="${extra}"><div class="lbl"><i class="fas ${icon} mr-1 text-gray-400"></i>${rotulo}</div><div class="text-sm text-gray-800 break-words">${valor}</div></div>`;
    const texto = (rotulo, icon, valor) => valor ? `<div class="mt-4"><div class="lbl"><i class="fas ${icon} mr-1 text-gray-400"></i>${rotulo}</div><div class="text-sm text-gray-800 whitespace-pre-line break-words bg-gray-50 border border-gray-100 rounded-lg p-3">${esc(valor)}</div></div>` : '';
    const pessoa = (email, papel) => `<span class="inline-flex items-center gap-1.5 bg-gray-100 rounded-full pl-1 pr-2.5 py-1 text-xs">${avatar(email, 'w-5 h-5 text-[9px]')}<span class="font-semibold">${esc(primeiroNome(getMembro(email).nome))}</span><span class="text-gray-400">${papel}</span></span>`;
    const statusSel = editar
        ? `<select id="rt-status" class="inp !py-1.5">${STATUS_ROTINA.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`
        : `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_ROTINA_META[r.status] || ''}">${esc(r.status)}</span>`;

    return `
        <div class="flex items-start gap-3 mb-4">
            <button data-action="rotina-toggle-status" data-id="${esc(r.id)}" class="mt-0.5 shrink-0 text-3xl transition-transform hover:scale-110 ${concluido ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}" title="${concluido ? 'Reabrir' : 'Marcar como concluída'}"><i class="fas ${concluido ? 'fa-check-circle' : 'fa-circle'}"></i></button>
            <h3 class="text-xl font-bold leading-snug ${concluido ? 'line-through text-gray-400' : 'text-leveros-verde1'} break-words min-w-0">${esc(r.titulo || r.descricao)}</h3>
        </div>
        <div class="flex items-center gap-3 flex-wrap mb-4">${blocoDataRotina(r, concluido)}${renderPrazoRotina(r)}</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
            ${campo('Responsável', 'fa-user', `<span class="inline-flex items-center gap-1.5">${avatar(r.responsavelEmail, 'w-6 h-6 text-[10px]')}${esc(getMembro(r.responsavelEmail).nome)}</span>`)}
            <div><div class="lbl"><i class="fas fa-flag mr-1 text-gray-400"></i>Status</div>${statusSel}</div>
            ${campo('Data inicial', 'fa-play', fmtBR(r.data))}
            ${campo('Prazo', 'fa-calendar', r.status === 'Continua' ? 'Contínua (sem data final)' : fmtBR(r.prazo))}
            ${r.acesso ? campo('Link de acesso', 'fa-link', `<a data-action="noop" href="${esc(urlExterna(r.acesso))}" target="_blank" rel="noopener" class="text-leveros-verde2 font-semibold hover:underline break-all">${esc(r.acesso)}</a>`, 'col-span-2') : ''}
        </div>
        ${texto('Descrição', 'fa-align-left', r.descricao && r.titulo ? r.descricao : '')}
        ${texto('Observação', 'fa-note-sticky', r.observacao)}
        <div class="mt-4"><div class="lbl"><i class="fas fa-user-group mr-1 text-gray-400"></i>Equipe</div>
            <div class="flex flex-wrap gap-2">${pessoa(r.responsavelEmail, 'responsável')}${colabs.map(e => pessoa(e, 'apoio')).join('')}</div></div>
        <p class="text-[11px] text-gray-400 mt-4">Criada por ${esc(getMembro(r.criadoPorEmail || r.responsavelEmail).nome)}${r.criadoEm ? ` em ${fmtDataHora(tsMillis(r.criadoEm))}` : ''}</p>`;
}

export function abrirRotinaDrawer(id) {
    const r = state.rotinas.find(x => x.id === id);
    if (!r) return;
    fecharModal();
    if (state.unsubFeed) state.unsubFeed();
    state.drawerTaskId = null;
    state.drawerRotinaId = id;
    $('#drawer-panel').innerHTML = `
        <div id="rt-cab" class="px-5 py-3 border-b flex items-center justify-between gap-2 bg-gray-50 shrink-0">${cabecalhoRotinaHTML(r)}</div>
        <div class="flex-1 overflow-y-auto">
            <div id="rt-info" class="p-5 border-b">${infoRotinaHTML(r)}</div>
            <div class="p-5">
                <h4 class="font-bold text-gray-700 mb-3 text-sm"><i class="far fa-comments text-leveros-verde2 mr-1"></i> Comentários e histórico</h4>
                <div id="feed" class="flex flex-col gap-3 mb-3"><div class="loader" style="width:24px;height:24px;border-width:3px"></div></div>
            </div>
        </div>
        <div class="border-t p-3 bg-white shrink-0">
            <div class="flex gap-2 items-end">
                <textarea id="rt-comentario" rows="2" class="inp resize-none" placeholder="Escreva um comentário... (Enter envia, Shift+Enter quebra linha)"></textarea>
                <button data-action="rotina-comentar" data-id="${esc(id)}" class="h-10 w-10 shrink-0 bg-leveros-azul text-leveros-verde1 rounded-lg hover:bg-leveros-verde3 font-bold" title="Enviar"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>`;
    $('#drawer').classList.remove('hidden');

    state.unsubFeed = onSnapshot(query(comentariosRef(id), orderBy('criadoEm', 'asc')), (snap) => {
        const feed = $('#feed'); if (!feed || state.drawerRotinaId !== id) return;
        const itens = snap.docs.map(x => ({ id: x.id, ...x.data() }));
        feed.innerHTML = itens.length ? itens.map(feedItemHTML).join('') : '<p class="text-xs text-gray-400 text-center py-4">Nenhum comentário ainda. Use este espaço para registrar dúvidas, avanços e combinados.</p>';
        const cont = feed.closest('.overflow-y-auto'); if (cont) cont.scrollTop = cont.scrollHeight;
    }, () => {
        const feed = $('#feed');
        if (feed) feed.innerHTML = '<p class="text-xs text-red-500">Não foi possível carregar os comentários. Verifique se as regras do Firestore liberam a subcoleção rotinas/{id}/comentarios.</p>';
    });
}

// Chamada a cada atualização em tempo real: refaz só o cabeçalho e as informações (não mexe no feed nem no campo de comentário).
export function atualizarDrawerRotina() {
    const r = state.rotinas.find(x => x.id === state.drawerRotinaId);
    if (!r) return fecharDrawer();
    const cab = $('#rt-cab'), info = $('#rt-info');
    if (cab) cab.innerHTML = cabecalhoRotinaHTML(r);
    if (info) info.innerHTML = infoRotinaHTML(r);
}

export async function comentarRotina(id) {
    const ta = $('#rt-comentario'), texto = ta?.value.trim();
    if (!texto) return;
    ta.value = ''; ta.focus();
    try { await logRotina(id, texto, 'comentario'); }
    catch (e) { ta.value = texto; return toast('Não foi possível enviar o comentário (verifique as regras do Firestore).', 'erro'); }
    try { await updateDoc(doc(db, 'rotinas', id), { comentariosCount: increment(1) }); } catch (e) { /* contador é opcional */ }
}

// Finalizar / reabrir (usado pelo check do card e do painel)
export async function alternarConclusaoRotina(id) {
    const r = state.rotinas.find(x => x.id === id); if (!r) return;
    if (!podeEditarRotina(r)) return toast('Você não tem permissão para alterar esta atividade.', 'erro');
    await mudarStatusRotina(id, rotinaConcluida(r) ? 'Não iniciado' : 'Concluído');
}

export async function mudarStatusRotina(id, novo) {
    const r = state.rotinas.find(x => x.id === id);
    if (!r || r.status === novo) return;
    if (!podeEditarRotina(r)) { atualizarDrawerRotina(); return toast('Você não tem permissão para alterar esta atividade.', 'erro'); }
    try {
        await updateDoc(doc(db, 'rotinas', id), { status: novo, atualizadoEm: serverTimestamp() });
        toast(novo === 'Concluído' ? 'Atividade concluída!' : rotinaConcluida(r) ? 'Atividade reaberta.' : 'Status atualizado.');
    } catch (e) { return toast('Erro ao alterar status.', 'erro'); }
    try { await logRotina(id, `alterou o status de "${r.status}" para "${novo}"`); } catch (e) { /* histórico é opcional */ }
}

export async function excluirRotina(id) {
    const r = state.rotinas.find(x => x.id === id);
    if (!r || !podeGerirRotina(r)) return toast('Apenas o responsável pode excluir esta atividade.', 'erro');
    if (!confirm(rotinaColabs(r).length ? 'Esta atividade é compartilhada e será removida também da lista dos Apoios. Excluir?' : 'Excluir esta atividade da rotina?')) return;
    try {
        if (state.drawerRotinaId === id) fecharDrawer();
        try { await apagarEmLotes((await getDocs(comentariosRef(id))).docs.map(d => d.ref)); } catch (e) { /* sem comentários ou sem permissão: segue */ }
        await deleteDoc(doc(db, 'rotinas', id));
        toast('Atividade excluída.');
    } catch (e) { toast('Erro ao excluir atividade.', 'erro'); }
}
