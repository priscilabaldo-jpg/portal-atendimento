// Tarefas (drawer, solicitações, colaboração) — cliques, formulários e campos dinâmicos.
import { addDoc, collection, db, serverTimestamp } from './firebase.js';
import { colabsMarcados, getMembro, getOrigemTarefa, getTarefa, optionsCron, toast } from './helpers.js';
import { adicionarPessoaRapida, fecharModal, modalTarefa } from './modals.js';
import { state } from './state.js';
import { adicionarColaborador, enviarComentario, excluirTarefa, logAtividade, moverStatus, notificarAtribuicao, removerColaborador, salvarTarefa } from './tarefas-acoes.js';
import { abrirDrawer } from './tarefas-drawer.js';
import { atualizarCamposSolicitacao, cancelarSolicitacao, criarSolicitacao, modalSolicitacao, responderSolicitacao } from './tarefas-solicitacoes.js';
import { $, fmtBR } from './utils.js';

export const acoesTarefas = {
    'abrir-tarefa': (d) => abrirDrawer(d.id),
    'nova-tarefa': (d) => modalTarefa(d.projeto || '', d.cron || '', d.dor || ''),
    'add-pessoa-rapida': () => adicionarPessoaRapida(),
    'mudar-status': (d) => moverStatus(d.id, d.status),
    'solicitar': (d) => modalSolicitacao(d.id, d.tipo || ''),
    'responder-sol': (d) => responderSolicitacao(d.id, d.aceitar === '1'),
    'cancelar-sol': (d) => cancelarSolicitacao(d.id),
    'add-colab': (d) => adicionarColaborador(d.id),
    'remover-colab': (d) => removerColaborador(d.id, d.email),
    'salvar-tarefa': (d) => salvarTarefa(d.id),
    'enviar-comentario': (d) => enviarComentario(d.id),
    'excluir-tarefa': (d) => excluirTarefa(d.id)
};

export const submitsTarefas = {
    'form-solicitacao': () => criarSolicitacao(),
    'form-tarefa': async () => {
        const dorId = $('#nt-dor')?.value || '';
        const projetoId = $('#nt-projeto')?.value || null;
        let cronogramaId = $('#nt-cron')?.value || null;
        if (!dorId && !cronogramaId) {
            const r = await addDoc(collection(db, 'cronogramas'), { projetoId, nome: 'Geral', criadoPorEmail: state.user.email, criadoEm: serverTimestamp() });
            cronogramaId = r.id;
        }
        const respEmail = $('#nt-resp').value;
        const colaboradoresEmails = colabsMarcados('nt-colab').filter(em => em !== respEmail);
        const dados = {
            projetoId: dorId ? null : projetoId,
            cronogramaId: dorId ? null : cronogramaId,
            dorId: dorId || null,
            titulo: $('#nt-titulo').value.trim(), descricao: $('#nt-desc').value.trim(),
            responsavelEmail: respEmail, responsavelNome: getMembro(respEmail).nome,
            colaboradoresEmails,
            prazo: $('#nt-prazo').value, prioridade: $('#nt-prio').value, status: $('#nt-status').value,
            historicoPrazos: [], comentariosCount: 0,
            criadoPorEmail: state.user.email, criadoPorNome: state.user.nome,
            criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp()
        };
        const ref = await addDoc(collection(db, 'tarefas'), dados);
        await logAtividade(ref.id, `criou a tarefa e atribuiu a ${dados.responsavelNome} (prazo ${fmtBR(dados.prazo)})`);
        if (colaboradoresEmails.length) await logAtividade(ref.id, `incluiu como colaborador(es): ${colaboradoresEmails.map(em => getMembro(em).nome).join(', ')}`);
        fecharModal(); toast('Tarefa criada.');
        await notificarAtribuicao(dados, getOrigemTarefa(dados));
    }
};

export const changeTarefas = (e) => {
    const { id, value } = e.target;
    if (id === 'sl-tipo') atualizarCamposSolicitacao();
    if (id === 'nt-projeto') $('#nt-cron').innerHTML = optionsCron(value) || '<option value="">Geral (será criado)</option>';
    if (id === 'nt-resp') {
        document.querySelectorAll('input[name=nt-colab]').forEach(cb => {
            const igual = cb.value === value;
            if (igual) cb.checked = false;
            cb.disabled = igual;
            cb.closest('label').classList.toggle('opacity-40', igual);
        });
    }
    if (id === 'dt-prazo') {
        const t = getTarefa(state.drawerTaskId);
        $('#dt-motivo-wrap').classList.toggle('hidden', !t || value === t.prazo);
    }
};
