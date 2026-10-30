// Eventos globais: um único ponto de entrada que despacha para os mapas de cada módulo.
import { acoesNotificacoes } from './notificacoes.js';
import { auth, provider, signInWithPopup, signOut } from './firebase.js';
import { mostrarErroLogin } from './auth.js';
import { acoesDores, changeDores, inputDores, submitsDores } from './dores-eventos.js';
import { exportarRelatorioExcel } from './export.js';
import { toast } from './helpers.js';
import { fecharModal } from './modals.js';
import { navegar } from './render.js';
import { comentarRotina } from './rotina-drawer.js';
import { acoesRotina, changeRotina, inputRotina, submitsRotina } from './rotina-eventos.js';
import { state } from './state.js';
import { enviarComentario, moverStatus } from './tarefas-acoes.js';
import { fecharDrawer } from './tarefas-drawer.js';
import { acoesTarefas, changeTarefas, submitsTarefas } from './tarefas-eventos.js';
import { $ } from './utils.js';
import { acoesViews, changeViews, inputViews, submitsViews } from './views-eventos.js';

const acoesCore = {
    login: () => {
        $('#login-error').classList.add('hidden');
        signInWithPopup(auth, provider).catch(() => mostrarErroLogin('Não foi possível entrar.'));
    },
    logout: () => { if (confirm('Deseja sair?')) signOut(auth); },
    nav: (d) => navegar(d.view),
    'fechar-drawer': () => fecharDrawer(),
    'fechar-modal': () => fecharModal(),
    'exportar-excel': () => exportarRelatorioExcel()
};

export function initEvents() {
    // ─── AQUI ESTÁ A LIGAÇÃO: ...acoesNotificacoes adicionado ───
    const acoes = { ...acoesCore, ...acoesViews, ...acoesTarefas, ...acoesRotina, ...acoesDores, ...acoesNotificacoes };
    const submits = { ...submitsViews, ...submitsTarefas, ...submitsRotina, ...submitsDores };

    document.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fn = submits[e.target.id];
        if (!fn) return;
        const btn = e.target.querySelector('button[type=submit]'), original = btn?.innerHTML;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguarde...'; }
        const reabilitar = () => { if (btn) { btn.disabled = false; btn.innerHTML = original; } };
        try {
            if (await fn(btn) === 'reabilitar') reabilitar();
        } catch (err) {
            toast(err.code ? 'Erro ao salvar. Verifique permissões.' : (err.message || 'Erro ao salvar.'), 'erro');
            reabilitar();
        }
    });

    document.addEventListener('click', async (e) => {
        const el = e.target.closest('[data-action]');
        if (el) await acoes[el.dataset.action]?.(el.dataset, el);

        // ─── LÓGICA PARA FECHAR O MENU DO SINO AO CLICAR FORA ───
        const drop = document.getElementById('dropdown-notificacoes');
        if (drop && !drop.classList.contains('hidden')) {
            const clicouNoSino = e.target.closest('[data-action="toggle-notificacoes"]');
            const clicouNoMenu = e.target.closest('#dropdown-notificacoes');
            if (!clicouNoSino && !clicouNoMenu) {
                drop.classList.add('hidden');
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role=button][data-action]')) { e.preventDefault(); e.target.click(); return; }
        if (e.key === 'Escape') { if (!$('#modal').classList.contains('hidden')) fecharModal(); else fecharDrawer(); }
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.target.id === 'dt-comentario' && state.drawerTaskId) { e.preventDefault(); enviarComentario(state.drawerTaskId); }
            if (e.target.id === 'rt-comentario' && state.drawerRotinaId) { e.preventDefault(); comentarRotina(state.drawerRotinaId); }
        }
    });

    document.addEventListener('input', (e) => { inputViews(e); inputRotina(e); inputDores(e); });
    document.addEventListener('change', async (e) => { changeViews(e); await changeRotina(e); await changeDores(e); changeTarefas(e); });

    // Arrastar e soltar (quadro)
    document.addEventListener('dragstart', (e) => {
        const card = e.target.closest?.('.task-card'); if (!card) return;
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('dragging'), 0);
    });
    document.addEventListener('dragend', (e) => {
        e.target.closest?.('.task-card')?.classList.remove('dragging');
        document.querySelectorAll('.drop-over').forEach(x => x.classList.remove('drop-over'));
    });
    document.addEventListener('dragover', (e) => {
        const z = e.target.closest?.('[data-drop]'); if (!z) return;
        e.preventDefault();
        document.querySelectorAll('.drop-over').forEach(x => { if (x !== z) x.classList.remove('drop-over'); });
        z.classList.add('drop-over');
    });
    document.addEventListener('drop', async (e) => {
        const z = e.target.closest?.('[data-drop]'); if (!z) return;
        e.preventDefault(); z.classList.remove('drop-over');
        const id = e.dataTransfer.getData('text/plain');
        if (id) await moverStatus(id, z.dataset.drop);
    });
}
