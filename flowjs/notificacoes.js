import { doc, updateDoc, db } from './firebase.js';
import { state } from './state.js';
import { $ } from './utils.js';
import { abrirRotinaDrawer } from './rotina-drawer.js';
import { abrirDrawer as abrirTarefaDrawer } from './tarefas-drawer.js'; // <- Descomentado para as tarefas funcionarem!

// Desenha a interface do sino (chamada pelo listeners.js sempre que há novidades no Firestore)
export function renderizarSinoNotificacoes() {
    const badge = $('#badge-notificacoes');
    const lista = $('#lista-notificacoes');
    if (!badge || !lista) return;

    // Se as notificações ainda não foram carregadas, sai silenciosamente
    if (!state.notificacoes) return;

    // Filtra apenas as não lidas e ordena da mais recente para a mais antiga
    const naoLidas = state.notificacoes
        .filter(n => !n.lida)
        .sort((a, b) => (b.data_criacao?.toMillis() || 0) - (a.data_criacao?.toMillis() || 0));

    // Atualiza Badge
    if (naoLidas.length > 0) {
        badge.textContent = naoLidas.length > 99 ? '99+' : naoLidas.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Renderiza Lista
    if (naoLidas.length === 0) {
        lista.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Nenhuma notificação nova.</p>`;
        return;
    }

    lista.innerHTML = naoLidas.map(notif => `
        <div class="p-3 hover:bg-blue-50 rounded-md cursor-pointer transition-colors border-b border-gray-50 last:border-0" 
             data-action="abrir-notificacao" 
             data-id="${notif.id}" 
             data-modulo="${notif.rota?.modulo}" 
             data-item="${notif.rota?.item_id}"
             data-comentario="${notif.rota?.comentario_id}">
            <p class="text-sm text-gray-700">${notif.mensagem}</p>
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
        const naoLidas = state.notificacoes.filter(n => !n.lida);
        naoLidas.forEach(n => updateDoc(doc(db, 'notificacoes', n.id), { lida: true }));
        $('#dropdown-notificacoes')?.classList.add('hidden');
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
