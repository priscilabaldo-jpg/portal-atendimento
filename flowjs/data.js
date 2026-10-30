// Dores Operacionais — constantes, helpers, tempo real e filtros.
import { collection, db, onSnapshot } from '../firebase.js';
import { PALETA } from '../constants.js';
import { isAdmin } from '../helpers.js';
import { render } from '../render.js';
import { state } from '../state.js';
import { esc, fmtBR, hash, tsMillis } from '../utils.js';

export const DORES_COLUNAS = [
    { k: 'codigo',       h: 'ID' },
    { k: 'setor',        h: 'Setor' },
    { k: 'direcional',   h: 'DIRECIONAL' },
    { k: 'dor',          h: 'DOR' },
    { k: 'acao',         h: 'AÇÃO' },
    { k: 'resultado',    h: 'Resultado Esperado (menor → maior ganho)' },
    { k: 'metricaAtual', h: 'Métrica Atual (do problema)' },
    { k: 'kpi',          h: 'KPI de Sucesso' },
    { k: 'prioridade',   h: 'Prioridade' },
    { k: 'squad',        h: 'Quarter & Squad de Destino' },
    { k: 'alinhamento',  h: 'Alinhamento "4 por 100"' },
    { k: 'inicio',       h: 'Início' },
    { k: 'fim',          h: 'Fim Estimado' },
    { k: 'status',       h: 'Status' },
    { k: 'obs',          h: 'Observações' }
];
export const DORES_PRIO = ['Crítica', 'Alta', 'Média', 'Baixa'];
export const DORES_STATUS = ['Em aprofundamento', 'Não iniciado', 'Concluído'];
const DORES_NEUTRO = 'bg-gray-100 text-gray-600 border-gray-200';
const DORES_PRIO_META = {
    'Crítica': { badge: 'bg-red-600 text-white border-red-700', bar: 'bg-red-600', ord: 0 },
    'Alta':    { badge: 'bg-orange-100 text-orange-800 border-orange-200', bar: 'bg-orange-400', ord: 1 },
    'Média':   { badge: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'bg-blue-400', ord: 2 },
    'Baixa':   { badge: DORES_NEUTRO, bar: 'bg-gray-300', ord: 3 }
};
const DORES_STATUS_META = {
    'Em aprofundamento': { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'fa-spinner', ord: 0 },
    'Não iniciado':      { badge: DORES_NEUTRO, icon: 'fa-pause-circle', ord: 1 },
    'Concluído':         { badge: 'bg-green-100 text-green-700 border-green-200', icon: 'fa-check-double', ord: 2 }
};
export const SETORES_PADRAO = ['Atendimento', 'CX', 'Logística', 'Logística Reversa', 'T&D', 'Garantia'];
export const dorPrioMeta = (p) => DORES_PRIO_META[p] || { badge: DORES_NEUTRO, bar: 'bg-gray-300', ord: 9 };
export const dorStatusMeta = (s) => DORES_STATUS_META[s] || { badge: DORES_NEUTRO, icon: 'fa-circle', ord: 9 };
export const normTxt = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const ehISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
export const fmtDor = (v) => ehISO(v) ? fmtBR(v) : (v || '—');
export const dorQuarter = (d) => (String(d.squad || '').match(/^\s*(Q\d\/\d{4})/) || [])[1] || 'A definir';
export const qOrd = (q) => { const m = /^Q(\d)\/(\d{4})$/.exec(q); return m ? (+m[2]) * 10 + (+m[1]) : 99999; };
export const dorChave = (d) => {
    const s = normTxt([d.codigo, d.setor, d.dor, d.acao].join('|'));
    let h2 = 7; for (const c of s) h2 = (h2 * 33 + c.charCodeAt(0)) >>> 0;
    return `${hash(s).toString(36)}${h2.toString(36)}`;
};
export const dorDocId = (d) => 'imp_' + dorChave(d);
export const camposDor = (d) => { const o = {}; DORES_COLUNAS.forEach(c => { o[c.k] = String(d[c.k] ?? ''); }); return o; };
export function dorCorSetor(setor) {
    const c = PALETA[hash(normTxt(setor)) % PALETA.length];
    const claro = ['#FFCE00', '#6FFFAF', '#4CDDDD'].includes(c);
    return { bg: c, fg: claro ? '#002D32' : '#ffffff' };
}
export const podeExcluirDor = (d) => isAdmin() || !d.criadoPorEmail || d.criadoPorEmail === state.user?.email;

export function ouvirDores() {
    const u = onSnapshot(collection(db, 'dores'), (snap) => {
        state.dores = snap.docs.map(x => ({ ...x.data(), id: x.id }))
            .sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || tsMillis(a.criadoEm) - tsMillis(b.criadoEm));
        state.doresLoaded = true; state.doresErro = false;
        if (state.view === 'dores') render();
    }, (err) => {
        state.doresLoaded = true; state.doresErro = true;
        if (state.view === 'dores') render();
    });
    state.unsubs.push(u);
}

export function doresFiltradas() {
    const f = state.filtros.dores, q = normTxt(f.q);
    return state.dores.filter(d =>
        (!f.setor || d.setor === f.setor) && (!f.prio || d.prioridade === f.prio) &&
        (!f.status || d.status === f.status) && (!f.quarter || dorQuarter(d) === f.quarter) &&
        (!q || normTxt(DORES_COLUNAS.map(c => d[c.k]).join(' ')).includes(q)));
}

export function agruparDores(lista) {
    const g = state.filtros.dores.grupo;
    if (g === 'nenhum') return [{ titulo: '', itens: lista }];
    const chave = (d) => g === 'setor' ? (d.setor || 'Sem setor') : g === 'prioridade' ? (d.prioridade || 'Sem prioridade')
        : g === 'status' ? (d.status || 'Sem status') : dorQuarter(d);
    const mapa = new Map();
    lista.forEach(d => { const k = chave(d); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(d); });
    const grupos = [...mapa].map(([titulo, itens]) => ({ titulo, itens }));
    if (g === 'prioridade') grupos.sort((a, b) => dorPrioMeta(a.titulo).ord - dorPrioMeta(b.titulo).ord);
    if (g === 'status') grupos.sort((a, b) => dorStatusMeta(a.titulo).ord - dorStatusMeta(b.titulo).ord);
    if (g === 'quarter') grupos.sort((a, b) => qOrd(a.titulo) - qOrd(b.titulo));
    return grupos;
}

export const opcoesDe = (fn) => [...new Set(state.dores.map(fn).filter(Boolean))];
export const optsFiltro = (lista, sel) => lista.map(v => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
