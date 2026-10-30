// Tarefas — colaboração e solicitações ao responsável.
import { addDoc, arrayUnion, collection, db, deleteDoc, doc, serverTimestamp, writeBatch } from './firebase.js';
import { STATUS } from './constants.js';
import { avatar, getMembro, getOrigemTarefa, getTarefa, toast } from './helpers.js';
import { abrirModal, fecharModal } from './modals.js';
import { state } from './state.js';
import { notificarAtribuicao } from './tarefas-acoes.js';
import { ehColaborador, ehResponsavel, podeAtuar, podeEditarTudo } from './tarefas-permissoes.js';
import { $, esc, fmtBR, primeiroNome, tsMillis } from './utils.js';

const solicitacoesDa = (tid) => state.solicitacoes.filter(x => x.tarefaId === tid).sort((a, b) => tsMillis(a.criadoEm) - tsMillis(b.criadoEm));
export const solicitacoesRecebidas = () => state.solicitacoes.filter(x => { if (x.status !== 'pendente') return false; const t = getTarefa(x.tarefaId); return t && ehResponsavel(t); });
const SOL_TIPOS = { prazo: 'Alterar o prazo', status: 'Alterar o status', reatribuir: 'Reatribuir a tarefa', colaboracao: 'Colaborar na tarefa' };

function descSolicitacao(x, t) {
    if (x.tipo === 'prazo') return `alterar o prazo de ${fmtBR(t?.prazo)} para ${fmtBR(x.novoPrazo)}`;
    if (x.tipo === 'status') return `mudar o status de "${t?.status}" para "${x.novoStatus}"`;
    if (x.tipo === 'reatribuir') return `passar a tarefa para ${getMembro(x.novoResponsavelEmail).nome}`;
    if (x.tipo === 'colaboracao') return 'participar desta tarefa como colaborador(a)';
    return 'uma alteração';
}

function solicitacaoItemHTML(x, comTarefa = false) {
    const t = getTarefa(x.tarefaId); if (!t) return '';
    const minha = x.deEmail === state.user.email;
    const pode = podeEditarTudo(t);
    return `<div class="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        ${avatar(x.deEmail, 'w-8 h-8 text-xs')}
        <div class="flex-1 min-w-0 text-sm">
            <div><span class="font-semibold">${esc(minha ? 'Você' : getMembro(x.deEmail).nome)}</span> ${minha ? 'pediu' : 'pede'} para ${esc(descSolicitacao(x, t))}</div>
            ${comTarefa ? `<button data-action="abrir-tarefa" data-id="${esc(t.id)}" class="text-xs text-leveros-verde2 font-semibold hover:underline text-left">${esc(t.titulo)}</button>` : ''}
            ${x.mensagem ? `<div class="text-xs text-gray-600 mt-1 italic">“${esc(x.mensagem)}”</div>` : ''}
            ${!pode ? `<div class="text-[11px] text-gray-400 mt-1">Aguardando resposta de ${esc(getMembro(t.responsavelEmail).nome)}</div>` : ''}
        </div>
        <div class="flex flex-col sm:flex-row gap-1.5 shrink-0">
            ${pode ? `<button data-action="responder-sol" data-id="${esc(x.id)}" data-aceitar="1" class="text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700">Aceitar</button>
            <button data-action="responder-sol" data-id="${esc(x.id)}" data-aceitar="0" class="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100">Recusar</button>` : ''}
            ${minha ? `<button data-action="cancelar-sol" data-id="${esc(x.id)}" class="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">Cancelar</button>` : ''}
        </div>
    </div>`;
}

export function solicitacoesPainelHTML() {
    const rec = solicitacoesRecebidas().sort((a, b) => tsMillis(a.criadoEm) - tsMillis(b.criadoEm));
    const env = state.solicitacoes.filter(x => x.status === 'pendente' && x.deEmail === state.user.email && !rec.includes(x));
    if (!rec.length && !env.length) return '';
    return `<div class="mb-6 flex flex-col gap-4">
        ${rec.length ? `<section><h3 class="font-bold text-yellow-700 mb-2 text-sm">📨 Solicitações aguardando sua resposta <span class="text-gray-400 font-normal">(${rec.length})</span></h3><div class="flex flex-col gap-2">${rec.map(x => solicitacaoItemHTML(x, true)).join('')}</div></section>` : ''}
        ${env.length ? `<section><h3 class="font-bold text-gray-500 mb-2 text-sm">⏳ Suas solicitações pendentes <span class="font-normal">(${env.length})</span></h3><div class="flex flex-col gap-2">${env.map(x => solicitacaoItemHTML(x, true)).join('')}</div></section>` : ''}
    </div>`;
}

