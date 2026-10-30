// View: Minhas Tarefas.
import { STATUS_META } from './constants.js';
import { badgeSituacao, chipProjeto, getOrigemTarefa, situacao } from './helpers.js';
import { state } from './state.js';
import { ehColaborador, ehResponsavel } from './tarefas-permissoes.js';
import { solicitacoesPainelHTML } from './tarefas-solicitacoes.js';
import { esc, fmtBR, tsMillis } from './utils.js';

export function minhasHTML() {
    const minhas = state.tarefas.filter(t => ehResponsavel(t) || ehColaborador(t));
    const abertas = minhas.filter(t => t.status !== 'Validado').sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
    const concl = minhas.filter(t => t.status === 'Validado').sort((a, b) => tsMillis(b.atualizadoEm) - tsMillis(a.atualizadoEm));
    const grupos = [
        { key: 'atrasada', titulo: '🔴 Atrasadas', cls: 'text-red-600' },
        { key: 'breve', titulo: '🟡 Entrega em breve (até 2 dias)', cls: 'text-yellow-600' },
        { key: 'ok', titulo: '🟢 No prazo', cls: 'text-green-600' },
        { key: 'sem-prazo', titulo: '⚪ Sem prazo', cls: 'text-gray-500' }
    ];

    const linha = (t) => {
        const acao = t.status === 'Pendente'
            ? `<button data-action="mudar-status" data-id="${esc(t.id)}" data-status="Em Andamento" class="text-xs px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 font-semibold whitespace-nowrap"><i class="fas fa-play mr-1"></i>Iniciar</button>`
            : t.status === 'Em Andamento'
                ? `<button data-action="mudar-status" data-id="${esc(t.id)}" data-status="Validado" class="text-xs px-2.5 py-1 rounded-lg border border-green-400 text-green-700 hover:bg-green-50 font-semibold whitespace-nowrap"><i class="fas fa-check mr-1"></i>Concluir</button>`
                : `<button data-action="mudar-status" data-id="${esc(t.id)}" data-status="Em Andamento" class="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold whitespace-nowrap"><i class="fas fa-rotate-left mr-1"></i>Reabrir</button>`;
        return `<div data-action="abrir-tarefa" data-id="${esc(t.id)}" class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow flex-wrap sm:flex-nowrap">
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800 truncate">${esc(t.titulo)}</div>
                <div class="flex items-center gap-2 mt-1 flex-wrap">${chipProjeto(getOrigemTarefa(t))}
                    <span class="text-[11px] text-gray-500"><i class="far fa-calendar mr-1"></i>${fmtBR(t.prazo)}</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded ${STATUS_META[t.status]?.badge || ''}">${esc(t.status)}</span>
                    ${t.comentariosCount ? `<span class="text-[11px] text-gray-400"><i class="far fa-comment mr-1"></i>${t.comentariosCount}</span>` : ''}
                </div>
            </div>
            ${ehResponsavel(t) ? '' : '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">🤝 Colaboração</span>'}
            ${badgeSituacao(t)}
            ${acao}
        </div>`;
    };

    const blocos = grupos.map(g => {
        const ts = abertas.filter(t => situacao(t).key === g.key);
        if (!ts.length) return '';
        return `<section class="mb-6"><h3 class="font-bold ${g.cls} mb-2 text-sm">${g.titulo} <span class="text-gray-400 font-normal">(${ts.length})</span></h3><div class="flex flex-col gap-2">${ts.map(linha).join('')}</div></section>`;
    }).join('');

    return `<div>
        <div class="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div><h2 class="text-2xl font-bold text-leveros-verde1">Minhas Tarefas</h2><p class="text-sm text-gray-500">${abertas.length} aberta${abertas.length === 1 ? '' : 's'} (atribuídas a você ou em colaboração).</p></div>
        </div>
        ${solicitacoesPainelHTML()}
        ${blocos || '<div class="bg-white rounded-xl p-10 text-center text-gray-400"><i class="fas fa-mug-hot text-4xl mb-3 text-leveros-azul"></i><p>Você não tem tarefas abertas. Aproveite!</p></div>'}
        ${concl.length ? `<section class="mt-8">
            <button data-action="toggle-concluidas" class="text-sm font-bold text-gray-500 hover:text-gray-700 mb-2"><i class="fas fa-chevron-${state.minhasMostrarConcluidas ? 'down' : 'right'} mr-1"></i>✅ Concluídas (${concl.length})</button>${state.minhasMostrarConcluidas ? `<div class="flex flex-col gap-2">${concl.map(linha).join('')}</div>` : ''}
        </section>` : ''}
    </div>`;
}
