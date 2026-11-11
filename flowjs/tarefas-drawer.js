// Tarefas — painel lateral de detalhe + comentários.
import { addDoc, collection, db, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from './firebase.js';
import { PRIORIDADES, STATUS } from './constants.js';
import { avatar, badgeSituacao, chipProjeto, getMembro, getOrigemTarefa, getTarefa, optionsCron, optionsMembros, podeExcluirTarefa, toast } from './helpers.js';
import { fecharModal } from './modals.js';
import { state } from './state.js';
import { permKey, podeAtuar, podeEditarTudo } from './tarefas-permissoes.js';
import { colabSectionHTML } from './tarefas-solicitacoes.js';
import { $, esc, fmtDataHora, primeiroNome, tsMillis } from './utils.js';

export function abrirDrawer(id) {
    const t = getTarefa(id);
    if (!t) return;
    fecharModal();
    state.drawerRotinaId = null;
    state.drawerTaskId = id;
    const p = getOrigemTarefa(t);
    const hist = (t.historicoPrazos || []).length;
    const tudo = podeEditarTudo(t), atuar = podeAtuar(t);
    state.drawerPerm = permKey(t);
    const banner = !atuar
        ? `<div class="mb-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-xs flex items-start gap-2"><i class="fas fa-lock mt-0.5"></i><div>Somente <b>${esc(getMembro(t.responsavelEmail).nome)}</b> (responsável) e colaboradores podem alterar esta tarefa. Você pode comentar ou enviar uma solicitação na seção <b>Colaboração</b>.</div></div>`
        : (!tudo ? `<div class="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg p-3 text-xs flex items-start gap-2"><i class="fas fa-user-group mt-0.5"></i><div>Você é <b>colaborador(a)</b> desta tarefa: pode atualizar status, prazo, prioridade e descrição. Para reatribuir, envie uma solicitação ao responsável.</div></div>` : '');
    $('#drawer-panel').innerHTML = `
        <div class="px-5 py-3 border-b flex items-center justify-between gap-2 bg-gray-50 shrink-0">
            <div class="flex items-center gap-2 min-w-0">${chipProjeto(p)}<span id="dr-situacao">${badgeSituacao(t)}</span></div>
            <div class="flex items-center gap-1">
                ${podeExcluirTarefa(t) ? `<button data-action="excluir-tarefa" data-id="${esc(t.id)}" class="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50" title="Excluir tarefa"><i class="fas fa-trash"></i></button>` : ''}
                <button data-action="fechar-drawer" class="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-200"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="flex-1 overflow-y-auto">
            <div class="p-5 border-b">
                ${banner}
                <input id="dt-titulo" class="w-full text-xl font-bold text-leveros-verde1 border-0 border-b border-transparent hover:border-gray-300 focus:border-leveros-azul focus:outline-none pb-1 mb-4 disabled:bg-transparent" value="${esc(t.titulo)}" maxlength="140" ${atuar ? '' : 'disabled'}>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="lbl">Responsável</label><select id="dt-resp" class="inp" ${tudo ? '' : 'disabled'}>${optionsMembros(t.responsavelEmail)}</select></div>
                    <div><label class="lbl">Status</label><select id="dt-status" class="inp" ${atuar ? '' : 'disabled'}>${STATUS.map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
                    <div><label class="lbl">Prazo</label><input id="dt-prazo" type="date" class="inp" ${atuar ? '' : 'disabled'} value="${esc(t.prazo || '')}"></div>
                    <div><label class="lbl">Prioridade</label><select id="dt-prio" class="inp" ${atuar ? '' : 'disabled'}>${PRIORIDADES.map(s => `<option ${s === (t.prioridade || 'Média') ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
                    ${t.dorId ? '' : `<div class="col-span-2"><label class="lbl">Cronograma</label><select id="dt-cron" class="inp" ${tudo ? '' : 'disabled'}>${optionsCron(t.projetoId, t.cronogramaId)}</select></div>`}
                    <div id="dt-motivo-wrap" class="col-span-2 hidden"><label class="lbl">Motivo da alteração de prazo <span class="font-normal normal-case text-gray-400">(fica registrado no histórico)</span></label><input id="dt-motivo" class="inp bg-yellow-50" placeholder="Ex: aguardando retorno do fornecedor"></div>
                    <div class="col-span-2"><label class="lbl">Descrição</label><textarea id="dt-desc" rows="3" class="inp" ${atuar ? '' : 'disabled'}>${esc(t.descricao || '')}</textarea></div>
                </div>
                <div class="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <span class="text-[11px] text-gray-400">Criada por ${esc(getMembro(t.criadoPorEmail).nome)} em ${t.criadoEm ? fmtDataHora(tsMillis(t.criadoEm)) : '—'}${hist ? ` · prazo alterado ${hist}×` : ''}</span>
                    ${atuar ? `<button data-action="salvar-tarefa" data-id="${esc(t.id)}" class="px-4 py-2 bg-leveros-verde1 text-white rounded-lg hover:leveros-verde2 font-medium text-sm"><i class="fas fa-save mr-1"></i> Salvar alterações</button>` : ''}
                </div>
            </div>

            <!-- NOVA SESSÃO: LINHA DO TEMPO & SUBTAREFAS -->
            <div id="dr-timeline" class="p-5 border-b bg-gray-50/30">
                ${timelineHTML(t)}
            </div>
            
            <div class="p-5 border-b" id="dr-colab">${colabSectionHTML(t)}</div>
            <div class="p-5">
                <h4 class="font-bold text-gray-700 mb-3 text-sm"><i class="far fa-comments text-leveros-verde2 mr-1"></i> Observações e questionamentos</h4>
                <div id="feed" class="flex flex-col gap-3 mb-3"><div class="loader" style="width:24px;height:24px;border-width:3px"></div></div>
            </div>
        </div>
        <div class="border-t p-3 bg-white shrink-0">
            <div class="flex gap-2 items-end">
                <textarea id="dt-comentario" rows="2" class="inp resize-none" placeholder="Escreva uma observação ou pergunta... (Enter envia, Shift+Enter quebra linha)"></textarea>
                <button data-action="enviar-comentario" data-id="${esc(t.id)}" class="h-10 w-10 shrink-0 bg-leveros-azul text-leveros-verde1 rounded-lg hover:bg-leveros-verde3 font-bold" title="Enviar"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>`;
    const d = $('#drawer'); d.classList.remove('hidden');

    if (state.unsubFeed) state.unsubFeed();
    state.unsubFeed = onSnapshot(query(collection(db, 'tarefas', id, 'comentarios'), orderBy('criadoEm', 'asc')), (snap) => {
        const feed = $('#feed'); if (!feed || state.drawerTaskId !== id) return;
        const itens = snap.docs.map(x => ({ id: x.id, ...x.data() }));
        feed.innerHTML = itens.length ? itens.map(feedItemHTML).join('') : '<p class="text-xs text-gray-400 text-center py-4">Nenhuma observação ainda. Use este espaço no lugar das threads de e-mail.</p>';
        const cont = feed.closest('.overflow-y-auto'); if (cont) cont.scrollTop = cont.scrollHeight;
    }, (err) => { $('#feed').innerHTML = '<p class="text-xs text-red-500">Não foi possível carregar o histórico (verifique as regras do Firestore).</p>'; });
}

export function feedItemHTML(c) {
    const quando = fmtDataHora(tsMillis(c.criadoEm));
    if (c.tipo === 'sistema') {
        return `<div id="${c.id}" class="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2"><i class="fas fa-clock-rotate-left mt-0.5 text-gray-400"></i><div><span class="font-semibold">${esc(getMembro(c.autorEmail).nome)}</span> ${esc(c.texto)} <span class="text-gray-400">· ${quando}</span></div></div>`;
    }
    const minha = c.autorEmail === state.user.email;
    return `<div id="${c.id}" class="flex gap-2.5 ${minha ? 'flex-row-reverse' : ''}">
        ${avatar(c.autorEmail, 'w-8 h-8 text-xs')}
        <div class="max-w-[80%] ${minha ? 'bg-leveros-verde4/60' : 'bg-gray-100'} rounded-xl px-3 py-2">
            <div class="text-[11px] font-bold text-leveros-verde2">${esc(getMembro(c.autorEmail).nome)} <span class="text-gray-400 font-normal">· ${quando}</span></div>
            <div class="text-sm text-gray-800 whitespace-pre-wrap break-words">${esc(c.texto)}</div>
        </div></div>`;
}

export function fecharDrawer() {
    state.drawerTaskId = null;
    state.drawerRotinaId = null;
    if (state.unsubFeed) { state.unsubFeed(); state.unsubFeed = null; }
    const d = $('#drawer'); if (d) d.classList.add('hidden');
}

export async function comentarTarefa(id) {
    const ta = $('#dt-comentario'), texto = ta?.value.trim();
    if (!texto) return;
    ta.value = ''; ta.focus();

    let comentarioRef;
    try {
        comentarioRef = await addDoc(collection(db, 'tarefas', id, 'comentarios'), {
            tipo: 'comentario',
            texto: texto,
            autorEmail: state.user.email,
            autorNome: state.user.nome,
            criadoEm: serverTimestamp()
        });
        await updateDoc(doc(db, 'tarefas', id), { comentariosCount: increment(1) });
    } catch (e) {
        ta.value = texto;
        return toast('Não foi possível enviar o comentário.', 'erro');
    }

    const t = getTarefa(id);
    if (t) {
        const pessoasNotificadas = new Set([t.responsavelEmail, ...(t.colaboradoresEmails || []), t.criadoPorEmail]);
        pessoasNotificadas.delete(state.user.email);

        if (pessoasNotificadas.size > 0) {
            const disparos = Array.from(pessoasNotificadas).map(email => 
                addDoc(collection(db, 'notificacoes'), {
                    usuario_destino: email,
                    mensagem: `Nova observação de ${primeiroNome(state.user.nome || state.user.email)} na tarefa "${t.titulo}"`,
                    lida: false,
                    data_criacao: serverTimestamp(),
                    rota: {
                        modulo: 'tarefas',
                        item_id: id,
                        comentario_id: comentarioRef.id 
                    }
                })
            );
            Promise.all(disparos).catch(err => console.error('Erro ao enviar notificações:', err));
        }
    }
}

// ==========================================
// FUNÇÕES DE UI DAS SUBTAREFAS
// ==========================================

export function timelineHTML(t) {
    const subtarefas = t.subtarefas || [];
    
    let html = `
        <h4 class="font-bold text-gray-700 mb-4 text-sm"><i class="fas fa-stream text-leveros-verde2 mr-1"></i> Linha do Tempo & Etapas</h4>
        
        <div class="flex gap-2 mb-6">
            <input type="text" id="input-nova-subtarefa" placeholder="Adicionar nova etapa..." class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-leveros-azul">
            <button data-action="nova-subtarefa" data-tarefa-id="${esc(t.id)}" class="bg-leveros-verde1 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-leveros-verde2 transition-colors">
                Adicionar
            </button>
        </div>

        <div class="relative border-l-2 border-gray-200 ml-3 space-y-5">
            <div class="relative pl-6">
                <div class="absolute w-3 h-3 rounded-full -left-[7px] top-1.5 bg-leveros-azul ring-4 ring-gray-50"></div>
                <p class="text-xs text-gray-500 font-semibold">Tarefa iniciada</p>
            </div>
    `;

    subtarefas.forEach(sub => {
        const isConcluida = sub.status === 'concluida';
        const corBolinha = isConcluida ? 'bg-leveros-verde1' : 'bg-gray-300';
        const checked = isConcluida ? 'checked' : '';
        const textoRiscado = isConcluida ? 'line-through text-gray-400' : 'text-gray-700';

        html += `
            <div class="relative pl-6 flex items-start gap-3 group">
                <div class="absolute w-3 h-3 rounded-full -left-[7px] top-1.5 ${corBolinha} ring-4 ring-gray-50 transition-colors duration-300"></div>
                
                <input type="checkbox" 
                       data-action="toggle-subtarefa" 
                       data-tarefa-id="${esc(t.id)}" 
                       data-sub-id="${esc(sub.id)}" 
                       class="mt-1 w-4 h-4 text-leveros-verde1 rounded border-gray-300 focus:ring-leveros-verde1 cursor-pointer"
                       ${checked}>
                <div class="flex-1">
                    <p class="text-sm font-medium ${textoRiscado}">${esc(sub.titulo)}</p>
                </div>
                
                <!-- Botão de excluir que aparece ao passar o mouse (group-hover) -->
                <button data-action="excluir-subtarefa" data-tarefa-id="${esc(t.id)}" data-sub-id="${esc(sub.id)}" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remover etapa">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

export function atualizarTimelineNoDrawer(id) {
    const container = $('#dr-timeline');
    if (!container) return;
    
    const t = getTarefa(id);
    if (t) {
        container.innerHTML = timelineHTML(t);
    }
}
