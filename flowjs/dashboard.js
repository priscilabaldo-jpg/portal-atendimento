// View: Dashboard gerencial.
import { avatar, badgeSituacao, chipProjeto, getOrigemTarefa, situacao } from '../helpers.js';
import { state } from '../state.js';
import { corProjeto, diasPara, esc, fmtBR, primeiroNome } from '../utils.js';

export function progressoProjeto(projetoId) {
    const ts = state.tarefas.filter(t => t.projetoId === projetoId);
    const feitas = ts.filter(t => t.status === 'Validado').length;
    return { total: ts.length, feitas, pct: ts.length ? Math.round((feitas / ts.length) * 100) : 0, atrasadas: ts.filter(t => situacao(t).key === 'atrasada').length };
}

function kpi(label, valor, icon, borda, cor, attrs) {
    return `<div ${attrs} role="button" tabindex="0" title="Clique para ver os detalhes" class="bg-white p-4 rounded-xl shadow-sm border-l-4 ${borda} flex items-center justify-between cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all w-full">
        <div><p class="text-xs text-gray-500 font-medium uppercase tracking-wide">${label}</p><h3 class="text-3xl font-bold text-leveros-verde1 mt-1">${valor}</h3></div>
        <i class="fas ${icon} text-2xl ${cor} opacity-70"></i></div>`;
}

export function linhaTarefaCompacta(t, mostrarResp = true) {
    return `<div data-action="abrir-tarefa" data-id="${esc(t.id)}" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
        <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-800 truncate">${esc(t.titulo)}</div>
            <div class="flex items-center gap-2 mt-0.5 min-w-0">${chipProjeto(getOrigemTarefa(t))}<span class="text-[11px] text-gray-400 shrink-0">Prazo ${fmtBR(t.prazo)}</span></div>
        </div>
        ${badgeSituacao(t)}
        ${mostrarResp ? avatar(t.responsavelEmail) : ''}
    </div>`;
}

