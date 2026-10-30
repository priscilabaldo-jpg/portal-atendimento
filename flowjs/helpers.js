// Helpers de dados e componentes visuais reutilizáveis (membros, situação, avatar, toast, selects).
import { ADMINS } from './config.js';
import { AV_CORES, PALETA } from './constants.js';
import { state } from './state.js';
import { $, corProjeto, diasPara, esc, hash, tsMillis } from './utils.js';

export function nomeDoEmail(email) {
    return (email || '').split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
export function getMembro(email) {
    const m = state.membros.find(x => x.email === (email || '').toLowerCase());
    return m || { email, nome: nomeDoEmail(email), foto: '' };
}
export const getProjeto = (id) => state.projetos.find(p => p.id === id);

export function getOrigemTarefa(t) {
    if (t.projetoId) return getProjeto(t.projetoId);
    if (t.dorId) {
        const dor = state.dores.find(d => d.id === t.dorId);
        return dor ? { id: dor.id, nome: 'Dor: ' + (dor.codigo || 'S/N'), cor: '#F97316' } : null;
    }
    return null;
}

export const getTarefa = (id) => state.tarefas.find(t => t.id === id);
export const isAdmin = () => ADMINS.includes(state.user?.email);
export const ehDonoProjeto = (p) => p && (p.criadoPorEmail === state.user?.email || isAdmin());
export function podeExcluirTarefa(t) {
    const p = getOrigemTarefa(t);
    return isAdmin() || t.criadoPorEmail === state.user?.email || (p && p.criadoPorEmail === state.user?.email);
}

export function situacao(t) {
    if (t.status === 'Validado') return { key: 'concluida', emoji: '✅', label: 'Concluída', detalhe: '', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    const d = diasPara(t.prazo);
    if (d === null) return { key: 'sem-prazo', emoji: '⚪', label: 'Sem prazo', detalhe: '', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
    if (d < 0) return { key: 'atrasada', emoji: '🔴', label: 'Atrasado', detalhe: `há ${-d} dia${-d > 1 ? 's' : ''}`, cls: 'bg-red-100 text-red-700 border-red-200' };
    if (d <= 2) return { key: 'breve', emoji: '🟡', label: 'Entrega em breve', detalhe: d === 0 ? 'vence hoje' : `em ${d} dia${d > 1 ? 's' : ''}`, cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    return { key: 'ok', emoji: '🟢', label: 'No prazo', detalhe: `em ${d} dias`, cls: 'bg-green-100 text-green-700 border-green-200' };
}
export const badgeSituacao = (t, comDetalhe = true) => {
    const s = situacao(t);
    return `<span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}">${s.emoji} ${s.label}${comDetalhe && s.detalhe ? ` · ${s.detalhe}` : ''}</span>`;
};

export function avatar(email, size = 'w-7 h-7 text-[11px]') {
    const m = getMembro(email);
    if (m.foto) return `<img src="${esc(m.foto)}" referrerpolicy="no-referrer" class="${size} rounded-full object-cover shrink-0" title="${esc(m.nome)}">`;
    const ini = (m.nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    return `<span class="${size} rounded-full ${AV_CORES[hash(email) % AV_CORES.length]} text-white font-bold inline-flex items-center justify-center shrink-0" title="${esc(m.nome)}">${esc(ini)}</span>`;
}

export function chipProjeto(p) {
    if (!p) return '<span class="text-[11px] text-gray-400">Sem projeto</span>';
    const c = corProjeto(p.cor);
    return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded max-w-full truncate" style="background:${c}26;color:${c === '#FFCE00' || c === '#6FFFAF' || c === '#4CDDDD' ? '#002D32' : c}"><i class="fas fa-folder"></i><span class="truncate">${esc(p.nome)}</span></span>`;
}

export function toast(msg, tipo = 'ok') {
    const cls = tipo === 'erro' ? 'bg-red-600' : tipo === 'info' ? 'bg-leveros-verde2' : 'bg-leveros-verde1';
    const el = document.createElement('div');
    el.className = `${cls} text-white text-sm px-4 py-3 rounded-lg shadow-lg fade-in max-w-sm`;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

export const optionsMembros = (sel = '') => state.membros.slice().sort((a, b) => a.nome.localeCompare(b.nome))
    .map(m => `<option value="${esc(m.email)}" ${m.email === sel ? 'selected' : ''}>${esc(m.nome)}</option>`).join('');
export const optionsProjetos = (sel = '', apenasAtivos = true) => state.projetos
    .filter(p => !apenasAtivos || p.status !== 'arquivado' || p.id === sel)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('');
export const optionsCron = (projetoId, sel = '') => state.cronogramas.filter(c => c.projetoId === projetoId)
    .sort((a, b) => tsMillis(a.criadoEm) - tsMillis(b.criadoEm))
    .map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');

export function checkboxColabs(name, selecionados = [], excluirEmail = '', desabilitado = false) {
    const lista = state.membros.filter(m => m.email !== excluirEmail).sort((a, b) => a.nome.localeCompare(b.nome));
    if (!lista.length) return '<p class="text-xs text-gray-400 p-2">Nenhum outro membro cadastrado.</p>';
    return lista.map(m => `
        <label class="flex items-center gap-2 p-2 text-sm hover:bg-gray-50 ${desabilitado ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}">
            <input type="checkbox" name="${name}" value="${esc(m.email)}" class="rounded" ${selecionados.includes(m.email) ? 'checked' : ''} ${desabilitado ? 'disabled' : ''}>
            ${avatar(m.email, 'w-6 h-6 text-[10px]')}
            <span class="font-semibold truncate">${esc(m.nome)}</span>
        </label>`).join('');
}
export const colabsMarcados = (name) => [...document.querySelectorAll(`input[name=${name}]:checked`)].map(cb => cb.value);

// Seletor de cor (radio) — usado nos formulários de projeto e rotina
export const seletorCor = (name, sel = PALETA[0], size = 'w-8 h-8') => `<div class="flex gap-2 flex-wrap">${PALETA.map(c => `<label class="cursor-pointer"><input type="radio" name="${name}" value="${c}" class="peer hidden" ${c === sel ? 'checked' : ''}><span class="block ${size} rounded-full border-2 border-transparent peer-checked:border-leveros-verde1 peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-leveros-azul" style="background:${c}"></span></label>`).join('')}</div>`;
