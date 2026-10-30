// Dores Operacionais — telas (KPIs, cards, tabela).
import { agruparDores, dorCorSetor, DORES_COLUNAS, DORES_PRIO, DORES_STATUS, doresFiltradas, dorPrioMeta, dorQuarter, dorStatusMeta, fmtDor, opcoesDe, optsFiltro, qOrd } from './data.js';
import { state } from '../state.js';
import { $, esc } from '../utils.js';

function doresKpisHTML() {
    const n = (fn) => state.dores.filter(fn).length;
    const tile = (rotulo, valor, icon, cor, campo, val) => `
        <button data-action="dor-filtro-rapido" data-campo="${campo}" data-valor="${esc(val)}" class="text-left bg-white border border-gray-200 border-l-4 ${cor} rounded-lg px-3 py-2 hover:shadow-sm transition-shadow">
            <div class="flex items-center justify-between gap-2"><span class="text-[11px] font-semibold text-gray-500 leading-tight">${rotulo}</span><i class="fas ${icon} text-gray-300 text-xs"></i></div>
            <div class="text-xl font-bold text-leveros-verde1 leading-tight">${valor}</div>
        </button>`;
    return `
        ${tile('Total de dores', state.dores.length, 'fa-list-ol', 'border-l-leveros-verde2', 'limpar', '')}
        ${tile('Em aprofundamento', n(d => d.status === 'Em aprofundamento'), 'fa-spinner', 'border-l-yellow-400', 'status', 'Em aprofundamento')}
        ${tile('Não iniciado', n(d => d.status === 'Não iniciado'), 'fa-pause-circle', 'border-l-gray-400', 'status', 'Não iniciado')}
        ${tile('Concluído', n(d => d.status === 'Concluído'), 'fa-check-double', 'border-l-green-500', 'status', 'Concluído')}
        ${tile('Prioridade crítica', n(d => d.prioridade === 'Crítica'), 'fa-triangle-exclamation', 'border-l-red-600', 'prio', 'Crítica')}
        ${tile('Prioridade alta', n(d => d.prioridade === 'Alta'), 'fa-arrow-up', 'border-l-orange-400', 'prio', 'Alta')}`;
}

function cardDorHTML(d) {
    const pm = dorPrioMeta(d.prioridade), sm = dorStatusMeta(d.status);
    return `
    <div role="button" tabindex="0" data-action="dor-ver" data-id="${esc(d.id)}" class="bg-white rounded-lg border border-gray-200 hover:border-leveros-verde2 hover:shadow-md transition cursor-pointer relative pl-4 pr-3 py-3 flex flex-col gap-1.5">
        <span class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${pm.bar}"></span>
        <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span class="font-bold text-gray-500">#${esc(d.codigo || '—')}</span>
            <span class="px-1.5 py-0.5 rounded-full border font-bold ${pm.badge}">${esc(d.prioridade || '—')}</span>
            <span class="ml-auto px-1.5 py-0.5 rounded-full border font-semibold ${sm.badge}"><i class="fas ${sm.icon} mr-1"></i>${esc(d.status || '—')}</span>
        </div>
        <div class="text-[10px] uppercase font-bold tracking-wide text-leveros-verde2 truncate">${esc(d.setor)}${d.direcional ? ' · ' + esc(d.direcional) : ''}</div>
        <h4 class="text-sm font-semibold text-gray-800 leading-snug line-clamp-3">${d.dor ? esc(d.dor) : '<span class="text-gray-400 font-normal">(sem descrição da dor)</span>'}</h4>
        <p class="text-xs text-gray-600 line-clamp-3 whitespace-pre-line"><i class="fas fa-hammer text-blue-400 mr-1"></i>${esc(d.acao)}</p>
        <div class="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-x-3 gap-y-1 text-[11px] text-gray-500 flex-wrap">
            <span class="truncate max-w-full"><i class="fas fa-users mr-1 text-gray-400"></i>${esc(d.squad || '—')}</span>
            <span class="whitespace-nowrap"><i class="far fa-calendar-alt mr-1 text-gray-400"></i>${fmtDor(d.inicio)} → ${fmtDor(d.fim)}</span>
        </div>
    </div>`;
}

const DORES_LARGURAS = { codigo: 'min-w-[64px]', setor: 'min-w-[120px]', direcional: 'min-w-[140px]', dor: 'min-w-[280px]', acao: 'min-w-[300px]', resultado: 'min-w-[300px]', metricaAtual: 'min-w-[160px]', kpi: 'min-w-[240px]', prioridade: 'min-w-[90px]', squad: 'min-w-[180px]', alinhamento: 'min-w-[170px]', inicio: 'min-w-[96px]', fim: 'min-w-[96px]', status: 'min-w-[160px]', obs: 'min-w-[220px]' };

