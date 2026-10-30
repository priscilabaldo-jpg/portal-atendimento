// View: Quadro (kanban).
import { PRIO_META, STATUS, STATUS_META } from './constants.js';
import { avatar, badgeSituacao, chipProjeto, getMembro, getOrigemTarefa, optionsMembros, optionsProjetos, situacao } from './helpers.js';
import { state } from './state.js';
import { podeAtuar } from './tarefas-permissoes.js';
import { esc, fmtBR, primeiroNome, tsMillis } from './utils.js';

function tarefasFiltradas() {
    const { projeto, resp, q, sit } = state.filtros;
    const termo = q.trim().toLowerCase();
    return state.tarefas.filter(t =>
        (!projeto || t.projetoId === projeto || t.dorId === projeto) &&
        (!resp || t.responsavelEmail === resp) &&
        (!sit || (sit === 'abertas' ? t.status !== 'Validado' : situacao(t).key === sit)) &&
        (!termo || `${t.titulo} ${t.descricao || ''}`.toLowerCase().includes(termo)));
}

function cardTarefa(t) {
    const p = getOrigemTarefa(t);
    const pr = PRIO_META[t.prioridade] || PRIO_META['Média'];
    return `<div class="task-card bg-white p-3 rounded-lg border border-gray-200 flex flex-col gap-2" draggable="${podeAtuar(t) ? 'true' : 'false'}" style="${podeAtuar(t) ? '' : 'cursor:pointer'}" data-action="abrir-tarefa" data-id="${esc(t.id)}">
        <div class="flex items-center justify-between gap-2">${chipProjeto(p)}<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${pr.cls}" title="Prioridade ${esc(t.prioridade || 'Média')}"><i class="fas ${pr.icon}"></i></span></div>
        <h4 class="font-bold text-sm text-gray-800 leading-snug">${esc(t.titulo)}</h4>
        ${t.descricao ? `<p class="text-xs text-gray-500 line-clamp-2">${esc(t.descricao.substring(0, 90))}${t.descricao.length > 90 ? '…' : ''}</p>` : ''}
        <div class="flex items-center justify-between flex-wrap gap-1">${badgeSituacao(t, false)}<span class="text-[11px] text-gray-500"><i class="far fa-calendar mr-1"></i>${fmtBR(t.prazo)}</span></div>
        <div class="flex items-center justify-between border-t pt-2 mt-1">
            <div class="flex items-center gap-1.5 text-xs text-leveros-verde2 font-semibold">${avatar(t.responsavelEmail, 'w-6 h-6 text-[10px]')}${esc(primeiroNome(getMembro(t.responsavelEmail).nome))}</div>
            <span class="text-[11px] text-gray-400">${(t.colaboradoresEmails || []).length ? `<span title="Apoio" class="mr-2"><i class="fas fa-user-group mr-1"></i>${t.colaboradoresEmails.length}</span>` : ''}${podeAtuar(t) ? '' : '<i class="fas fa-lock mr-2" title="Somente leitura/comentário"></i>'}<i class="far fa-comment mr-1"></i>${t.comentariosCount || 0}</span>
        </div>
    </div>`;
}

export function boardHTML() {
    const lista = tarefasFiltradas();
    return `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">${STATUS.map(s => {
        const m = STATUS_META[s];
        const ts = lista.filter(t => t.status === s).sort(s === 'Validado'
            ? (a, b) => tsMillis(b.atualizadoEm) - tsMillis(a.atualizadoEm)
            : (a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
        return `<div class="bg-gray-50 rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col" data-drop="${s}">
            <div class="flex items-center justify-between mb-3 pb-2 border-b-2 ${m.border}">
                <h2 class="font-bold text-gray-700 flex items-center gap-2"><i class="fas ${m.icon} ${m.txt}"></i> ${s === 'Validado' ? 'Validados' : s === 'Pendente' ? 'Pendentes' : s}</h2>
                <span class="${m.badge} text-xs font-bold px-2 py-1 rounded-full">${ts.length}</span>
            </div>
            <div class="flex flex-col gap-2.5 min-h-[200px]">${ts.map(cardTarefa).join('') || '<p class="text-xs text-gray-400 text-center py-6">Arraste tarefas para cá</p>'}</div>
        </div>`;
    }).join('')}</div>`;
}

export function quadroHTML() {
    const f = state.filtros;
    return `<div>
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div><h2 class="text-2xl font-bold text-leveros-verde1">Quadro de Atividades</h2><p class="text-sm text-gray-500">Visão compartilhada: todos acompanham o andamento de todos. Só o responsável (e Apoio) altera a tarefa; os demais comentam ou enviam uma solicitação.</p></div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-3 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div><label class="lbl">Buscar</label><input id="f-q" class="inp" placeholder="Título ou descrição..." value="${esc(f.q)}"></div>
            <div><label class="lbl">Projeto</label><select id="f-projeto" class="inp"><option value="">Todos</option>${optionsProjetos(f.projeto, false)}</select></div>
            <div><label class="lbl">Responsável</label><select id="f-resp" class="inp"><option value="">Todos</option>${optionsMembros(f.resp)}</select></div>
            <div><label class="lbl">Situação</label><select id="f-sit" class="inp">${[['', 'Todas'], ['abertas', 'Abertas'], ['atrasada', '🔴 Atrasadas'], ['breve', '🟡 Entrega em breve'], ['ok', '🟢 No prazo'], ['concluida', '✅ Concluídas']].map(([v, l]) => `<option value="${v}" ${f.sit === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="flex gap-2"><button data-action="filtro-minhas" class="flex-1 px-3 py-2 text-sm font-semibold border border-leveros-verde2 text-leveros-verde2 rounded-lg hover:bg-leveros-verde4/40">Só as minhas</button><button data-action="limpar-filtros" class="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50" title="Limpar filtros"><i class="fas fa-eraser"></i></button></div>
        </div>
        <div id="board">${boardHTML()}</div>
    </div>`;
}
