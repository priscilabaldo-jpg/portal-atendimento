// View: Projetos e detalhe do projeto.
import { STATUS_META } from './constants.js';
import { avatar, badgeSituacao, ehDonoProjeto, getMembro, getProjeto } from './helpers.js';
import { state } from './state.js';
import { corProjeto, esc, fmtBR, primeiroNome, tsMillis } from './utils.js';
import { progressoProjeto } from './views-dashboard.js';

export function projetosHTML() {
    const ativos = state.projetos.filter(p => p.status !== 'arquivado').sort((a, b) => a.nome.localeCompare(b.nome));
    const arq = state.projetos.filter(p => p.status === 'arquivado').sort((a, b) => a.nome.localeCompare(b.nome));
    const card = (p) => {
        const pr = progressoProjeto(p.id); const c = corProjeto(p.cor);
        const nCron = state.cronogramas.filter(x => x.projetoId === p.id).length;
        return `<div data-action="abrir-projeto" data-id="${esc(p.id)}" class="bg-white rounded-xl shadow-sm border-t-4 p-5 cursor-pointer hover:shadow-lg transition-shadow ${p.status === 'arquivado' ? 'opacity-60' : ''}" style="border-color:${c}">
            <div class="flex items-start justify-between gap-2"><h3 class="font-bold text-lg text-leveros-verde1 leading-tight">${esc(p.nome)}</h3>${pr.atrasadas ? `<span class="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">🔴 ${pr.atrasadas}</span>` : ''}</div>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.5rem]">${esc(p.descricao || 'Sem descrição')}</p>
            <div class="mt-3"><div class="flex justify-between text-xs mb-1"><span class="text-gray-500">${pr.feitas}/${pr.total} tarefas · ${nCron} cronograma${nCron === 1 ? '' : 's'}</span><span class="font-bold" style="color:${c === '#FFCE00' || c === '#6FFFAF' || c === '#4CDDDD' ? '#005A64' : c}">${pr.pct}%</span></div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${pr.pct}%;background:${c}"></div></div></div>
            <div class="flex items-center gap-1.5 mt-3 text-[11px] text-gray-400">${avatar(p.criadoPorEmail, 'w-5 h-5 text-[9px]')} Criado por ${esc(primeiroNome(getMembro(p.criadoPorEmail).nome))}</div>
        </div>`;
    };
    return `<div>
        <div class="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div><h2 class="text-2xl font-bold text-leveros-verde1">Projetos</h2><p class="text-sm text-gray-500">${ativos.length} ativo${ativos.length === 1 ? '' : 's'}</p></div>
            <div class="flex gap-2">
                <button data-action="novo-membro" class="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"><i class="fas fa-user-plus mr-1"></i> Equipe</button>
                <button data-action="novo-projeto" class="bg-leveros-verde1 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-leveros-verde2"><i class="fas fa-folder-plus mr-1"></i> Novo Projeto</button>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${ativos.map(card).join('') || '<p class="text-gray-400 col-span-full text-center py-10">Nenhum projeto ainda.</p>'}</div>
        ${arq.length ? `<h3 class="font-bold text-gray-500 mt-8 mb-3 text-sm">Arquivados</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${arq.map(card).join('')}</div>` : ''}
    </div>`;
}