function tabelaDoresHTML(grupos) {
    const linha = (d) => `
        <tr data-action="dor-ver" data-id="${esc(d.id)}" class="border-t border-gray-100 hover:bg-leveros-verde4/30 cursor-pointer align-top">
            ${DORES_COLUNAS.map(c => {
                const v = d[c.k];
                if (c.k === 'prioridade') return `<td class="px-2 py-2"><span class="px-1.5 py-0.5 rounded-full border font-bold text-[11px] whitespace-nowrap ${dorPrioMeta(v).badge}">${esc(v || '—')}</span></td>`;
                if (c.k === 'status') {
                    const lista = DORES_STATUS.includes(v) || !v ? DORES_STATUS : [v, ...DORES_STATUS];
                    return `<td class="px-2 py-2"><select data-action="noop" data-id="${esc(d.id)}" class="dor-status-sel inp !py-1 !px-1.5 !text-xs ${dorStatusMeta(v).badge}">${v ? '' : '<option value="" selected>—</option>'}${lista.map(s => `<option ${s === v ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>`;
                }
                if (c.k === 'inicio' || c.k === 'fim') return `<td class="px-2 py-2 whitespace-nowrap">${fmtDor(v)}</td>`;
                if (c.k === 'codigo') return `<td class="px-2 py-2 font-bold text-gray-600 whitespace-nowrap">${esc(v || '—')}</td>`;
                return `<td class="px-2 py-2 whitespace-pre-line break-words">${esc(v)}</td>`;
            }).join('')}
        </tr>`;
    return `
    <div class="bg-white border border-gray-200 rounded-lg overflow-auto" style="max-height: calc(100vh - 16.5rem)">
        <table class="w-full text-xs text-gray-700 border-collapse">
            <thead><tr>${DORES_COLUNAS.map(c => `<th class="sticky top-0 z-10 bg-leveros-verde1 text-white text-left font-semibold px-2 py-2 ${DORES_LARGURAS[c.k]}">${esc(c.h)}</th>`).join('')}</tr></thead>
            <tbody>
                ${grupos.map(g => (g.titulo ? `<tr><td colspan="${DORES_COLUNAS.length}" class="bg-leveros-verde4/60 text-leveros-verde1 font-bold px-3 py-1.5 text-xs">${esc(g.titulo)} <span class="font-normal text-gray-500">· ${g.itens.length}</span></td></tr>` : '') + g.itens.map(linha).join('')).join('')}
            </tbody>
        </table>
    </div>`;
}

function doresResultadoHTML() {
    if (state.doresErro) return `
        <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
            <b><i class="fas fa-triangle-exclamation mr-1"></i> Não foi possível ler a coleção "dores" no Firestore.</b>
        </div>`;
    if (!state.doresLoaded) return '<div class="text-center py-16"><div class="loader"></div></div>';
    if (!state.dores.length) return `
        <div class="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <i class="fas fa-heart-crack text-4xl text-leveros-azul mb-3"></i>
            <h3 class="font-bold text-leveros-verde1 text-lg">Nenhuma dor cadastrada ainda</h3>
            <p class="text-sm text-gray-500 mt-1 mb-5">Comece cadastrando uma nova.</p>
            <div class="flex justify-center gap-2 flex-wrap">
                <button data-action="dor-nova" class="bg-leveros-amarelo text-leveros-verde1 hover:bg-yellow-400 px-4 py-2 rounded-lg font-semibold text-sm"><i class="fas fa-plus mr-1"></i> Nova dor</button>
            </div>
        </div>`;
    const lista = doresFiltradas();
    if (!lista.length) return '<div class="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">Nenhuma dor encontrada com esses filtros. <button data-action="dor-limpar" class="text-leveros-verde2 font-semibold underline">Limpar filtros</button></div>';
    const grupos = agruparDores(lista);
    if (state.filtros.dores.modo === 'tabela') return tabelaDoresHTML(grupos);
    return grupos.map(g => {
        const cor = state.filtros.dores.grupo === 'setor' ? dorCorSetor(g.titulo) : { bg: '#005A64', fg: '#ffffff' };
        return `
        <section class="mb-4">
            ${g.titulo ? `<div class="flex items-center gap-2 mb-2">
                <span class="px-2.5 py-1 rounded-md text-sm font-bold" style="background:${cor.bg};color:${cor.fg}">${esc(g.titulo)}</span>
                <span class="text-xs text-gray-500">${g.itens.length} ${g.itens.length === 1 ? 'dor' : 'dores'}</span>
                <div class="flex-1 border-t border-gray-200"></div>
            </div>` : ''}
            <div class="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">${g.itens.map(cardDorHTML).join('')}</div>
        </section>`;
    }).join('');
}

function doresContagemHTML() {
    const filtrando = Object.entries(state.filtros.dores).some(([k, v]) => ['q', 'setor', 'prio', 'status', 'quarter'].includes(k) && v);
    return `Mostrando <b>${doresFiltradas().length}</b> de ${state.dores.length}${filtrando ? ' · <button data-action="dor-limpar" class="text-leveros-verde2 font-semibold underline">limpar filtros</button>' : ''}`;
}

export function atualizarDores() {
    if (!$('#dores-root')) return;
    const f = state.filtros.dores;
    $('#dores-kpis').innerHTML = doresKpisHTML();
    $('#dores-resultado').innerHTML = doresResultadoHTML();
    $('#dores-contagem').innerHTML = doresContagemHTML();
    const setSel = (id, html, val) => { const s = $(id); if (s) { s.innerHTML = html; s.value = val; } };
    setSel('#dr-setor', '<option value="">Todos os setores</option>' + optsFiltro(opcoesDe(d => d.setor), f.setor), f.setor);
    setSel('#dr-quarter', '<option value="">Todos os quarters</option>' + optsFiltro(opcoesDe(dorQuarter).sort((a, b) => qOrd(a) - qOrd(b)), f.quarter), f.quarter);
    const q = $('#dr-q'); if (q && document.activeElement !== q) q.value = f.q;
    ['prio', 'status', 'grupo'].forEach(k => { const s = $('#dr-' + k); if (s) s.value = f[k]; });
    document.querySelectorAll('[data-action=dor-modo]').forEach(b => {
        const ativo = b.dataset.modo === f.modo;
        b.classList.toggle('bg-leveros-verde1', ativo); b.classList.toggle('text-white', ativo);
        b.classList.toggle('text-gray-600', !ativo);
    });
}

export function doresOperacionaisHTML() {
    const f = state.filtros.dores;
    const btnModo = (modo, icon, rot) => `<button data-action="dor-modo" data-modo="${modo}" class="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${f.modo === modo ? 'bg-leveros-verde1 text-white' : 'text-gray-600'}"><i class="fas ${icon}"></i> ${rot}</button>`;
    return `
    <div id="dores-root">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
                <h2 class="text-xl font-bold text-leveros-verde1 leading-tight">Dores Operacionais</h2>
                <p class="text-xs text-gray-500">Cronograma de priorização de projetos · atualizado em tempo real para todo o time</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <button data-action="dor-nova" class="bg-leveros-amarelo text-leveros-verde1 hover:bg-yellow-400 px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"><i class="fas fa-plus"></i> Nova dor</button>
                <button data-action="dor-importar" title="Importar novas dores de uma planilha Excel" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"><i class="fas fa-file-import text-leveros-verde2"></i> Importar Excel</button>
                <button data-action="dor-exportar" title="Exportar tudo para Excel" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 w-9 h-9 rounded-lg flex items-center justify-center"><i class="fas fa-file-excel text-green-600"></i></button>
                <button data-action="dor-modelo" title="Baixar planilha modelo (para preencher várias dores de uma vez)" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 w-9 h-9 rounded-lg flex items-center justify-center"><i class="fas fa-table-list text-gray-500"></i></button>
                <input type="file" id="dor-file" accept=".xlsx,.xls,.csv" class="hidden">
            </div>
        </div>

        <div id="dores-kpis" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">${doresKpisHTML()}</div>

        <div class="bg-white border border-gray-200 rounded-lg p-2 mb-3 flex flex-wrap items-center gap-2">
            <div class="relative flex-1 min-w-[200px]"><i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i><input id="dr-q" class="inp !pl-8 !py-1.5" placeholder="Buscar em qualquer campo (dor, ação, KPI, observações...)" value="${esc(f.q)}"></div>
            <select id="dr-setor" class="inp !w-auto !py-1.5"><option value="">Todos os setores</option>${optsFiltro(opcoesDe(d => d.setor), f.setor)}</select>
            <select id="dr-prio" class="inp !w-auto !py-1.5"><option value="">Toda prioridade</option>${optsFiltro(DORES_PRIO, f.prio)}</select>
            <select id="dr-status" class="inp !w-auto !py-1.5"><option value="">Todo status</option>${optsFiltro(DORES_STATUS, f.status)}</select>
            <select id="dr-quarter" class="inp !w-auto !py-1.5"><option value="">Todos os quarters</option>${optsFiltro(opcoesDe(dorQuarter).sort((a, b) => qOrd(a) - qOrd(b)), f.quarter)}</select>
            <select id="dr-grupo" title="Agrupar por" class="inp !w-auto !py-1.5">
                ${[['setor', 'Agrupar: Setor'], ['prioridade', 'Agrupar: Prioridade'], ['status', 'Agrupar: Status'], ['quarter', 'Agrupar: Quarter'], ['nenhum', 'Sem agrupamento']].map(([v, r]) => `<option value="${v}" ${f.grupo === v ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
            <div class="flex border border-gray-300 rounded-lg overflow-hidden shrink-0">${btnModo('cards', 'fa-table-cells-large', 'Cards')}${btnModo('tabela', 'fa-table', 'Tabela')}</div>
        </div>
        <div id="dores-contagem" class="text-xs text-gray-500 mb-2 px-1">${doresContagemHTML()}</div>

        <div id="dores-resultado">${doresResultadoHTML()}</div>
    </div>`;
}
