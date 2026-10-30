import { collection, db, doc, onSnapshot, query, updateDoc, where } from './firebase.js';
import { state } from './state.js';
import { $ } from './utils.js';
// Importe as funções de abrir drawer dos seus módulos, se já existirem:
import { abrirRotinaDrawer } from './rotina-drawer.js';
// import { abrirTarefaDrawer } from './tarefas-drawer.js';
// import { abrirDorDrawer } from './dores-drawer.js';

let unsubNotificacoes = null;

export function iniciarNotificacoes() {
    if (unsubNotificacoes) unsubNotificacoes();

    const badge = $('#badge-notificacoes');
    const lista = $('#lista-notificacoes');
    if (!badge || !lista) return;

    // Escuta em tempo real apenas notificações não lidas destinadas ao utilizador logado
    const q = query(
        collection(db, 'notificacoes'),
        where('usuario_destino', '==', state.user.email),
        where('lida', '==', false)
    );

    unsubNotificacoes = onSnapshot(q, (snap) => {
        const notificacoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Ordenar localmente da mais recente para a mais antiga (caso o orderBy exija índice no Firestore, evitamos erro)
        notificacoes.sort((a, b) => (b.data_criacao?.toMillis() || 0) - (a.data_criacao?.toMillis() || 0));

        // Atualiza o Badge (contador)
        if (notificacoes.length > 0) {
            badge.textContent = notificacoes.length > 99 ? '99+' : notificacoes.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        // Renderiza a lista
        if (notificacoes.length === 0) {
            lista.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">Nenhuma notificação nova.</p>';
            return;
        }

        lista.innerHTML = notificacoes.map(n => `
            <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                 data-action="abrir-notificacao" 
                 data-id="${n.id}" 
                 data-modulo="${n.rota.modulo}" 
                 data-item="${n.rota.item_id}" 
                 data-comentario="${n.rota.comentario_id}">
                <p class="text-[13px] text-gray-700 leading-snug">${n.mensagem}</p>
            </div>
        `).join('');
    });
}

export async function marcarNotificacaoLida(id) {
    try {
        await updateDoc(doc(db, 'notificacoes', id), { lida: true });
    } catch (e) {
        console.error('Erro ao marcar notificação como lida', e);
    }
}

export async function marcarTodasComoLidas() {
    const itens = document.querySelectorAll('[data-action="abrir-notificacao"]');
    itens.forEach(item => marcarNotificacaoLida(item.dataset.id));
}

// Lógica de roteamento: para qual ecrã e painel ir quando clica na notificação
export function processarCliqueNotificacao(dataset) {
    const { id, modulo, item, comentario } = dataset;
    
    // 1. Marca como lida
    marcarNotificacaoLida(id);
    
    // 2. Oculta o dropdown do sino
    $('#dropdown-notificacoes')?.classList.add('hidden');

    // 3. Navega para a view correta simulando um clique no menu principal
    const btnNavegacao = document.querySelector(`[data-view="${modulo === 'rotina' ? 'rotina' : modulo === 'tarefa' ? 'quadro' : 'dores'}"]`);
    if (btnNavegacao) btnNavegacao.click();

    // 4. Aguarda a view renderizar e abre o Drawer/Modal do item
    setTimeout(() => {
        if (modulo === 'rotina') abrirRotinaDrawer(item);
        // if (modulo === 'tarefa') abrirTarefaDrawer(item);
        // if (modulo === 'dores') abrirDorDrawer(item);

        // 5. Scroll suave até o comentário (aguarda o drawer animar)
        if (comentario && comentario !== 'null') {
            setTimeout(() => {
                // Presume-se que o id do elemento HTML do comentário tenha esta estrutura. 
                // Se o seu feedItemHTML cria divs sem ID, teremos de colocar id="comentario-${item.id}" na geração do HTML do comentário.
                const comentEl = document.getElementById(comentario); 
                if (comentEl) {
                    comentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    comentEl.classList.add('bg-yellow-100', 'transition-colors', 'duration-500');
                    setTimeout(() => comentEl.classList.remove('bg-yellow-100'), 2000);
                }
            }, 600);
        }
    }, 200);
}
