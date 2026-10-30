// Rotina Diária — regras: permissões, situação (atrasada/hoje/pendente/finalizada), filtros e contadores.
import { CATS_ROTINA } from '../constants.js';
import { normTxt } from '../dores/data.js';
import { isAdmin } from '../helpers.js';
import { state } from '../state.js';
import { diasPara, tsMillis } from '../utils.js';

export const TODOS = '__todos__';

const CAT_META = {
    'Rotina Operacional': { icon: 'fa-gears', cor: '#005A64' },
    'Suporte e Dúvidas': { icon: 'fa-headset', cor: '#3B82F6' },
    'Reuniões': { icon: 'fa-people-group', cor: '#8B5CF6' },
    'Melhoria Contínua': { icon: 'fa-arrow-trend-up', cor: '#16A34A' },
    'Planejamento': { icon: 'fa-calendar-check', cor: '#F97316' },
    'Outros': { icon: 'fa-ellipsis', cor: '#6B7280' }
};
export const catMeta = (c) => CAT_META[c] || { icon: 'fa-tag', cor: '#6B7280' };
export const catDe = (r) => r.categoria || 'Outros';

// ---------- permissões ----------
export const rotinaColabs = (r) => r.colaboradoresEmails || [];
const rotinaDe = (r, email) => r.responsavelEmail === email || rotinaColabs(r).includes(email);
export const rotinaOcultaPara = (r, email) => (r.responsavelEmail === email && !!r.oculta) || (r.ocultaPara || []).includes(email);
export const podeGerirRotina = (r) => r.responsavelEmail === state.user?.email || isAdmin();
export const podeEditarRotina = (r) => podeGerirRotina(r) || rotinaColabs(r).includes(state.user?.email);

// ---------- situação ----------
export function rotinaConcluida(r) { return r.status === 'Concluído' || r.status === 'Concluído Parcial'; }

// 'concluida' | 'atrasada' | 'hoje' | 'aberta'  ("Contínua" e "sem prazo" nunca atrasam)
export function situacaoRotina(r) {
    if (rotinaConcluida(r)) return 'concluida';
    if (r.status === 'Continua' || !r.prazo) return 'aberta';
    const d = diasPara(r.prazo);
    return d < 0 ? 'atrasada' : d === 0 ? 'hoje' : 'aberta';
}

// Os 4 indicadores dos cards. "Pendentes" = tudo que ainda não foi finalizado (inclui atrasadas e as de hoje).
export const SIT_ROTINA = {
    atrasadas: { rotulo: 'Atrasadas', curto: 'Atras.', icon: 'fa-triangle-exclamation', txt: 'text-red-600', borda: 'border-red-500', fundo: 'bg-red-50', dica: 'Prazo já vencido e ainda não finalizadas', teste: (r) => situacaoRotina(r) === 'atrasada' },
    hoje: { rotulo: 'Vencem hoje', curto: 'Hoje', icon: 'fa-bolt', txt: 'text-yellow-600', borda: 'border-yellow-400', fundo: 'bg-yellow-50', dica: 'Prazo é hoje', teste: (r) => situacaoRotina(r) === 'hoje' },
    pendentes: { rotulo: 'Pendentes', curto: 'Pend.', icon: 'fa-inbox', txt: 'text-blue-600', borda: 'border-blue-400', fundo: 'bg-blue-50', dica: 'Em aberto: tudo que ainda não foi finalizado (inclui atrasadas e as de hoje)', teste: (r) => !rotinaConcluida(r) },
    concluidas: { rotulo: 'Finalizadas', curto: 'Final.', icon: 'fa-circle-check', txt: 'text-green-600', borda: 'border-green-500', fundo: 'bg-green-50', dica: 'Concluídas ou concluídas parcialmente', teste: rotinaConcluida }
};

function contarRotinas(lista) {
    const c = { total: lista.length, atrasadas: 0, hoje: 0, pendentes: 0, concluidas: 0 };
    lista.forEach(r => Object.entries(SIT_ROTINA).forEach(([k, s]) => { if (s.teste(r)) c[k]++; }));
    return c;
}

export function categoriasRotina(base) {
    const extras = [...new Set(base.map(catDe).filter(c => !CATS_ROTINA.includes(c)))];
    return [...CATS_ROTINA, ...extras].map(nome => ({ nome, ...catMeta(nome), ...contarRotinas(base.filter(r => catDe(r) === nome)) }));
}

// ---------- ordenação e filtros ----------
const ORDENS_ROTINA = {
    'data-desc': (a, b) => (b.data || '').localeCompare(a.data || '') || tsMillis(b.criadoEm) - tsMillis(a.criadoEm),
    'data-asc': (a, b) => (a.data || '').localeCompare(b.data || '') || tsMillis(a.criadoEm) - tsMillis(b.criadoEm),
    'prazo-asc': (a, b) => (a.prazo || '9999-99-99').localeCompare(b.prazo || '9999-99-99'),
    'prazo-desc': (a, b) => (b.prazo || '0000-00-00').localeCompare(a.prazo || '0000-00-00')
};

/**
 * Pipeline de filtros (cada etapa alimenta um bloco da tela):
 *   escopo (pessoa ou TODOS, ocultas)  →  base (+ busca, + status)  →  categoria (+ categoria)  →  lista (+ situação, ordenada)
 *   cards de categoria usam `base`; cards de situação (KPIs) usam `categoria`; a lista usa tudo.
 */
export function rotinasVisiveis() {
    const f = state.filtros;
    const isMinhas = (f.rotinaModo || 'minhas') === 'minhas';
    const fResp = isMinhas ? state.user.email : (f.rotinaResp || TODOS);
    const todos = fResp === TODOS;
    const termo = normTxt(f.rotinaBusca);

    let escopo = state.rotinas.filter(r => todos || rotinaDe(r, fResp));
    if (!f.rotinaOcultas) escopo = escopo.filter(r => !rotinaOcultaPara(r, todos ? r.responsavelEmail : fResp));

    const base = escopo.filter(r =>
        (!termo || normTxt(`${r.titulo || ''} ${r.descricao || ''} ${r.observacao || ''}`).includes(termo)) &&
        (!f.rotinaStatus || r.status === f.rotinaStatus));
    const categoria = base.filter(r => !f.rotinaCat || catDe(r) === f.rotinaCat);
    const lista = categoria
        .filter(r => !f.rotinaSit || SIT_ROTINA[f.rotinaSit]?.teste(r))
        .sort(ORDENS_ROTINA[f.rotinaOrdem] || ORDENS_ROTINA['data-desc']);

    return { lista, base, categoria, escopo, isMinhas, fResp, todos, kpis: contarRotinas(categoria) };
}

export const rotinaFiltrando = () => { const f = state.filtros; return !!(f.rotinaBusca || f.rotinaCat || f.rotinaStatus || f.rotinaSit); };
