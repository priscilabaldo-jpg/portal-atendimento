// Tarefas — gravações no Firestore (status, salvar, comentários, exclusões) e e-mail de atribuição.
import { addDoc, arrayRemove, arrayUnion, collection, db, deleteDoc, doc, getDocs, increment, serverTimestamp, updateDoc, writeBatch } from '../firebase.js';
import { EMAIL_CONFIG } from '../config.js';
import { badgeSituacao, getMembro, getOrigemTarefa, getProjeto, getTarefa, isAdmin, toast } from '../helpers.js';
import { fecharModal, modalMembro } from '../modals.js';
import { navegar } from '../render.js';
import { state } from '../state.js';
import { fecharDrawer } from './drawer.js';
import { podeAtuar, podeEditarTudo } from './permissoes.js';
import { $, fmtBR } from '../utils.js';

export async function adicionarColaborador(tid) {
    const t = getTarefa(tid); const email = $('#dt-add-colab')?.value;
    if (!t || !email || !podeEditarTudo(t)) return;
    try {
        const b = writeBatch(db);
        b.update(doc(db, 'tarefas', tid), { colaboradoresEmails: arrayUnion(email), atualizadoEm: serverTimestamp() });
        b.set(doc(collection(db, 'tarefas', tid, 'comentarios')), { tipo: 'sistema', texto: `incluiu ${getMembro(email).nome} como colaborador(a)`, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp() });
        await b.commit(); toast('Colaborador incluído.');
    } catch (e) { /* erro tratado silenciosamente */ toast('Não foi possível incluir o colaborador.', 'erro'); }
}

export async function removerColaborador(tid, email) {
    const t = getTarefa(tid); if (!t || !podeEditarTudo(t)) return;
    try {
        const b = writeBatch(db);
        b.update(doc(db, 'tarefas', tid), { colaboradoresEmails: arrayRemove(email), atualizadoEm: serverTimestamp() });
        b.set(doc(collection(db, 'tarefas', tid, 'comentarios')), { tipo: 'sistema', texto: `removeu ${getMembro(email).nome} da colaboração`, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp() });
        await b.commit(); toast('Colaborador removido.');
    } catch (e) { /* erro tratado silenciosamente */ toast('Não foi possível remover o colaborador.', 'erro'); }
}

export async function logAtividade(tarefaId, texto, tipo = 'sistema') {
    await addDoc(collection(db, 'tarefas', tarefaId, 'comentarios'), {
        tipo, texto, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp()
    });
    if (tipo === 'comentario') await updateDoc(doc(db, 'tarefas', tarefaId), { comentariosCount: increment(1) });
}

export async function notificarAtribuicao(tarefa, origem) {
    const para = (tarefa.responsavelEmail || '').trim();
    if (!para) return;
    const membro = getMembro(para);
    const link = window.location.href.split('#')[0];
    const assunto = `[Projetos] Nova tarefa atribuída a você: ${tarefa.titulo}`;

    try {
        if (EMAIL_CONFIG.provider === 'emailjs') {
            const c = EMAIL_CONFIG.emailjs;
            if (!c.serviceId || !c.templateId || !c.publicKey) {
                toast('E-mail não enviado: configure serviceId, templateId e publicKey do EmailJS em EMAIL_CONFIG.', 'erro');
                return;
            }
            const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: c.serviceId, template_id: c.templateId, user_id: c.publicKey,
                    template_params: {
                        to_email: para,
                        to_name: membro.nome,
                        subject: assunto,
                        task_title: tarefa.titulo,
                        project_name: origem?.nome || 'Projeto Geral / Dor',
                        due_date: fmtBR(tarefa.prazo),
                        assigned_by: state.user.nome,
                        description: tarefa.descricao || 'Sem detalhes adicionais.',
                        link: link
                    }
                })
            });
            if (!resp.ok) throw new Error(await resp.text());
            toast(`E-mail de atribuição enviado para ${membro.nome}`);
        }
    } catch (e) {
        toast('Tarefa salva, mas o e-mail de notificação falhou. Verifique o console (F12).', 'erro');
    }
}

