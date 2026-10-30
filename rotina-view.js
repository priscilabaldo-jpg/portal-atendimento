// Rotina Diária — tela. Dividida em regiões que se atualizam sozinhas (filtros, cards, categorias, lista),
import { CATS_ROTINA, PALETA, STATUS_ROTINA } from './constants.js';
import { checkboxColabs, optionsMembros, seletorCor } from './helpers.js';
import { cardRotina } from './rotina-card.js';
import { catDe, categoriasRotina, rotinaFiltrando, rotinasVisiveis, SIT_ROTINA, TODOS } from './rotina-data.js';
import { state } from './state.js';
import { $, esc, hojeISO } from './utils.js';

// assim digitar na busca ou receber dados em tempo real não apaga o formulário nem tira o foco do campo.

// ---------- cards de situação (KPIs) ----------
function kpisRotinaHTML(v) {
    const f = state.filtros, k = v.kpis;
    const pct = k.total ? Math.round((k.concluidas / k.total) * 100) : 0;
    const card = (chave) => {
        const s = SIT_ROTINA[chave], ativo = f.rotinaSit === chave;
        return `
        <button data-action="rotina-sit" data-sit="${chave}" title="${esc(s.dica)} — clique para filtrar" aria-pressed="${ativo}"
            class="text-left bg-white rounded-xl shadow-sm p-4 border-l-4 ${s.borda} flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all ${ativo ? `ring-2 ring-leveros-azul ${s.fundo}` : ''}">
            <div>
                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${s.rotulo}</p>
                <h3 class="text-2xl font-bold ${s.txt} leading-none mt-1">${k[chave]}</h3>
                ${ativo ? '<p class="text-[10px] text-gray-500 mt-1">filtrando · clique para limpar</p>' : ''}
            </div>
            <i class="fas ${s.icon} text-3xl opacity-20 ${s.txt}"></i>
        </button>`;
    };
    return `
    <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex flex-col justify-center">
        <div class="flex justify-between text-xs text-gray-500 font-bold uppercase mb-2"><span>Progresso</span><span class="text-leveros-verde2">${pct}%</span></div>
        <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-leveros-verde2 transition-all duration-500" style="width:${pct}%"></div></div>
        <div class="text-[11px] text-gray-400 mt-2 text-center">${k.concluidas} de ${k.total} finalizadas</div>
    </div>
    ${Object.keys(SIT_ROTINA).map(card).join('')}`;
}

// ---------- cards por categoria ----------
function categoriasHTML(v) {
    const f = state.filtros;
    const contador = (c, chave) => {
        const s = SIT_ROTINA[chave], n = c[chave];
        const ativo = f.rotinaCat === c.nome && f.rotinaSit === chave;
        return `<button data-action="rotina-cat" data-cat="${esc(c.nome)}" data-sit="${chave}" title="${s.rotulo} em ${esc(c.nome)}" aria-pressed="${ativo}"
            class="flex-1 rounded-md py-1 text-center leading-tight transition-colors ${ativo ? `ring-2 ring-leveros-azul ${s.fundo}` : 'hover:bg-gray-100'} ${n ? '' : 'opacity-40'}">
            <div class="text-sm font-bold ${n ? s.txt : 'text-gray-400'}">${n}</div><div class="text-[9px] uppercase font-semibold text-gray-500">${s.curto}</div></button>`;
    };
    return categoriasRotina(v.base).map(c => {
        const ativo = f.rotinaCat === c.nome;
        return `
        <div class="bg-white rounded-xl border ${ativo ? 'border-leveros-azul ring-2 ring-leveros-azul/60' : 'border-gray-200'} shadow-sm overflow-hidden ${c.total ? '' : 'opacity-60'}">
            <button data-action="rotina-cat" data-cat="${esc(c.nome)}" aria-pressed="${ativo}" title="Filtrar por ${esc(c.nome)}" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50">
                <span class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0" style="background:${c.cor}"><i class="fas ${c.icon}"></i></span>
                <span class="flex-1 min-w-0 text-xs font-bold text-gray-700 leading-tight truncate">${esc(c.nome)}</span>
                <span class="text-xs font-bold text-gray-400">${c.total}</span>
            </button>
            <div class="flex gap-0.5 px-1.5 pb-1.5">${Object.keys(SIT_ROTINA).map(k => contador(c, k)).join('')}</div>
        </div>`;
    }).join('');
}

