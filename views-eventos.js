// Projetos, cronogramas, equipe, quadro e dashboard — cliques, formulários e filtros.
import { addDoc, collection, db, doc, serverTimestamp, setDoc, updateDoc } from './firebase.js';
import { DOMINIO } from './config.js';
import { PALETA } from './constants.js';
import { getProjeto, toast } from './helpers.js';
import { fecharModal, modalCronograma, modalEditarProjeto, modalMembro, modalProjeto } from './modals.js';
import { navegar, render } from './render.js';
import { state } from './state.js';
import { excluirCronograma, excluirMembro, excluirProjeto } from './tarefas-acoes.js';
import { $ } from './utils.js';
import { boardHTML } from './views-quadro.js';

export const acoesViews = {
    'abrir-projeto': (d) => navegar('projeto', d.id),
    'novo-projeto': () => modalProjeto(),
    'editar-projeto': (d) => modalEditarProjeto(d.id),
    'novo-cronograma': (d) => modalCronograma(d.projeto),
    'novo-membro': () => modalMembro(),
    'toggle-concluidas': () => { state.minhasMostrarConcluidas = !state.minhasMostrarConcluidas; render(true); },
    'ver-quadro': (d) => { state.filtros = { ...state.filtros, projeto: d.projeto, resp: '', q: '', sit: '' }; navegar('quadro'); },
    'filtrar-quadro': (d) => { state.filtros = { ...state.filtros, projeto: d.projeto || '', resp: d.resp || '', q: '', sit: d.sit || '' }; navegar('quadro'); },
    'filtro-minhas': () => { state.filtros.resp = state.user.email; navegar('quadro'); },
    'limpar-filtros': () => { state.filtros = { ...state.filtros, projeto: '', resp: '', q: '', sit: '' }; navegar('quadro'); },
    'excluir-cronograma': (d) => excluirCronograma(d.id),
    'excluir-projeto': (d) => excluirProjeto(d.id),
    'excluir-membro': (d) => excluirMembro(d.email),
    'arquivar-projeto': async (d) => {
        const p = getProjeto(d.id);
        await updateDoc(doc(db, 'projetos', d.id), { status: p.status === 'arquivado' ? 'ativo' : 'arquivado' });
        toast(p.status === 'arquivado' ? 'Projeto reativado.' : 'Projeto arquivado.');
    }
};

export const submitsViews = {
    'form-projeto': async () => {
        const ref = await addDoc(collection(db, 'projetos'), {
            nome: $('#np-nome').value.trim(),
            inicio: $('#np-inicio').value,
            descricao: $('#np-desc').value.trim(),
            dor: $('#np-dor').value.trim(),
            sanar: $('#np-sanar').value.trim(),
            kpi: $('#np-kpi').value.trim(),
            cor: document.querySelector('input[name=np-cor]:checked')?.value || PALETA[0],
            status: 'ativo',
            criadoPorEmail: state.user.email,
            criadoPorNome: state.user.nome,
            criadoEm: serverTimestamp()
        });
        const nCron = $('#np-cron').value.trim();
        if (nCron) await addDoc(collection(db, 'cronogramas'), { projetoId: ref.id, nome: nCron, criadoPorEmail: state.user.email, criadoEm: serverTimestamp() });
        fecharModal(); toast('Projeto criado.'); navegar('projeto', ref.id);
    },
    'form-editar-projeto': async () => {
        await updateDoc(doc(db, 'projetos', $('#ep-id').value), {
            nome: $('#ep-nome').value.trim(),
            inicio: $('#ep-inicio').value,
            descricao: $('#ep-desc').value.trim(),
            dor: $('#ep-dor').value.trim(),
            sanar: $('#ep-sanar').value.trim(),
            kpi: $('#ep-kpi').value.trim(),
            cor: document.querySelector('input[name=ep-cor]:checked')?.value || PALETA[0],
            atualizadoEm: serverTimestamp()
        });
        fecharModal(); toast('Projeto atualizado com sucesso!');
    },
    'form-cronograma': async () => {
        await addDoc(collection(db, 'cronogramas'), { projetoId: $('#nc-projeto').value, nome: $('#nc-nome').value.trim(), criadoPorEmail: state.user.email, criadoEm: serverTimestamp() });
        fecharModal(); toast('Cronograma criado.');
    },
    'form-membro': async () => {
        const email = $('#nm-email').value.trim().toLowerCase();
        if (!email.endsWith(DOMINIO)) throw new Error(`Use um e-mail ${DOMINIO}`);
        await setDoc(doc(db, 'proj_membros', email), { email, nome: $('#nm-nome').value.trim(), foto: '', preCadastro: true }, { merge: true });
        fecharModal(); toast('Membro adicionado à equipe.');
    }
};

export const inputViews = (e) => {
    if (e.target.id === 'f-q') { state.filtros.q = e.target.value; $('#board').innerHTML = boardHTML(); }
    if (e.target.id === 'busca-projeto-dash') {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('.dash-projeto-card').forEach(card => { card.style.display = card.dataset.nome.toLowerCase().includes(termo) ? '' : 'none'; });
    }
};

export const changeViews = (e) => {
    const filtro = { 'f-projeto': 'projeto', 'f-resp': 'resp', 'f-sit': 'sit' }[e.target.id];
    if (filtro) { state.filtros[filtro] = e.target.value; $('#board').innerHTML = boardHTML(); }
};
