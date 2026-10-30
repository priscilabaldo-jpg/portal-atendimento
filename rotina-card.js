// Rotina Diária — cartão de cada atividade (data, conteúdo, prazo em destaque, ações).
import { DIAS_SEMANA, MESES_CURTOS, STATUS_ROTINA_META } from './constants.js';
import { avatar, getMembro } from './helpers.js';
import { catDe, podeEditarRotina, podeGerirRotina, rotinaColabs, rotinaConcluida, rotinaOcultaPara } from './rotina-data.js';
import { diasPara, esc, fmtBR, hojeISO, pad, parseISO, primeiroNome } from './utils.js';

// Bloco de calendário (data inicial)
export function blocoDataRotina(r, concluido) {
    if (!r.data) return '';
    const dt = parseISO(r.data);
    const ehHoje = r.data === hojeISO();
    const base = concluido ? 'bg-gray-100 text-gray-400 border-gray-200'
        : ehHoje ? 'bg-leveros-verde1 text-white border-leveros-verde1 shadow-md' : 'bg-white text-leveros-verde1 border-gray-300';
    const topo = concluido ? 'bg-gray-200 text-gray-500' : ehHoje ? 'bg-leveros-amarelo text-leveros-verde1' : 'bg-leveros-verde2 text-white';
    const rodape = concluido ? '' : ehHoje ? 'text-leveros-verde4' : 'text-gray-500';
    return `
    <div class="shrink-0 w-[62px] rounded-xl border-2 ${base} overflow-hidden text-center leading-none select-none" title="Data inicial: ${fmtBR(r.data)}">
        <div class="text-[9px] font-extrabold tracking-widest py-1 ${topo}">${MESES_CURTOS[dt.getMonth()]}</div>
        <div class="text-2xl font-extrabold pt-1.5">${pad(dt.getDate())}</div>
        <div class="text-[10px] font-semibold uppercase pb-1.5 pt-0.5 ${rodape}">${ehHoje ? 'Hoje' : DIAS_SEMANA[dt.getDay()]}</div>
    </div>`;
}

// Caixa de PRAZO — cor conforme a urgência
export function renderPrazoRotina(r) {
    const caixa = (cls, icon, rotulo, linha1, linha2 = '') => `
        <div class="rounded-xl border px-3 py-2 min-w-[132px] text-left ${cls}" title="Prazo final">
            <div class="text-[9px] font-extrabold uppercase tracking-widest opacity-70"><i class="fas ${icon} mr-1"></i>${rotulo}</div>
            <div class="text-sm font-extrabold leading-tight">${linha1}</div>
            ${linha2 ? `<div class="text-[11px] font-semibold leading-tight mt-0.5">${linha2}</div>` : ''}
        </div>`;

    if (r.status === 'Continua') return caixa('bg-teal-50 border-teal-200 text-teal-800', 'fa-sync-alt', 'Prazo', 'Contínua', 'sem data final');
    if (!r.prazo) return caixa('bg-gray-50 border-dashed border-gray-300 text-gray-400', 'fa-calendar', 'Prazo', 'Sem prazo');
    if (rotinaConcluida(r)) return caixa('bg-gray-50 border-gray-200 text-gray-400', 'fa-check', 'Prazo', `<span class="line-through">${fmtBR(r.prazo)}</span>`, 'finalizada');

    const dt = parseISO(r.prazo);
    const data = `${fmtBR(r.prazo)} <span class="font-semibold opacity-70">· ${DIAS_SEMANA[dt.getDay()]}</span>`;
    const d = diasPara(r.prazo);
    if (d < 0) return caixa('bg-red-600 border-red-700 text-white shadow-md', 'fa-exclamation-triangle', 'Prazo vencido', data, `Atrasada há ${-d} dia${-d > 1 ? 's' : ''}`);
    if (d === 0) return caixa('bg-leveros-amarelo border-yellow-500 text-leveros-verde1 shadow-md', 'fa-bolt', 'Prazo', data, 'VENCE HOJE');
    if (d === 1) return caixa('bg-yellow-100 border-yellow-400 text-yellow-900', 'fa-clock', 'Prazo', data, 'Vence amanhã');
    if (d <= 2) return caixa('bg-yellow-50 border-yellow-300 text-yellow-800', 'fa-clock', 'Prazo', data, `Em ${d} dias`);
    return caixa('bg-green-50 border-green-200 text-green-800', 'fa-calendar-check', 'Prazo', data, `Em ${d} dias`);
}

// Faixa lateral = urgência (finalizada = cinza, atrasada = vermelho, hoje = amarelo...)
function faixaUrgencia(r, cor) {
    if (rotinaConcluida(r)) return '#d1d5db';
    if (r.status === 'Continua' || !r.prazo) return cor;
    const d = diasPara(r.prazo);
    return d < 0 ? '#dc2626' : d === 0 ? '#FFCE00' : d <= 2 ? '#facc15' : '#22c55e';
}