export async function moverStatus(id, novo) {
    const t = getTarefa(id);
    if (!t || t.status === novo) return;
    if (!podeAtuar(t)) return toast(`Somente ${getMembro(t.responsavelEmail).nome} (ou colaboradores) pode mudar o status. Abra a tarefa para enviar uma solicitação.`, 'info');
    try {
        const b = writeBatch(db);
        b.update(doc(db, 'tarefas', id), { status: novo, atualizadoEm: serverTimestamp() });
        b.set(doc(collection(db, 'tarefas', id, 'comentarios')), { tipo: 'sistema', texto: `moveu a tarefa de "${t.status}" para "${novo}"`, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp() });
        await b.commit();
    } catch (e) { /* erro tratado silenciosamente */ toast('Não foi possível mover a tarefa.', 'erro'); }
}

export async function salvarTarefa(id) {
    const t = getTarefa(id); if (!t) return;
    const tudo = podeEditarTudo(t);
    if (!podeAtuar(t)) return toast('Você não tem permissão para alterar esta tarefa.', 'erro');
    const novo = {
        titulo: $('#dt-titulo').value.trim(), descricao: $('#dt-desc').value.trim(),
        prazo: $('#dt-prazo').value, prioridade: $('#dt-prio').value, status: $('#dt-status').value
    };
    if (tudo) {
        novo.responsavelEmail = $('#dt-resp').value;
        novo.responsavelNome = getMembro(novo.responsavelEmail).nome;
        if (!t.dorId) novo.cronogramaId = $('#dt-cron').value;
    }
    if (!novo.titulo) return toast('O título não pode ficar vazio.', 'erro');
    if (!novo.prazo) return toast('Informe o prazo.', 'erro');
    const motivo = $('#dt-motivo').value.trim();
    const upd = { ...novo, atualizadoEm: serverTimestamp() };
    const logs = [];

    if (novo.prazo !== t.prazo) {
        upd.historicoPrazos = arrayUnion({ de: t.prazo || '', para: novo.prazo, por: state.user.email, em: Date.now(), motivo });
        logs.push(`alterou o prazo de ${fmtBR(t.prazo)} para ${fmtBR(novo.prazo)}${motivo ? ` — Motivo: ${motivo}` : ''}`);
    }
    const reatribuiu = tudo && novo.responsavelEmail !== t.responsavelEmail;
    if (reatribuiu) {
        logs.push(`reatribuiu a tarefa de ${getMembro(t.responsavelEmail).nome} para ${novo.responsavelNome}`);
        upd.colaboradoresEmails = (t.colaboradoresEmails || []).filter(e => e !== novo.responsavelEmail);
    }
    if (novo.status !== t.status) logs.push(`alterou o status de "${t.status}" para "${novo.status}"`);
    if (novo.prioridade !== (t.prioridade || 'Média')) logs.push(`alterou a prioridade para ${novo.prioridade}`);
    if (novo.titulo !== t.titulo) logs.push('renomeou a tarefa');
    if (novo.descricao !== (t.descricao || '')) logs.push('atualizou a descrição');

    try {
        const b = writeBatch(db);
        b.update(doc(db, 'tarefas', id), upd);
        logs.forEach(l => b.set(doc(collection(db, 'tarefas', id, 'comentarios')), { tipo: 'sistema', texto: l, autorEmail: state.user.email, autorNome: state.user.nome, criadoEm: serverTimestamp() }));
        await b.commit();
        if (reatribuiu) await notificarAtribuicao({ ...t, ...novo }, getOrigemTarefa(t));
        toast('Tarefa atualizada.');
        $('#dt-motivo-wrap').classList.add('hidden'); $('#dt-motivo').value = '';
        $('#dr-situacao').innerHTML = badgeSituacao({ ...t, ...novo });
    } catch (e) { /* erro tratado silenciosamente */ toast('Erro ao salvar a tarefa (verifique suas permissões).', 'erro'); }
}