// ---------- barra de filtros ----------
function filtrosRotinaHTML() {
    const f = state.filtros;
    const sel = (id, rotulo, opcoes, atual) => `<div><label class="lbl">${rotulo}</label><select id="${id}" class="inp">${opcoes.map(([v, l]) => `<option value="${esc(v)}" ${v === atual ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    const btn = (acao, ativo, icon, dica) => `<button data-action="${acao}" title="${dica}" class="flex-1 px-3 py-2 text-sm border rounded-lg flex items-center justify-center font-semibold transition-colors ${ativo ? 'border-leveros-verde2 text-leveros-verde2 bg-leveros-verde4/40' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}"><i class="fas ${icon}"></i></button>`;
    return `
    <div class="bg-white rounded-xl shadow-sm p-3 mb-4 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-6 gap-3 items-end border border-gray-200">
        <div><label class="lbl">Buscar</label><input id="f-rotina-q" class="inp" placeholder="Título, descrição..." value="${esc(f.rotinaBusca)}"></div>
        ${sel('f-rotina-cat', 'Categoria', [['', 'Todas'], ...CATS_ROTINA.map(c => [c, c])], f.rotinaCat)}
        ${sel('f-rotina-status', 'Status', [['', 'Todos'], ...STATUS_ROTINA.map(s => [s, s])], f.rotinaStatus)}
        ${sel('f-rotina-sit', 'Situação', [['', 'Todas'], ...Object.entries(SIT_ROTINA).map(([k, s]) => [k, s.rotulo])], f.rotinaSit)}
        ${sel('f-rotina-ordem', 'Ordenar por', [['data-desc', 'Data início (mais novas)'], ['data-asc', 'Data início (mais antigas)'], ['prazo-asc', 'Prazo (vencendo primeiro)'], ['prazo-desc', 'Prazo (mais distantes)']], f.rotinaOrdem)}
        <div class="flex gap-2 w-full">
            ${btn('rotina-agrupar', f.rotinaAgrupar, 'fa-layer-group', 'Agrupar a lista por categoria')}
            ${btn('toggle-ver-ocultas', f.rotinaOcultas, f.rotinaOcultas ? 'fa-eye' : 'fa-eye-slash', 'Mostrar atividades ocultas')}
            ${btn('limpar-filtros-rotina', false, 'fa-eraser', 'Limpar filtros')}
        </div>
    </div>`;
}

// ---------- resumo dos filtros + lista ----------
function contagemRotinaHTML(v) {
    const f = state.filtros;
    const chip = (campo, rotulo) => `<button data-action="rotina-limpar-filtro" data-campo="${campo}" class="inline-flex items-center gap-1 bg-leveros-verde4/60 text-leveros-verde1 text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-leveros-verde4">${esc(rotulo)} <i class="fas fa-times text-[9px]"></i></button>`;
    const chips = [
        f.rotinaBusca && chip('busca', `Busca: "${f.rotinaBusca}"`),
        f.rotinaCat && chip('cat', f.rotinaCat),
        f.rotinaStatus && chip('status', `Status: ${f.rotinaStatus}`),
        f.rotinaSit && chip('sit', SIT_ROTINA[f.rotinaSit]?.rotulo || f.rotinaSit)
    ].filter(Boolean).join('');
    return `Mostrando <b>${v.lista.length}</b> de ${v.escopo.length} atividade${v.escopo.length === 1 ? '' : 's'}${v.todos ? ` · <b>${new Set(v.escopo.map(r => r.responsavelEmail)).size}</b> pessoa(s)` : ''}${chips ? ` <span class="mx-1 text-gray-300">|</span> ${chips}` : ''}`;
}

function listaRotinaHTML(v) {
    if (!v.lista.length) {
        return `<div class="p-10 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300"><i class="fas fa-clipboard-check text-4xl mb-3 text-gray-300 block"></i>${rotinaFiltrando() ? 'Nenhuma atividade com estes filtros.' : 'Nenhuma atividade por aqui. Tudo limpo!'}</div>`;
    }
    if (!state.filtros.rotinaAgrupar) return v.lista.map(r => cardRotina(r, v)).join('');
    return categoriasRotina(v.lista).filter(c => c.total).map(c => `
        <section class="mb-4">
            <div class="flex items-center gap-2 mb-2">
                <span class="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px]" style="background:${c.cor}"><i class="fas ${c.icon}"></i></span>
                <h3 class="font-bold text-sm text-gray-700">${esc(c.nome)}</h3>
                <span class="text-xs text-gray-400">${c.total} · ${c.atrasadas ? `<b class="text-red-600">${c.atrasadas} atrasada${c.atrasadas > 1 ? 's' : ''}</b> · ` : ''}${c.concluidas} finalizada${c.concluidas === 1 ? '' : 's'}</span>
                <div class="flex-1 border-t border-gray-200"></div>
            </div>
            ${v.lista.filter(r => catDe(r) === c.nome).map(r => cardRotina(r, v)).join('')}
        </section>`).join('');
}

// ---------- lançamento rápido (formulário) ----------
function formRotinaHTML() {
    return `
    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div class="flex items-center justify-between cursor-pointer group" data-action="toggle-rotina-form" title="Ocultar/Mostrar formulário">
            <h3 class="font-bold text-gray-700 text-sm flex items-center gap-2"><i class="fas fa-bolt text-leveros-amarelo"></i> Novo Lançamento Rápido</h3>
            <button type="button" class="text-gray-400 group-hover:text-leveros-verde2 transition-colors"><i id="icone-toggle-rotina" class="fas fa-chevron-down"></i></button>
        </div>
        <form id="form-rotina" class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mt-4 hidden">
            <div><label class="lbl">Data Inicial *</label><input id="nr-data" type="date" class="inp" required value="${hojeISO()}"></div>
            <div><label class="lbl">Prazo <span class="font-normal normal-case text-gray-400">(opcional)</span></label><input id="nr-prazo" type="date" class="inp"></div>
            <div><label class="lbl">Categoria *</label><select id="nr-cat" class="inp">${CATS_ROTINA.map(c => `<option>${c}</option>`).join('')}</select></div>
            <div><label class="lbl">Status *</label><select id="nr-status" class="inp">${STATUS_ROTINA.map(s => `<option ${s === 'Não iniciado' ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div><label class="lbl">Cor</label><div class="mt-1">${seletorCor('nr-cor', PALETA[0], 'w-6 h-6')}</div></div>

            <div class="md:col-span-3"><label class="lbl">Título *</label><input id="nr-titulo" class="inp" required placeholder="Resumo rápido"></div>
            <div class="md:col-span-2"><label class="lbl">Link de Acesso</label><input id="nr-acesso" class="inp" placeholder="https://..."></div>
            <div class="md:col-span-3"><label class="lbl">Descrição</label><input id="nr-desc" class="inp" placeholder="Detalhes adicionais (opcional)"></div>
            <div class="md:col-span-2"><label class="lbl">Observação</label><input id="nr-obs" class="inp" placeholder="Anotações para alteração futura..."></div>
            <div class="md:col-span-5">
                <label class="lbl"><i class="fas fa-user-group mr-1"></i>Apoios <span class="font-normal normal-case text-gray-400">(a atividade também aparecerá na lista deles)</span></label>
                <div class="border border-gray-300 rounded-lg max-h-32 overflow-y-auto divide-y bg-white">${checkboxColabs('nr-colab', [], state.user.email)}</div>
            </div>
            <div class="md:col-span-5 flex justify-end mt-2">
                <button type="submit" class="px-6 py-2 bg-leveros-verde1 text-white rounded-lg hover:bg-leveros-verde2 font-semibold flex items-center justify-center gap-2 shadow-sm"><i class="fas fa-plus"></i> Inserir Atividade</button>
            </div>
        </form>
    </div>`;
}

// ---------- tela completa ----------
export function rotinasHTML() {
    const v = rotinasVisiveis();
    const aba = (modo, icon, rotulo) => `<button data-action="set-rotina-modo" data-modo="${modo}" class="px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${(v.isMinhas ? 'minhas' : 'equipe') === modo ? 'bg-leveros-verde2 text-white' : 'text-gray-500 hover:bg-gray-100'}"><i class="fas ${icon} mr-2"></i>${rotulo}</button>`;
    return `<div id="rotina-view-root">
        <div class="mb-5">
            <h2 class="text-2xl font-bold text-leveros-verde1">Rotina e Atividades Avulsas</h2>
            <p class="text-sm text-gray-500">Registre atividades rápidas que não pertencem a projetos. Ao adicionar Apoio, a atividade aparece também na lista deles. Clique em qualquer atividade para ver tudo e comentar.</p>
        </div>

        <div class="flex gap-2 mb-4 border-b border-gray-200 pb-2">${aba('minhas', 'fa-user', 'Minha Rotina')}${aba('equipe', 'fa-users', 'Visão da Equipe')}</div>

        ${v.isMinhas ? '' : `
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4 flex items-center gap-3 flex-wrap">
            <label class="lbl mb-0">Ver rotina de:</label>
            <select id="f-rotina-resp" class="inp w-auto py-1.5 font-semibold text-leveros-verde1">
                <option value="${TODOS}" ${v.todos ? 'selected' : ''}>👥 Todos os usuários (visão geral)</option>
                ${optionsMembros(v.todos ? '' : v.fResp)}
            </select>
        </div>`}

        <div id="rot-filtros">${filtrosRotinaHTML()}</div>
        <div id="rot-kpis" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">${kpisRotinaHTML(v)}</div>
        <div class="flex items-center gap-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide"><i class="fas fa-layer-group text-leveros-verde2"></i> Atividades por categoria</div>
        <div id="rot-cats" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">${categoriasHTML(v)}</div>

        ${v.isMinhas ? formRotinaHTML() : ''}

        <div id="rot-contagem" class="text-xs text-gray-500 mb-2 px-1">${contagemRotinaHTML(v)}</div>
        <div id="tbody-rotinas" class="flex flex-col">${listaRotinaHTML(v)}</div>
    </div>`;
}

// Atualiza só as regiões de dados. { filtros: true } também refaz a barra de filtros (ex.: clique num card).
// Retorna false se a tela de rotina não está montada.
export function atualizarRotina({ filtros = false } = {}) {
    if (!$('#rotina-view-root')) return false;
    const v = rotinasVisiveis();
    if (filtros) $('#rot-filtros').innerHTML = filtrosRotinaHTML();
    $('#rot-kpis').innerHTML = kpisRotinaHTML(v);
    $('#rot-cats').innerHTML = categoriasHTML(v);
    $('#rot-contagem').innerHTML = contagemRotinaHTML(v);
    $('#tbody-rotinas').innerHTML = listaRotinaHTML(v);
    return true;
}