export const textoSobreCor = (c) => ['#FFCE00', '#6FFFAF', '#4CDDDD'].includes(c) ? '#002D32' : c;
export const urlExterna = (u) => /^https?:\/\//i.test(u) ? u : 'https://' + u;
export const btnRotina = (acao, id, hover, titulo, icon) =>
    `<button data-action="${acao}" data-id="${esc(id)}" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 transition-colors ${hover}" title="${titulo}"><i class="fas ${icon}"></i></button>`;

// ctx = { isMinhas, fResp, todos }
export function cardRotina(r, { isMinhas, fResp, todos }) {
    const colabs = rotinaColabs(r);
    const oculta = rotinaOcultaPara(r, todos ? r.responsavelEmail : fResp);
    const concluido = rotinaConcluida(r);
    const cor = r.cor || '#9ca3af';
    const dono = getMembro(r.responsavelEmail);
    const titulo = concluido ? 'line-through text-gray-400' : 'text-gray-800';

    const acoes = [
        r.acesso ? `<a data-action="noop" href="${esc(urlExterna(r.acesso))}" target="_blank" rel="noopener" class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors !text-leveros-verde2 hover:bg-leveros-verde4/40" title="Acessar link"><i class="fas fa-external-link-alt"></i></a>` : '',
        isMinhas ? btnRotina('toggle-ocultar-rotina', r.id, 'hover:text-orange-500 hover:bg-orange-50', oculta ? 'Mostrar atividade' : 'Ocultar atividade', oculta ? 'fa-eye' : 'fa-eye-slash') : '',
        podeEditarRotina(r) ? btnRotina('editar-rotina', r.id, 'hover:text-leveros-verde2 hover:bg-leveros-verde4/40', 'Editar atividade', 'fa-edit') : '',
        podeGerirRotina(r) ? btnRotina('excluir-rotina', r.id, 'hover:text-red-500 hover:bg-red-50', 'Excluir da rotina', 'fa-trash') : ''
    ].join('');

    const etiquetas = [
        `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border" style="background:${cor}1A;color:${textoSobreCor(cor)};border-color:${cor}66">${esc(catDe(r))}</span>`,
        (r.status !== 'Não iniciado' && r.status !== 'Concluído') ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_ROTINA_META[r.status] || ''}">${esc(r.status)}</span>` : '',
        todos
            ? `<span class="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">${avatar(r.responsavelEmail, 'w-4 h-4 text-[8px]')}${esc(primeiroNome(dono.nome))}</span>`
            : r.responsavelEmail !== fResp ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">🤝 De: ${esc(primeiroNome(dono.nome))}</span>` : '',
        oculta ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700"><i class="fas fa-eye-slash mr-1"></i>Oculta</span>' : '',
        r.comentariosCount ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600" title="Comentários"><i class="far fa-comment mr-1"></i>${r.comentariosCount}</span>` : ''
    ].join('');

    return `
    <div role="button" tabindex="0" data-action="rotina-ver" data-id="${esc(r.id)}" title="Abrir visão completa"
         class="group relative flex flex-col lg:flex-row lg:items-center gap-4 p-4 mb-3 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer ${(oculta || concluido) ? 'bg-gray-50 opacity-75' : 'bg-white'}" style="border-left:6px solid ${faixaUrgencia(r, cor)}">
        ${blocoDataRotina(r, concluido)}
        <div class="flex items-start gap-3 flex-1 min-w-0">
            <button data-action="rotina-toggle-status" data-id="${esc(r.id)}" class="mt-0.5 shrink-0 text-2xl transition-transform hover:scale-110 ${concluido ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}" title="${concluido ? 'Reabrir' : 'Marcar como concluída'}">
                <i class="fas ${concluido ? 'fa-check-circle' : 'fa-circle'}"></i>
            </button>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap mb-1.5">${etiquetas}</div>
                <h4 class="font-bold text-[15px] leading-snug ${titulo}" title="${esc(r.titulo || r.descricao)}">${esc(r.titulo || r.descricao)}</h4>
                ${r.descricao && r.titulo ? `<p class="text-xs text-gray-500 mt-0.5 line-clamp-1">${esc(r.descricao)}</p>` : ''}
                ${r.observacao ? `<p class="text-xs text-gray-500 mt-1 line-clamp-1 italic"><i class="fas fa-info-circle mr-1 text-gray-400"></i>${esc(r.observacao)}</p>` : ''}
                ${colabs.length ? `<div class="flex items-center gap-1.5 mt-2"><span class="text-[10px] uppercase font-bold text-gray-400">Apoio</span><div class="flex -space-x-1.5">${colabs.map(e => avatar(e, 'w-5 h-5 text-[9px] ring-2 ring-white')).join('')}</div></div>` : ''}
            </div>
        </div>
        <div class="flex items-center justify-between lg:justify-end gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
            ${renderPrazoRotina(r)}
            <div class="flex items-center gap-0.5 border-l border-gray-200 pl-2">${acoes}</div>
        </div>
    </div>`;
}
