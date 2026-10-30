// Modal genérico e modais de projeto, cronograma, equipe e tarefa.
import { db, doc, setDoc } from './firebase.js';
import { DOMINIO } from './config.js';
import { PALETA, PRIORIDADES, STATUS } from './constants.js';
import { avatar, checkboxColabs, colabsMarcados, getProjeto, isAdmin, optionsCron, optionsMembros, optionsProjetos, seletorCor, toast } from './helpers.js';
import { state } from './state.js';
import { $, esc, hojeISO } from './utils.js';

export function abrirModal(titulo, corpo, formId, labelSalvar = 'Salvar', largura = 'max-w-lg') {
    const m = $('#modal');
    m.innerHTML = `<div class="bg-white rounded-xl shadow-xl w-full ${largura} overflow-hidden fade-in max-h-[92vh] flex flex-col">
        <div class="bg-leveros-verde2 px-6 py-4 flex items-center justify-between shrink-0">
            <h3 class="text-lg font-bold text-white">${titulo}</h3>
            <button data-action="fechar-modal" class="text-gray-300 hover:text-white"><i class="fas fa-times text-xl"></i></button>
        </div>
        <form id="${formId}" class="p-6 overflow-y-auto">
            ${corpo}
            <div class="flex justify-end gap-3 mt-6 border-t pt-4">
                <button type="button" data-action="fechar-modal" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-leveros-verde1 text-white rounded-lg hover:bg-leveros-verde2 font-medium text-sm flex items-center gap-2"><i class="fas fa-save"></i> ${labelSalvar}</button>
            </div>
        </form>
    </div>`;
    m.classList.remove('hidden'); m.classList.add('flex');
    m.querySelector('input,select,textarea')?.focus();
}

export function fecharModal() { const m = $('#modal'); m.classList.add('hidden'); m.classList.remove('flex'); m.innerHTML = ''; }
export function modalProjeto() {
    abrirModal('Novo Projeto', `
        <div class="grid gap-4">
            <div><label class="lbl">Nome do projeto *</label><input id="np-nome" class="inp" required maxlength="80" placeholder="Ex: Implantação do novo ERP"></div>
            <div><label class="lbl">Data de Início *</label><input id="np-inicio" type="date" class="inp" required value="${hojeISO()}"></div>
            <div><label class="lbl">Descrição</label><textarea id="np-desc" rows="2" class="inp" placeholder="Objetivo e escopo..."></textarea></div>

            <div><label class="lbl">Qual a dor?</label><textarea id="np-dor" rows="2" class="inp" placeholder="Qual problema atual gerou este projeto?"></textarea></div>
            <div><label class="lbl">O que queremos sanar?</label><textarea id="np-sanar" rows="2" class="inp" placeholder="O que será resolvido ao final do projeto?"></textarea></div>
            <div><label class="lbl">Qual o KPI a medir?</label><input id="np-kpi" class="inp" placeholder="Ex: Redução de 20% no tempo de atendimento"></div>

            <div><label class="lbl">Primeiro cronograma</label><input id="np-cron" class="inp" value="Cronograma principal" maxlength="80"></div>
            <div><label class="lbl">Cor</label>${seletorCor('np-cor')}</div>
        </div>`, 'form-projeto', 'Criar projeto');
}

export function modalEditarProjeto(id) {
    const p = getProjeto(id);
    if (!p) return;
    abrirModal('Editar Projeto', `
        <input type="hidden" id="ep-id" value="${p.id}">
        <div class="grid gap-4">
            <div><label class="lbl">Nome do projeto *</label><input id="ep-nome" class="inp" required maxlength="80" value="${esc(p.nome)}"></div>
            <div><label class="lbl">Data de Início *</label><input id="ep-inicio" type="date" class="inp" required value="${esc(p.inicio || '')}"></div>
            <div><label class="lbl">Descrição</label><textarea id="ep-desc" rows="2" class="inp">${esc(p.descricao || '')}</textarea></div>

            <div><label class="lbl">Qual a dor?</label><textarea id="ep-dor" rows="2" class="inp">${esc(p.dor || '')}</textarea></div>
            <div><label class="lbl">O que queremos sanar?</label><textarea id="ep-sanar" rows="2" class="inp">${esc(p.sanar || '')}</textarea></div>
            <div><label class="lbl">Qual o KPI a medir?</label><input id="ep-kpi" class="inp" value="${esc(p.kpi || '')}"></div>

            <div><label class="lbl">Cor</label>${seletorCor('ep-cor', p.cor || PALETA[0])}</div>
        </div>`, 'form-editar-projeto', 'Salvar Alterações');
}

export function modalCronograma(projetoId) {
    abrirModal('Novo Cronograma', `
        <input type="hidden" id="nc-projeto" value="${esc(projetoId)}">
        <div><label class="lbl">Nome do cronograma *</label><input id="nc-nome" class="inp" required maxlength="80" placeholder="Ex: Fase 1 — Levantamento"></div>`, 'form-cronograma', 'Criar cronograma');
}

