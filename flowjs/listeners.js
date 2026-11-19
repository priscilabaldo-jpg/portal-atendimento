// Listeners em tempo real do Firestore.
import { collection, db, onSnapshot, query, where } from './firebase.js';
import { ouvirDores } from './dores-data.js';
import { nomeDoEmail, toast } from './helpers.js';
import { render } from './render.js';
import { state } from './state.js';
import { fecharDrawer, atualizarTimelineNoDrawer } from './tarefas-drawer.js';
import { renderizarSinoNotificacoes } from './notificacoes.js';

export function pararListeners() {
    state.unsubs.forEach(u => u());
    state.unsubs = [];
    if (state.unsubFeed) { state.unsubFeed(); state.unsubFeed = null; }

    state.loaded = { membros: false, projetos: false, cronogramas: false, tarefas: false, solicitacoes: false, rotinas: false, notificacoes: false };
    fecharDrawer();
}

export function iniciarListeners() {
    pararListeners();
    const ouvir = (nome, colecao, map) => {
        const u = onSnapshot(collection(db, colecao), (snap) => {
            state[nome] = snap.docs.map(d => map({ id: d.id, ...d.data() }));
            state.loaded[nome] = true;

            // Mantém a linha do tempo do drawer sincronizada com a tarefa aberta
            if (nome === 'tarefas' && state.drawerTaskId) atualizarTimelineNoDrawer(state.drawerTaskId);

            if (Object.values(state.loaded).every(Boolean)) render();
        }, (err) => {
            toast(`Erro ao carregar "${colecao}". Verifique as regras do Firestore.`, 'erro');
        });
        state.unsubs.push(u);
    };

    ouvir('membros', 'proj_membros', (m) => ({ ...m, email: (m.email || m.id).toLowerCase(), nome: m.nome || nomeDoEmail(m.id) }));
    ouvir('projetos', 'projetos', (p) => p);
    ouvir('cronogramas', 'cronogramas', (c) => c);
    ouvir('tarefas', 'tarefas', (t) => t);
    ouvir('solicitacoes', 'solicitacoes', (x) => x);
    ouvir('rotinas', 'rotinas', (r) => r);

    // Listener de notificações do usuário logado
    const qNotificacoes = query(
        collection(db, 'notificacoes'),
        where('usuario_destino', '==', state.user.email)
    );
    const uNotificacoes = onSnapshot(qNotificacoes, (snap) => {
        state.notificacoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        state.loaded.notificacoes = true;

        // Sempre que o banco atualizar, redesenha o HTML do sino
        renderizarSinoNotificacoes();

        if (Object.values(state.loaded).every(Boolean)) render();
    }, (err) => {
        toast('Erro ao carregar notificações.', 'erro');
    });
    state.unsubs.push(uNotificacoes);

    ouvirDores();
}
