// Tarefas (drawer, solicitações, colaboração) — cliques, formulários e campos dinâmicos.
import { addDoc, collection, db, serverTimestamp } from './firebase.js';
import { colabsMarcados, getMembro, getOrigemTarefa, getTarefa, optionsCron, toast } from './helpers.js';
import { adicionarPessoaRapida, fecharModal, modalTarefa } from './modals.js';
import { state } from './state.js';
// <-- Note as 3 novas funções importadas no final desta linha:
import { adicionarColaborador, enviarComentario, excluirTarefa, logAtividade, moverStatus, notificarAtribuicao, removerColaborador, salvarTarefa, adicionarSubtarefa, atualizarSubtarefasArray } from './tarefas-acoes.js';
import { abrirDrawer, atualizarTimelineNoDrawer } from './tarefas-drawer.js';
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
    'excluir-tarefa': (d) => excluirTarefa(d.id),

    // ==========================================
    // AÇÕES DAS SUBTAREFAS
    // ==========================================
    'nova-subtarefa': async (d, event) => {
        const input = document.getElementById('input-nova-subtarefa');
        const titulo = input?.value.trim();
        const btn = event.target.closest('button');
        
        if (titulo && btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            await adicionarSubtarefa(d.tarefaId, titulo);
            
            // Não precisamos recarregar todo o drawer manualmente aqui, 
            // pois se você estiver usando onSnapshot na Tarefa, ela atualizará o UI sozinha.
            // Mas caso a sua tarefa não escute as mudanças automaticamente, você chama:
            // atualizarTimelineNoDrawer(d.tarefaId);
            
            input.value = '';
            btn.disabled = false;
            btn.textContent = 'Adicionar';
        }
    },
    
    'excluir-subtarefa': async (d) => {
        if (!confirm('Deseja excluir esta etapa da linha do tempo?')) return;
        
        const t = getTarefa(d.tarefaId);
        if (!t || !t.subtarefas) return;
        
        // Remove do array local
        const novoArray = t.subtarefas.filter(s => s.id !== d.subId);
        
        // Salva no Firebase
        await atualizarSubtarefasArray(d.tarefaId, novoArray);
        
        // Atualiza a tela (útil se você não usa Snapshot dinâmico nas tarefas)
        atualizarTimelineNoDrawer(d.tarefaId);
        toast('Etapa removida.');
    }
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
            criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
            subtarefas: [] // Inicializa o array de subtarefas já na criação da tarefa
        };
        const ref = await addDoc(collection(db, 'tarefas'), dados);
        await logAtividade(ref.id, `criou a tarefa e atribuiu a ${dados.responsavelNome} (prazo ${fmtBR(dados.prazo)})`);
        if (colaboradoresEmails.length) await logAtividade(ref.id, `incluiu como colaborador(es): ${colaboradoresEmails.map(em => getMembro(em).nome).join(', ')}`);
        fecharModal(); toast('Tarefa criada.');
        await notificarAtribuicao(dados, getOrigemTarefa(dados));
    }
};

export const changeTarefas = async (e) => {
    const { id, value, dataset, checked } = e.target;
    
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

    // ==========================================
    // CHECKBOX DA SUBTAREFA (MUDANÇA DE STATUS)
    // ==========================================
    if (dataset && dataset.action === 'toggle-subtarefa') {
        const tarefaId = dataset.tarefaId;
        const subId = dataset.subId;
        const t = getTarefa(tarefaId);
        
        if (!t || !t.subtarefas) return;
        
        // Clona e atualiza o array
        const novoArray = t.subtarefas.map(s => {
            if (s.id === subId) {
                return { ...s, status: checked ? 'concluida' : 'pendente' };
            }
            return s;
        });
        
        // Dispara a gravação pro Firebase
        await atualizarSubtarefasArray(tarefaId, novoArray);
        
        // Atualiza a tela (útil se você não usa Snapshot dinâmico nas tarefas)
        atualizarTimelineNoDrawer(tarefaId);
    }
};