export function colabSectionHTML(t) {
    const tudo = podeEditarTudo(t), atuar = podeAtuar(t);
    const colabs = t.colaboradoresEmails || [];
    const todas = solicitacoesDa(t.id);
    const pend = todas.filter(x => x.status === 'pendente');
    const hist = todas.filter(x => x.status !== 'pendente').slice(-3).reverse();
    const candidatos = state.membros.filter(m => m.email !== t.responsavelEmail && !colabs.includes(m.email)).sort((a, b) => a.nome.localeCompare(b.nome));
    const chip = (email, papel, removivel) => `<span class="inline-flex items-center gap-1.5 bg-gray-100 rounded-full pl-1 pr-2.5 py-1 text-xs">${avatar(email, 'w-5 h-5 text-[9px]')}<span class="font-semibold">${esc(primeiroNome(getMembro(email).nome))}</span><span class="text-gray-400">${papel}</span>${removivel ? `<button data-action="remover-colab" data-id="${esc(t.id)}" data-email="${esc(email)}" class="text-gray-400 hover:text-red-500 ml-1" title="Remover colaborador"><i class="fas fa-times"></i></button>` : ''}</span>`;
    return `
        <h4 class="font-bold text-gray-700 mb-3 text-sm"><i class="fas fa-user-group text-leveros-verde2 mr-1"></i> Colaboração</h4>
        <div class="flex flex-wrap gap-2 mb-3">${chip(t.responsavelEmail, 'responsável', false)}${colabs.map(e => chip(e, 'colaborador', tudo)).join('')}</div>
        ${tudo ? `<div class="flex gap-2 mb-3"><select id="dt-add-colab" class="inp"><option value="">Incluir colaborador...</option>${candidatos.map(m => `<option value="${esc(m.email)}">${esc(m.nome)}</option>`).join('')}</select><button data-action="add-colab" data-id="${esc(t.id)}" class="px-3 py-2 text-sm font-semibold bg-leveros-verde2 text-white rounded-lg hover:bg-leveros-verde1 shrink-0">Adicionar</button></div>` : ''}
        ${!tudo ? `<div class="flex gap-2 flex-wrap mb-3">
            ${!atuar ? `<button data-action="solicitar" data-id="${esc(t.id)}" data-tipo="colaboracao" class="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 font-semibold hover:bg-indigo-50"><i class="fas fa-hand mr-1"></i>Pedir para colaborar</button>` : ''}
            <button data-action="solicitar" data-id="${esc(t.id)}" class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"><i class="fas fa-paper-plane mr-1"></i>Solicitar alteração ao responsável</button>
        </div>` : ''}
        ${pend.length ? `<div class="flex flex-col gap-2 mb-2">${pend.map(x => solicitacaoItemHTML(x)).join('')}</div>` : ''}
        ${hist.length ? `<div class="mt-2 text-[11px] text-gray-400 flex flex-col gap-0.5">${hist.map(x => `<div>${x.status === 'aceita' ? '✅' : '🚫'} ${esc(getMembro(x.deEmail).nome)}: ${esc(descSolicitacao(x, t))} — <b>${x.status === 'aceita' ? 'aceita' : 'recusada'}</b></div>`).join('')}</div>` : ''}`;
}

