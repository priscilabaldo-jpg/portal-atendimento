// Navegação e renderização da view atual.
import { renderizarTarefasDaDor } from './dores/form.js';
import { atualizarDores, doresOperacionaisHTML } from './dores/view.js';
import { getTarefa, situacao } from './helpers.js';
import { atualizarDrawerRotina } from './rotina/drawer.js';
import { atualizarRotina, rotinasHTML } from './rotina/view.js';
import { state } from './state.js';
import { abrirDrawer } from './tarefas/drawer.js';
import { ehColaborador, ehResponsavel, permKey } from './tarefas/permissoes.js';
import { colabSectionHTML, solicitacoesRecebidas } from './tarefas/solicitacoes.js';
import { $, hojeISO } from './utils.js';
import { dashboardHTML } from './views/dashboard.js';
import { minhasHTML } from './views/minhas.js';
import { projetoDetalheHTML, projetosHTML } from './views/projetos.js';
import { boardHTML, quadroHTML } from './views/quadro.js';

export function navegar(view, projetoId = null) {
    state.view = view;
    state.projetoAtual = projetoId;
    render(true);
    $('main').scrollTop = 0;
}

export function render(forcar = false) {
    if (!state.user || !Object.values(state.loaded).every(Boolean)) return;
    state.diaAtual = hojeISO();

    const minhas = state.tarefas.filter(t => (ehResponsavel(t) || ehColaborador(t)) && t.status !== 'Validado');
    const urg = minhas.filter(t => ['atrasada', 'breve'].includes(situacao(t).key)).length + solicitacoesRecebidas().length;
    const badge = $('#badge-minhas');
    badge.textContent = urg; badge.classList.toggle('hidden', urg === 0);

    if (state.drawerRotinaId) atualizarDrawerRotina();
    if (state.drawerTaskId) {
        const dt = getTarefa(state.drawerTaskId);
        if (dt) {
            if (permKey(dt) !== state.drawerPerm) abrirDrawer(dt.id);
            else { const el = $('#dr-colab'); if (el) el.innerHTML = colabSectionHTML(dt); }
        }
    }

    document.querySelectorAll('.nav-btn').forEach(b => {
        const ativo = b.dataset.view === state.view || (b.dataset.view === 'projetos' && state.view === 'projeto');
        b.classList.toggle('bg-leveros-verde2', ativo);
    });

    if (!forcar && state.view === 'quadro' && $('#board')) {
        $('#board').innerHTML = boardHTML();
        return;
    }

    if (!forcar && state.view === 'rotina' && atualizarRotina()) return;

    if (!forcar && state.view === 'dores' && $('#dores-root')) {
        atualizarDores();
        return;
    }

    const v = $('#view');
    if (state.view === 'dashboard') v.innerHTML = dashboardHTML();
    else if (state.view === 'minhas') v.innerHTML = minhasHTML();
    else if (state.view === 'quadro') v.innerHTML = quadroHTML();
    else if (state.view === 'projetos') v.innerHTML = projetosHTML();
    else if (state.view === 'projeto') v.innerHTML = projetoDetalheHTML();
    else if (state.view === 'rotina') v.innerHTML = rotinasHTML();
    else if (state.view === 'dores') v.innerHTML = doresOperacionaisHTML();
    v.firstElementChild?.classList.add('fade-in');

    // Atualiza lista de tarefas dentro da Dor se o modal estiver aberto
    if ($('#modal') && !$('#modal').classList.contains('hidden') && $('#dr-id')) {
        renderizarTarefasDaDor($('#dr-id').value);
    }
}

setInterval(() => { if (state.user && state.diaAtual && state.diaAtual !== hojeISO()) render(true); }, 60000);