export function modalMembro() {
    abrirModal('Equipe', `
        <p class="text-sm text-gray-500 mb-3">Quem entra no portal é adicionado automaticamente. Para atribuir tarefas a alguém que ainda não acessou, cadastre-o aqui.</p>
        <div class="mb-4 max-h-40 overflow-y-auto border rounded-lg divide-y">
            ${state.membros.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(m => `
                <div class="flex items-center gap-2 p-2 text-sm">
                    ${avatar(m.email)}
                    <span class="font-semibold flex-1 truncate">${esc(m.nome)}</span>
                    <span class="text-gray-400 text-xs truncate">${esc(m.email)}</span>
                    ${isAdmin() ? `<button type="button" data-action="excluir-membro" data-email="${esc(m.email)}" class="text-gray-400 hover:text-red-500 ml-2 px-1" title="Excluir membro da base"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            `).join('')}
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="lbl">Nome</label><input id="nm-nome" class="inp" required placeholder="Nome Sobrenome"></div>
            <div><label class="lbl">E-mail corporativo</label><input id="nm-email" type="email" class="inp" required placeholder="nome@leveros.com.br"></div>
        </div>`, 'form-membro', 'Adicionar membro');
}

export function modalTarefa(projetoId = '', cronId = '', dorId = '') {
    const isDor = !!dorId;
    if (!isDor && !state.projetos.some(p => p.status !== 'arquivado')) {
        toast('Crie um projeto antes de adicionar tarefas.', 'info'); modalProjeto(); return;
    }
    const pid = projetoId || (!isDor ? (state.filtros.projeto || state.projetos.find(p => p.status !== 'arquivado')?.id) : '');

    abrirModal('Nova Tarefa', `
        <input type="hidden" id="nt-dor" value="${esc(dorId)}">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${!isDor ? `
            <div><label class="lbl">Projeto *</label><select id="nt-projeto" class="inp" required>${optionsProjetos(pid)}</select></div>
            <div><label class="lbl">Cronograma</label><select id="nt-cron" class="inp">${optionsCron(pid, cronId) || '<option value="">Geral (será criado)</option>'}</select></div>
            ` : `<div class="sm:col-span-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 font-semibold"><i class="fas fa-link mr-2"></i> Tarefa vinculada a uma Dor Operacional</div>`}
            
            <div class="sm:col-span-2"><label class="lbl">Título *</label><input id="nt-titulo" class="inp" required maxlength="140"></div>
            <div class="sm:col-span-2"><label class="lbl">Descrição / observações</label><textarea id="nt-desc" rows="3" class="inp"></textarea></div>
            <div><label class="lbl">Responsável *</label><select id="nt-resp" class="inp" required><option value="">Selecione...</option>${optionsMembros()}</select></div>
            <div><label class="lbl">Prazo *</label><input id="nt-prazo" type="date" class="inp" required value=""></div>
            <div><label class="lbl">Prioridade</label><select id="nt-prio" class="inp">${PRIORIDADES.map(p => `<option ${p === 'Média' ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
            <div><label class="lbl">Status inicial</label><select id="nt-status" class="inp">${STATUS.map(s => `<option>${s}</option>`).join('')}</select></div>
            <div class="sm:col-span-2">
                <label class="lbl"><i class="fas fa-user-group mr-1"></i>Apoios <span class="font-normal normal-case text-gray-400">(opcional)</span></label>
                <div id="nt-colabs" class="border border-gray-300 rounded-lg max-h-36 overflow-y-auto divide-y bg-white">${checkboxColabs('nt-colab')}</div>
            </div>
            <div class="sm:col-span-2 border border-dashed border-leveros-azul rounded-lg p-3 bg-cyan-50/40">
                <label class="lbl"><i class="fas fa-user-plus mr-1"></i>Incluir pessoa manualmente <span class="font-normal normal-case text-gray-400">(se não estiver na lista)</span></label>
                <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                    <input id="np-nome" class="inp" placeholder="Nome Sobrenome">
                    <input id="np-email" type="email" class="inp" placeholder="nome${DOMINIO}">
                    <button type="button" data-action="add-pessoa-rapida" class="bg-leveros-verde2 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-leveros-verde1 whitespace-nowrap"><i class="fas fa-plus mr-1"></i>Adicionar</button>
                </div>
                <div class="flex gap-4 mt-2 text-xs text-gray-600">
                    <label class="flex items-center gap-1"><input type="radio" name="np-papel" value="resp"> Definir como responsável</label>
                    <label class="flex items-center gap-1"><input type="radio" name="np-papel" value="apoio" checked> Incluir como apoio</label>
                </div>
            </div>
        </div>
        <p class="text-xs text-gray-400 mt-3"><i class="far fa-envelope mr-1"></i>O responsável receberá um e-mail automático ao ser atribuído.</p>`, 'form-tarefa', 'Criar tarefa', 'max-w-2xl');
}

export async function adicionarPessoaRapida() {
    const nome = $('#np-nome').value.trim();
    const email = $('#np-email').value.trim().toLowerCase();
    if (!nome || !email) return toast('Informe nome e e-mail.', 'erro');
    if (!email.endsWith(DOMINIO)) return toast(`Use um e-mail ${DOMINIO}`, 'erro');
    const papel = document.querySelector('input[name=np-papel]:checked')?.value || 'apoio';
    try {
        if (!state.membros.some(m => m.email === email)) {
            await setDoc(doc(db, 'proj_membros', email), { email, nome, foto: '', preCadastro: true }, { merge: true });
            state.membros.push({ id: email, email, nome, foto: '', preCadastro: true });
        }
        let resp = $('#nt-resp').value;
        const marcados = colabsMarcados('nt-colab');
        if (papel === 'resp') resp = email; else if (!marcados.includes(email) && email !== resp) marcados.push(email);
        $('#nt-resp').innerHTML = '<option value="">Selecione...</option>' + optionsMembros(resp);
        $('#nt-colabs').innerHTML = checkboxColabs('nt-colab', marcados.filter(em => em !== resp));
        document.querySelectorAll('input[name=nt-colab]').forEach(cb => { if (cb.value === resp) { cb.disabled = true; cb.closest('label').classList.add('opacity-40'); } });
        $('#np-nome').value = ''; $('#np-email').value = '';
        toast(`${nome} incluído(a) ${papel === 'resp' ? 'como responsável' : 'como apoio'}.`);
    } catch (e) { toast('Não foi possível adicionar a pessoa.', 'erro'); }
}