export function modalSolicitacao(tarefaId, tipoInicial = '') {
    const t = getTarefa(tarefaId); if (!t) return;
    const atuar = podeAtuar(t);
    const tipos = atuar ? ['reatribuir'] : ['prazo', 'status', 'reatribuir', 'colaboracao'];
    const tipo = tipos.includes(tipoInicial) ? tipoInicial : tipos[0];
    abrirModal('Solicitar ao responsável', `
        <input type="hidden" id="sl-tarefa" value="${esc(tarefaId)}">
        <p class="text-sm text-gray-600 mb-4">A tarefa <b>${esc(t.titulo)}</b> está com <b>${esc(getMembro(t.responsavelEmail).nome)}</b>. A mudança só será aplicada se ele(a) aceitar.</p>
        <div class="grid gap-4">
            <div><label class="lbl">O que você precisa?</label><select id="sl-tipo" class="inp">${tipos.map(k => `<option value="${k}" ${k === tipo ? 'selected' : ''}>${SOL_TIPOS[k]}</option>`).join('')}</select></div>
            <div id="sl-prazo-wrap"><label class="lbl">Novo prazo</label><input id="sl-prazo" type="date" class="inp" value="${esc(t.prazo || '')}"></div>
            <div id="sl-status-wrap"><label class="lbl">Novo status</label><select id="sl-status" class="inp">${STATUS.map(x => `<option ${x === t.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
            <div id="sl-resp-wrap"><label class="lbl">Passar para</label><select id="sl-resp" class="inp">${state.membros.filter(m => m.email !== t.responsavelEmail).sort((a, b) => a.nome.localeCompare(b.nome)).map(m => `<option value="${esc(m.email)}">${esc(m.nome)}</option>`).join('')}</select></div>
            <div><label class="lbl">Mensagem / justificativa</label><textarea id="sl-msg" rows="3" class="inp" maxlength="500" placeholder="Explique o motivo para facilitar a decisão..."></textarea></div>
        </div>`, 'form-solicitacao', 'Enviar solicitação');
    atualizarCamposSolicitacao();
}

export function atualizarCamposSolicitacao() {
    const tipo = $('#sl-tipo')?.value; if (!tipo) return;
    $('#sl-prazo-wrap').classList.toggle('hidden', tipo !== 'prazo');
    $('#sl-status-wrap').classList.toggle('hidden', tipo !== 'status');
    $('#sl-resp-wrap').classList.toggle('hidden', tipo !== 'reatribuir');
}

export async function criarSolicitacao() {
    const tid = $('#sl-tarefa').value; const t = getTarefa(tid);
    if (!t) throw new Error('Tarefa não encontrada.');
    const tipo = $('#sl-tipo').value;
    const dados = { tarefaId: tid, tipo, deEmail: state.user.email, deNome: state.user.nome, status: 'pendente', mensagem: $('#sl-msg').value.trim(), criadoEm: serverTimestamp() };
    if (tipo === 'prazo') {
        dados.novoPrazo = $('#sl-prazo').value;
        if (!dados.novoPrazo || dados.novoPrazo === t.prazo) throw new Error('Informe um prazo diferente do atual.');
    } else if (tipo === 'status') {
        dados.novoStatus = $('#sl-status').value;
        if (dados.novoStatus === t.status) throw new Error('Escolha um status diferente do atual.');
    } else if (tipo === 'reatribuir') {
        dados.novoResponsavelEmail = $('#sl-resp').value;
        if (!dados.novoResponsavelEmail) throw new Error('Selecione para quem passar a tarefa.');
    } else if (tipo === 'colaboracao' && ehColaborador(t)) throw new Error('Você já colabora nesta tarefa.');
    if (state.solicitacoes.some(x => x.tarefaId === tid && x.deEmail === state.user.email && x.tipo === tipo && x.status === 'pendente')) throw new Error('Você já tem uma solicitação desse tipo pendente nesta tarefa.');
    await addDoc(collection(db, 'solicitacoes'), dados);
    fecharModal(); toast('Solicitação enviada ao responsável.');
}

export async function responderSolicitacao(sid, aceitar) {
    const x = state.solicitacoes.find(v => v.id === sid); const t = x && getTarefa(x.tarefaId);
    if (!x || !t) return;
    if (!podeEditarTudo(t)) return toast('Apenas o responsável pode responder.', 'erro');
    const nomeDe = getMembro(x.deEmail).nome;
    let texto = `${aceitar ? 'aceitou' : 'recusou'} a solicitação de ${nomeDe}: ${descSolicitacao(x, t)}`;
    try {
        const b = writeBatch(db);
        b.update(doc(db, 'solicitacoes', sid), { status: aceitar ? 'aceita' : 'recusada', resolvidoPor: state.user.email, resolvidoEm: serverTimestamp() });
        let novoResp = null;
        if (aceitar) {
            const upd = { atualizadoEm: serverTimestamp() };
            if (x.tipo === 'prazo') {
                upd.prazo = x.novoPrazo;
                upd.historicoPrazos = arrayUnion({ de: t.prazo || '', para: x.novoPrazo, por: x.deEmail, em: Date.now(), motivo: x.mensagem || '' });
            } else if (x.tipo === 'status') upd.status = x.novoStatus;
            else if (x.tipo === 'reatribuir') {
                novoResp = x.novoResponsavelEmail;
                upd.responsavelEmail = novoResp; upd.responsavelNome = getMembro(novoResp).nome;
                upd.colaboradoresEmails = (t.colaboradoresEmails || []).filter(e => e !== novoResp);
            } else if (x.tipo === 'colaboracao') upd.colaboradoresEmails = arrayUnion(x.deEmail);
            b.update(doc(db, 'tarefas', t.id), upd);
        }
        b.set(doc(collection(db, 'tarefas', t.id, 'comentarios')), { tipo: 'sistema', texto, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp() });
        await b.commit();
        toast(aceitar ? 'Solicitação aceita e aplicada.' : 'Solicitação recusada.');
        if (novoResp) await notificarAtribuicao({ ...t, responsavelEmail: novoResp }, getOrigemTarefa(t));
    } catch (e) { /* erro tratado silenciosamente */ toast('Não foi possível responder à solicitação.', 'erro'); }
}

export async function cancelarSolicitacao(sid) {
    try { await deleteDoc(doc(db, 'solicitacoes', sid)); toast('Solicitação cancelada.'); }
    catch (e) { /* erro tratado silenciosamente */ toast('Não foi possível cancelar.', 'erro'); }
}
