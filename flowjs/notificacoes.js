import { doc, updateDoc, db } from './firebase.js';
import { state } from './state.js';
import { $, esc, fmtDataHora } from './utils.js';
import { abrirRotinaDrawer } from './rotina-drawer.js';
import { abrirDrawer as abrirTarefaDrawer } from './tarefas-drawer.js'; // <- Descomentado para as tarefas funcionarem!

// Desenha a interface do sino (chamada pelo listeners.js sempre que há novidades no Firestore)
export function renderizarSinoNotificacoes() {
    const badge = $('#badge-notificacoes');
    const lista = $('#lista-notificacoes');
    if (!badge || !lista) return;
    if (!state.notificacoes) return;

    const ms = n => n.data_criacao?.toMillis?.() ?? Date.now(); // pendente (sem timestamp) = agora

    // Histórico completo (últimas 30), mais recentes primeiro
    const todas = [...state.notificacoes].sort((a, b) => ms(b) - ms(a)).slice(0, 30);
    const qtdNaoLidas = todas.filter(n => !n.lida).length;

    if (qtdNaoLidas > 0) {
        badge.textContent = qtdNaoLidas > 99 ? '99+' : qtdNaoLidas;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (todas.length === 0) {
        lista.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Nenhuma notificação.</p>`;
        return;
    }

    lista.innerHTML = todas.map(notif => `
        <div class="p-3 rounded-md cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex items-start gap-2
                    ${notif.lida ? 'opacity-60 hover:bg-gray-50' : 'bg-blue-50/60 hover:bg-blue-100'}"
             data-action="abrir-notificacao"
             data-id="${esc(notif.id)}"
             data-modulo="${esc(notif.rota?.modulo || '')}"
             data-item="${esc(notif.rota?.item_id || '')}"
             data-comentario="${esc(notif.rota?.comentario_id || '')}">
            <span class="mt-1.5 w-2 h-2 rounded-full shrink-0 ${notif.lida ? 'bg-transparent' : 'bg-leveros-azul'}"></span>
            <div class="min-w-0">
                <p class="text-sm ${notif.lida ? 'text-gray-500' : 'text-gray-800 font-medium'}">${esc(notif.mensagem)}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">${fmtDataHora(ms(notif))}</p>
            </div>
        </div>
    `).join('');
}

// Ações exportadas para o seu arquivo events.js (ou main.js)
export const acoesNotificacoes = {
    'toggle-notificacoes': () => {
        $('#dropdown-notificacoes')?.classList.toggle('hidden');
    },

    'marcar-todas-lidas': () => {
    if (!state.notificacoes) return;
    state.notificacoes
        .filter(n => !n.lida)
        .forEach(n => updateDoc(doc(db, 'notificacoes', n.id), { lida: true }));
    },

    'abrir-notificacao': async (dataset) => {
        const { id, modulo, item, comentario } = dataset;

        // Oculta dropdown e marca lida no banco
        $('#dropdown-notificacoes')?.classList.add('hidden');
        updateDoc(doc(db, 'notificacoes', id), { lida: true }).catch(()=>{});

        // 1. Navega para a view do menu principal simulando um clique
        const viewDeDestino = modulo === 'rotina' ? 'rotina' : modulo === 'tarefas' ? 'quadro' : 'dores';
        const navButton = document.querySelector(`[data-view="${viewDeDestino}"]`);
        if (navButton) navButton.click();

        // 2. Aguarda a view carregar e abre o painel lateral correspondente
        setTimeout(() => {
            if (modulo === 'rotina') abrirRotinaDrawer(item);
            if (modulo === 'tarefas') abrirTarefaDrawer(item); // O nome da importação é 'abrirDrawer' mas apelidamos de 'abrirTarefaDrawer'
            // if (modulo === 'dores') abrirDorDrawer(item); // Descomente quando implementar nas dores

            // 3. Destaca o comentário específico com scroll e fundo amarelo temporário
            if (comentario && comentario !== 'undefined') {
                setTimeout(() => {
                    const commentElement = document.getElementById(comentario);
                    if (commentElement) {
                        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        commentElement.classList.add('bg-yellow-100'); 
                        setTimeout(() => commentElement.classList.remove('bg-yellow-100'), 2500);
                    }
                }, 600); // Aguarda o drawer finalizar a animação de abertura
            }
        }, 300); // Tempo da transição de views do menu lateral
    }
};
