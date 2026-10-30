// Rotina Diária — cliques, formulários e filtros.
import { addDoc, arrayRemove, arrayUnion, collection, db, doc, serverTimestamp, updateDoc } from '../firebase.js';
import { PALETA } from '../constants.js';
import { colabsMarcados, getMembro, toast } from '../helpers.js';
import { fecharModal } from '../modals.js';
import { render } from '../render.js';
import { podeEditarRotina, podeGerirRotina, rotinaOcultaPara, TODOS } from './data.js';
import { abrirRotinaDrawer, alternarConclusaoRotina, comentarRotina, excluirRotina, mudarStatusRotina } from './drawer.js';
import { modalEditarRotina } from './modals.js';
import { atualizarRotina } from './view.js';
import { state } from '../state.js';
import { $, primeiroNome } from '../utils.js';

const refiltrarRotina = () => atualizarRotina({ filtros: true });

export const acoesRotina = {
    'set-rotina-modo': (d) => {
        const f = state.filtros;
        f.rotinaModo = d.modo;
        if (d.modo === 'minhas') f.rotinaResp = state.user.email;
        else if (!f.rotinaResp || f.rotinaResp === state.user.email) f.rotinaResp = TODOS;
        render(true);
    },
    'toggle-ver-ocultas': () => { state.filtros.rotinaOcultas = !state.filtros.rotinaOcultas; refiltrarRotina(); },
    'rotina-agrupar': () => { state.filtros.rotinaAgrupar = !state.filtros.rotinaAgrupar; refiltrarRotina(); },

    // card de situação (Atrasadas / Vencem hoje / Pendentes / Finalizadas): clicar de novo limpa
    'rotina-sit': (d) => { const f = state.filtros; f.rotinaSit = f.rotinaSit === d.sit ? '' : d.sit; refiltrarRotina(); },

    // card de categoria (cabeçalho = só categoria; contador = categoria + situação)
    'rotina-cat': (d) => {
        const f = state.filtros;
        if (!d.sit) f.rotinaCat = f.rotinaCat === d.cat ? '' : d.cat;
        else if (f.rotinaCat === d.cat && f.rotinaSit === d.sit) { f.rotinaCat = ''; f.rotinaSit = ''; }
        else { f.rotinaCat = d.cat; f.rotinaSit = d.sit; }
        refiltrarRotina();
    },
    'rotina-limpar-filtro': (d) => {
        const f = state.filtros;
        ({ busca: () => { f.rotinaBusca = ''; }, cat: () => { f.rotinaCat = ''; }, status: () => { f.rotinaStatus = ''; }, sit: () => { f.rotinaSit = ''; } })[d.campo]?.();
        refiltrarRotina();
    },
    'limpar-filtros-rotina': () => {
        Object.assign(state.filtros, { rotinaBusca: '', rotinaCat: '', rotinaStatus: '', rotinaSit: '', rotinaOrdem: 'data-desc', rotinaOcultas: false });
        refiltrarRotina();
    },

    'toggle-rotina-form': () => {
        const form = $('#form-rotina'), icon = $('#icone-toggle-rotina');
        if (!form || !icon) return;
        form.classList.toggle('hidden');
        const aberto = !form.classList.contains('hidden');
        icon.classList.toggle('fa-chevron-up', aberto); icon.classList.toggle('fa-chevron-down', !aberto);
    },

    'rotina-ver': (d) => abrirRotinaDrawer(d.id),
    'rotina-comentar': (d) => comentarRotina(d.id),
    'editar-rotina': (d) => modalEditarRotina(d.id),
    'excluir-rotina': (d) => excluirRotina(d.id),
    'rotina-toggle-status': (d) => alternarConclusaoRotina(d.id),
    'toggle-ocultar-rotina': async (d) => {
        const r = state.rotinas.find(x => x.id === d.id); if (!r) return;
        try {
            const me = state.user.email, ocultaAgora = rotinaOcultaPara(r, me);
            await updateDoc(doc(db, 'rotinas', d.id), r.responsavelEmail === me
                ? { oculta: !ocultaAgora, atualizadoEm: serverTimestamp() }
                : { ocultaPara: ocultaAgora ? arrayRemove(me) : arrayUnion(me) });
            toast(ocultaAgora ? 'Atividade visível novamente.' : 'Atividade oculta da lista.');
        } catch (err) { toast('Erro ao ocultar atividade.', 'erro'); }
    }
};

export const submitsRotina = {
    'form-rotina': async (btn) => {
        const emails = colabsMarcados('nr-colab').filter(em => em !== state.user.email);
        await addDoc(collection(db, 'rotinas'), {
            data: $('#nr-data').value,
            prazo: $('#nr-prazo').value || null,
            categoria: $('#nr-cat').value,
            cor: document.querySelector('input[name=nr-cor]:checked')?.value || PALETA[0],
            titulo: $('#nr-titulo').value.trim(),
            descricao: $('#nr-desc').value.trim(),
            acesso: $('#nr-acesso').value.trim(),
            observacao: $('#nr-obs').value.trim(),
            status: $('#nr-status').value,
            oculta: false,
            colaboradoresEmails: emails,
            ocultaPara: [],
            responsavelEmail: state.user.email,
            criadoPorEmail: state.user.email,
            comentariosCount: 0,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
        });
        toast(emails.length ? `Atividade inserida e compartilhada com ${emails.map(em => primeiroNome(getMembro(em).nome)).join(', ')}.` : 'Atividade inserida na rotina com sucesso!');
        ['#nr-titulo', '#nr-desc', '#nr-acesso', '#nr-obs', '#nr-prazo'].forEach(s => { $(s).value = ''; });
        document.querySelectorAll('input[name=nr-colab]').forEach(cb => { cb.checked = false; });
        return 'reabilitar';
    },

    'form-editar-rotina': async () => {
        const id = $('#er-id').value, r = state.rotinas.find(x => x.id === id);
        if (!r || !podeEditarRotina(r)) throw new Error('Você não tem permissão para editar esta atividade.');
        const upd = {
            data: $('#er-data').value,
            prazo: $('#er-prazo').value || null,
            categoria: $('#er-cat').value,
            cor: document.querySelector('input[name=er-cor]:checked')?.value || PALETA[0],
            status: $('#er-status').value,
            titulo: $('#er-titulo').value.trim(),
            descricao: $('#er-desc').value.trim(),
            acesso: $('#er-acesso').value.trim(),
            observacao: $('#er-obs').value.trim(),
            atualizadoEm: serverTimestamp()
        };
        if (podeGerirRotina(r)) upd.colaboradoresEmails = colabsMarcados('er-colab').filter(em => em !== r.responsavelEmail);
        await updateDoc(doc(db, 'rotinas', id), upd);
        fecharModal();
        toast('Atividade atualizada com sucesso!');
    }
};

// busca: só atualiza as regiões de dados (a barra de filtros e o campo digitado não são recriados)
export const inputRotina = (e) => {
    if (e.target.id === 'f-rotina-q') { state.filtros.rotinaBusca = e.target.value; atualizarRotina(); }
};

export const changeRotina = async (e) => {
    const { id, value } = e.target, f = state.filtros;
    const filtro = { 'f-rotina-cat': 'rotinaCat', 'f-rotina-status': 'rotinaStatus', 'f-rotina-sit': 'rotinaSit', 'f-rotina-ordem': 'rotinaOrdem', 'f-rotina-resp': 'rotinaResp' }[id];
    if (filtro) { f[filtro] = value; atualizarRotina(); }
    if (id === 'rt-status') await mudarStatusRotina(state.drawerRotinaId, value);
};