export function dashboardHTML() {
    const ativos = state.projetos.filter(p => p.status !== 'arquivado');
    const abertas = state.tarefas.filter(t => t.status !== 'Validado');
    const atrasadas = abertas.filter(t => situacao(t).key === 'atrasada').sort((a, b) => diasPara(a.prazo) - diasPara(b.prazo));
    const breve = abertas.filter(t => situacao(t).key === 'breve').sort((a, b) => diasPara(a.prazo) - diasPara(b.prazo));
    const concl = state.tarefas.filter(t => t.status === 'Validado').length;

    const projetosHTMLlista = ativos.length ? ativos.sort((a, b) => progressoProjeto(b.id).atrasadas - progressoProjeto(a.id).atrasadas).map(p => {
        const pr = progressoProjeto(p.id);
        const c = corProjeto(p.cor);
        return `<div data-action="abrir-projeto" data-id="${esc(p.id)}" data-nome="${esc(p.nome)}" class="dash-projeto-card p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors shrink-0">
            <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 min-w-0"><span class="w-3 h-3 rounded-full shrink-0" style="background:${c}"></span><span class="font-semibold text-sm truncate">${esc(p.nome)}</span></div>
                <div class="flex items-center gap-2 shrink-0">
                    ${pr.atrasadas ? `<span data-action="filtrar-quadro" data-projeto="${esc(p.id)}" data-sit="atrasada" title="Ver tarefas atrasadas" class="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full hover:bg-red-200">🔴 ${pr.atrasadas} atrasada${pr.atrasadas > 1 ? 's' : ''}</span>` : ''}
                    <span class="text-sm font-bold text-leveros-verde2">${pr.pct}%</span>
                </div>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-500" style="width:${pr.pct}%;background:${c}"></div></div>
            <div class="text-[11px] text-gray-500 mt-1.5">${pr.feitas} de ${pr.total} tarefa${pr.total === 1 ? '' : 's'} concluída${pr.feitas === 1 ? '' : 's'}</div>
        </div>`;
    }).join('') : '<p class="text-sm text-gray-400 py-6 text-center">Nenhum projeto ativo. <button data-action="novo-projeto" class="text-leveros-verde2 font-semibold underline">Criar o primeiro</button></p>';

    const carga = state.membros.map(m => {
        const ts = abertas.filter(t => t.responsavelEmail === m.email);
        return { m, total: ts.length, atr: ts.filter(t => situacao(t).key === 'atrasada').length };
    }).filter(x => x.total > 0).sort((a, b) => b.total - a.total);
    const maxCarga = Math.max(1, ...carga.map(c => c.total));
    const cargaHTML = carga.length ? carga.map(c => `
        <div data-action="filtrar-quadro" data-resp="${esc(c.m.email)}" data-sit="abertas" title="Ver tarefas de ${esc(c.m.nome)}" class="flex items-center gap-3 p-1.5 -m-1.5 rounded-lg cursor-pointer hover:bg-gray-50">
            ${avatar(c.m.email, 'w-8 h-8 text-xs')}
            <div class="flex-1 min-w-0">
                <div class="flex justify-between text-xs mb-1"><span class="font-semibold truncate">${esc(c.m.nome)}</span><span class="text-gray-500">${c.total} aberta${c.total > 1 ? 's' : ''}${c.atr ? ` · <span class="text-red-600 font-bold">${c.atr} atrasada${c.atr > 1 ? 's' : ''}</span>` : ''}</span></div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div class="h-full bg-red-400" style="width:${(c.atr / maxCarga) * 100}%"></div>
                    <div class="h-full bg-leveros-azul" style="width:${((c.total - c.atr) / maxCarga) * 100}%"></div>
                </div>
            </div>
        </div>`).join('') : '<p class="text-sm text-gray-400 py-4 text-center">Sem tarefas abertas atribuídas.</p>';

    return `<div>
        <div class="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div><h2 class="text-2xl font-bold text-leveros-verde1">Visão Geral</h2><p class="text-sm text-gray-500">Olá, ${esc(primeiroNome(state.user.nome))}. Aqui está o panorama de todos os projetos da equipe.</p></div>
            <button data-action="novo-projeto" class="bg-leveros-verde1 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-leveros-verde2 transition-colors"><i class="fas fa-folder-plus mr-1"></i> Novo Projeto</button>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            ${kpi('Projetos ativos', ativos.length, 'fa-folder-open', 'border-leveros-verde2', 'text-leveros-verde2', 'data-action="nav" data-view="projetos"')}
            ${kpi('Tarefas abertas', abertas.length, 'fa-list-check', 'border-blue-400', 'text-blue-500', 'data-action="filtrar-quadro" data-sit="abertas"')}
            ${kpi('Atrasadas', atrasadas.length, 'fa-triangle-exclamation', 'border-red-500', 'text-red-500', 'data-action="filtrar-quadro" data-sit="atrasada"')}
            ${kpi('Vencem em breve', breve.length, 'fa-hourglass-half', 'border-yellow-400', 'text-yellow-500', 'data-action="filtrar-quadro" data-sit="breve"')}
            ${kpi('Concluídas', concl, 'fa-circle-check', 'border-leveros-verde3', 'text-green-600', 'data-action="filtrar-quadro" data-sit="concluida"')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <section class="lg:col-span-3 bg-white rounded-xl shadow-sm p-5 flex flex-col h-full">
                <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h3 class="font-bold text-gray-700 flex items-center gap-2"><i class="fas fa-bars-progress text-leveros-verde2"></i> Projetos e progresso</h3>
                    <div class="relative w-full sm:w-auto">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input type="text" id="busca-projeto-dash" class="inp py-1.5 pl-8 pr-3 text-xs w-full sm:w-48" placeholder="Buscar projeto...">
                    </div>
                </div>
                <div class="flex flex-col gap-2.5 overflow-y-auto max-h-[340px] pr-2 -mr-2">
                    ${projetosHTMLlista}
                </div>
            </section>

            <section class="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
                <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-users text-leveros-verde2"></i> Carga por pessoa</h3>
                <div class="flex flex-col gap-3">${cargaHTML}</div>
                <p class="text-[11px] text-gray-400 mt-3"><span class="inline-block w-2 h-2 bg-red-400 rounded-sm"></span> atrasadas · <span class="inline-block w-2 h-2 bg-leveros-azul rounded-sm"></span> demais abertas</p>
            </section>

            <section class="lg:col-span-3 bg-white rounded-xl shadow-sm p-5">
                <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-triangle-exclamation text-red-500"></i> Gargalos: tarefas atrasadas <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">${atrasadas.length}</span></h3>
                ${atrasadas.length ? atrasadas.slice(0, 10).map(t => linhaTarefaCompacta(t)).join('') + (atrasadas.length > 10 ? `<p class="text-xs text-gray-400 text-center mt-2">+ ${atrasadas.length - 10} tarefas atrasadas</p>` : '') : '<p class="text-sm text-gray-400 py-6 text-center">🎉 Nenhuma tarefa atrasada.</p>'}
            </section>

            <section class="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
                <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-hourglass-half text-yellow-500"></i> Vencem em até 2 dias</h3>
                ${breve.length ? breve.slice(0, 8).map(t => linhaTarefaCompacta(t)).join('') : '<p class="text-sm text-gray-400 py-6 text-center">Nada vencendo nos próximos dias.</p>'}
            </section>
        </div>
    </div>`;
}
