// Estado global da aplicação (dados do Firestore em tempo real + filtros + painel aberto).
export const state = {
    user: null,
    membros: [], projetos: [], cronogramas: [], tarefas: [], solicitacoes: [], rotinas: [],
    dores: [], doresLoaded: false, doresErro: false, importDores: null,
    view: 'dashboard',
    projetoAtual: null,
    filtros: {
        projeto: '', resp: '', q: '', sit: '',
        rotinaModo: 'minhas', rotinaResp: '', rotinaBusca: '', rotinaCat: '', rotinaStatus: '', rotinaOrdem: 'data-desc',
        rotinaOcultas: false, rotinaSit: '', rotinaAgrupar: false,
        dores: { q: '', setor: '', prio: '', status: '', quarter: '', grupo: 'setor', modo: 'cards' }
    },
    minhasMostrarConcluidas: false,
    loaded: { membros: false, projetos: false, cronogramas: false, tarefas: false, solicitacoes: false, rotinas: false },
    drawerTaskId: null, drawerRotinaId: null, drawerPerm: '',
    unsubs: [], unsubFeed: null,
    diaAtual: ''
};