export function projetoDetalheHTML() {
    const p = getProjeto(state.projetoAtual);
    if (!p) return '<p class="text-gray-500">Projeto não encontrado. <button data-action="nav" data-view="projetos" class="underline text-leveros-verde2">Voltar</button></p>';
    const pr = progressoProjeto(p.id); const c = corProjeto(p.cor);
    const crons = state.cronogramas.filter(x => x.projetoId === p.id).sort((a, b) => tsMillis(a.criadoEm) - tsMillis(b.criadoEm));
    const donos = ehDonoProjeto(p);

    const cronHTML = crons.map(cr => {
        const ts = state.tarefas.filter(t => t.cronogramaId === cr.id).sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
        const feitas = ts.filter(t => t.status === 'Validado').length;
        const pct = ts.length ? Math.round(feitas / ts.length * 100) : 0;
        return `<section class="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
            <div class="px-5 py-3 flex items-center justify-between gap-3 border-b bg-gray-50 flex-wrap">
                <div class="min-w-0"><h3 class="font-bold text-leveros-verde1"><i class="far fa-calendar-check text-leveros-verde2 mr-2"></i>${esc(cr.nome)}</h3><p class="text-[11px] text-gray-500">${feitas}/${ts.length} concluídas · ${pct}%</p></div>
                <div class="flex gap-2">
                    <button data-action="nova-tarefa" data-projeto="${esc(p.id)}" data-cron="${esc(cr.id)}" class="text-xs px-3 py-1.5 rounded-lg bg-leveros-amarelo text-leveros-verde1 font-semibold hover:bg-yellow-400"><i class="fas fa-plus mr-1"></i>Tarefa</button>
                    <button data-action="excluir-cronograma" data-id="${esc(cr.id)}" class="text-xs px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50" title="Excluir cronograma"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="h-1 bg-gray-100"><div class="h-full" style="width:${pct}%;background:${c}"></div></div>
            ${ts.length ? `<div class="divide-y overflow-x-auto">${ts.map(t => `
                <div data-action="abrir-tarefa" data-id="${esc(t.id)}" class="px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50 cursor-pointer min-w-[560px]">
                    <span class="text-[11px] px-1.5 py-0.5 rounded w-24 text-center shrink-0 ${STATUS_META[t.status]?.badge || ''}">${esc(t.status)}</span>
                    <span class="flex-1 text-sm font-medium truncate ${t.status === 'Validado' ? 'line-through text-gray-400' : ''}">${esc(t.titulo)}</span>
                    <span class="text-xs text-gray-500 w-20 shrink-0">${fmtBR(t.prazo)}</span>
                    <span class="shrink-0 w-44 text-right">${badgeSituacao(t)}</span>
                    <span class="shrink-0 flex items-center gap-1.5 w-28 text-xs text-gray-600">${avatar(t.responsavelEmail, 'w-6 h-6 text-[10px]')}<span class="truncate">${esc(primeiroNome(getMembro(t.responsavelEmail).nome))}</span></span>
                </div>`).join('')}</div>` : '<p class="text-sm text-gray-400 text-center py-6">Nenhuma tarefa neste cronograma.</p>'}
        </section>`;
    }).join('');

    return `<div>
        <button data-action="nav" data-view="projetos" class="text-sm text-gray-500 hover:text-leveros-verde2 mb-3"><i class="fas fa-arrow-left mr-1"></i> Projetos</button>
        <div class="bg-white rounded-xl shadow-sm p-5 mb-5 border-t-4" style="border-color:${c}">
            <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="min-w-0 flex-1">
                    <h2 class="text-2xl font-bold text-leveros-verde1">${esc(p.nome)} ${p.status === 'arquivado' ? '<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full align-middle">Arquivado</span>' : ''}</h2>
                    <p class="text-xs font-semibold text-gray-400 mt-1"><i class="far fa-calendar-alt mr-1"></i> Início: ${fmtBR(p.inicio) || 'Não definido'}</p>
                    <p class="text-sm text-gray-500 mt-1">${esc(p.descricao || 'Sem descrição')}</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button data-action="novo-cronograma" data-projeto="${esc(p.id)}" class="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-semibold"><i class="fas fa-calendar-plus mr-1"></i> Cronograma</button>
                    <button data-action="ver-quadro" data-projeto="${esc(p.id)}" class="text-sm px-3 py-2 rounded-lg border border-leveros-verde2 text-leveros-verde2 hover:bg-leveros-verde4/40 font-semibold"><i class="fas fa-columns mr-1"></i> Ver no quadro</button>
                    ${donos ? `<button data-action="arquivar-projeto" data-id="${esc(p.id)}" class="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50" title="${p.status === 'arquivado' ? 'Reativar' : 'Arquivar'}"><i class="fas fa-box-archive"></i></button>
                    <button data-action="editar-projeto" data-id="${esc(p.id)}" class="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50" title="Editar Projeto"><i class="fas fa-edit"></i></button>
                    <button data-action="excluir-projeto" data-id="${esc(p.id)}" class="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50" title="Excluir projeto"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>

            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1"><i class="fas fa-heart-crack text-red-400 mr-1"></i> Qual a Dor?</h4>
                    <p class="text-sm text-gray-700">${esc(p.dor || 'Não informada')}</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1"><i class="fas fa-bullseye text-blue-400 mr-1"></i> O Que Queremos Sanar?</h4>
                    <p class="text-sm text-gray-700">${esc(p.sanar || 'Não informado')}</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1"><i class="fas fa-chart-line text-leveros-verde2 mr-1"></i> KPI a Medir</h4>
                    <p class="text-sm text-gray-700 font-semibold">${esc(p.kpi || 'Não informado')}</p>
                </div>
            </div>

            <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div data-action="filtrar-quadro" data-projeto="${esc(p.id)}" class="bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-leveros-verde4/40 transition-colors"><div class="text-xl font-bold text-leveros-verde1">${pr.pct}%</div><div class="text-[11px] text-gray-500">concluído</div></div>
                <div data-action="filtrar-quadro" data-projeto="${esc(p.id)}" class="bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-leveros-verde4/40 transition-colors"><div class="text-xl font-bold text-leveros-verde1">${pr.total}</div><div class="text-[11px] text-gray-500">tarefas</div></div>
                <div data-action="filtrar-quadro" data-projeto="${esc(p.id)}" data-sit="concluida" class="bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-leveros-verde4/40 transition-colors"><div class="text-xl font-bold text-leveros-verde1">${pr.feitas}</div><div class="text-[11px] text-gray-500">validadas</div></div>
                <div data-action="filtrar-quadro" data-projeto="${esc(p.id)}" data-sit="atrasada" class="bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-red-50 transition-colors"><div class="text-xl font-bold ${pr.atrasadas ? 'text-red-600' : 'text-leveros-verde1'}">${pr.atrasadas}</div><div class="text-[11px] text-gray-500">atrasadas</div></div>
            </div>
            <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-4"><div class="h-full rounded-full transition-all" style="width:${pr.pct}%;background:${c}"></div></div>
        </div>
        ${cronHTML || '<div class="bg-white rounded-xl p-10 text-center text-gray-400">Este projeto ainda não tem cronogramas. Crie o primeiro no botão acima.</div>'}
    </div>`;
}