export async function enviarComentario(id) {
    const ta = $('#dt-comentario'); const texto = ta.value.trim();
    if (!texto) return;
    ta.value = ''; ta.focus();
    try { await logAtividade(id, texto, 'comentario'); }
    catch (e) { /* erro tratado silenciosamente */ ta.value = texto; toast('Não foi possível enviar a observação.', 'erro'); }
}

async function refsFilhosDasTarefas(tarefas) {
    const refs = [];
    for (const t of tarefas) {
        const snap = await getDocs(collection(db, 'tarefas', t.id, 'comentarios'));
        snap.docs.forEach(d => refs.push(d.ref));
        state.solicitacoes.filter(x => x.tarefaId === t.id).forEach(x => refs.push(doc(db, 'solicitacoes', x.id)));
    }
    return refs;
}

export async function apagarEmLotes(refs) {
    for (let i = 0; i < refs.length; i += 400) {
        const b = writeBatch(db);
        refs.slice(i, i + 400).forEach(r => b.delete(r));
        await b.commit();
    }
}

export async function excluirMembro(email) {
    if (!isAdmin()) return toast('Apenas administradores podem excluir membros.', 'erro');
    if (email === state.user.email) return toast('Você não pode excluir a si mesmo.', 'erro');
    if (!confirm(`Tem certeza que deseja remover ${email} da base de usuários?`)) return;
    try {
        await deleteDoc(doc(db, 'proj_membros', email));
        toast('Membro removido da base.');
        fecharModal();
        modalMembro();
    } catch (e) {
        toast('Sem permissão para excluir membro.', 'erro');
    }
}

export async function excluirTarefa(id) {
    const t = getTarefa(id); if (!t) return;
    if (!confirm(`Excluir a tarefa "${t.titulo}"? Essa ação não pode ser desfeita.`)) return;
    try {
        fecharDrawer();
        const filhos = await refsFilhosDasTarefas([t]);
        await apagarEmLotes([...filhos, doc(db, 'tarefas', id)]);
        toast('Tarefa excluída.');
    } catch (e) { /* erro tratado silenciosamente */ toast('Sem permissão para excluir esta tarefa.', 'erro'); }
}

export async function excluirCronograma(id) {
    const cr = state.cronogramas.find(c => c.id === id); if (!cr) return;
    const ts = state.tarefas.filter(t => t.cronogramaId === id);
    if (!confirm(`Excluir o cronograma "${cr.nome}" e suas ${ts.length} tarefa(s)?`)) return;
    try {
        if (ts.some(t => t.id === state.drawerTaskId)) fecharDrawer();
        const filhos = await refsFilhosDasTarefas(ts);
        await apagarEmLotes([...filhos, ...ts.map(t => doc(db, 'tarefas', t.id)), doc(db, 'cronogramas', id)]);
        toast('Cronograma excluído.');
    } catch (e) { /* erro tratado silenciosamente */ toast('Sem permissão para excluir tudo isso.', 'erro'); }
}

export async function excluirProjeto(id) {
    const p = getProjeto(id); if (!p) return;
    const ts = state.tarefas.filter(t => t.projetoId === id);
    const cs = state.cronogramas.filter(c => c.projetoId === id);
    if (!confirm(`Excluir o projeto "${p.nome}" com ${cs.length} cronograma(s) e ${ts.length} tarefa(s)? Essa ação não pode ser desfeita.`)) return;
    try {
        if (ts.some(t => t.id === state.drawerTaskId)) fecharDrawer();
        const filhos = await refsFilhosDasTarefas(ts);
        await apagarEmLotes([...filhos, ...ts.map(t => doc(db, 'tarefas', t.id)), ...cs.map(c => doc(db, 'cronogramas', c.id)), doc(db, 'projetos', id)]);
        toast('Projeto excluído.'); navegar('projetos');
    } catch (e) { /* erro tratado silenciosamente */ toast('Sem permissão para excluir o projeto.', 'erro'); }
}
