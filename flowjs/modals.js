// Rotina Diária — modal de edição.
import { CATS_ROTINA, PALETA, STATUS_ROTINA } from '../constants.js';
import { checkboxColabs, seletorCor, toast } from '../helpers.js';
import { abrirModal } from '../modals.js';
import { podeEditarRotina, podeGerirRotina, rotinaColabs } from './data.js';
import { state } from '../state.js';
import { esc } from '../utils.js';

export function modalEditarRotina(id) {
    const r = state.rotinas.find(x => x.id === id);
    if (!r) return;
    if (!podeEditarRotina(r)) return toast('Você não tem permissão para editar esta atividade.', 'erro');
    const gerir = podeGerirRotina(r);
    abrirModal('Editar Atividade Avulsa', `
        <input type="hidden" id="er-id" value="${esc(r.id)}">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="lbl">Data Inicial *</label><input id="er-data" type="date" class="inp" required value="${esc(r.data)}"></div>
            <div><label class="lbl">Prazo <span class="font-normal normal-case text-gray-400">(opcional)</span></label><input id="er-prazo" type="date" class="inp" value="${esc(r.prazo || '')}"></div>
            <div><label class="lbl">Categoria *</label><select id="er-cat" class="inp">${CATS_ROTINA.map(c => `<option ${c === r.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div><label class="lbl">Status *</label><select id="er-status" class="inp">${STATUS_ROTINA.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div class="sm:col-span-2"><label class="lbl">Cor</label><div class="mt-1">${seletorCor('er-cor', r.cor || PALETA[0], 'w-6 h-6')}</div></div>
            <div class="sm:col-span-2"><label class="lbl">Título *</label><input id="er-titulo" class="inp" required value="${esc(r.titulo || r.descricao)}"></div>
            <div class="sm:col-span-2"><label class="lbl">Descrição</label><input id="er-desc" class="inp" value="${esc(r.descricao || '')}"></div>
            <div class="sm:col-span-2"><label class="lbl">Link de Acesso</label><input id="er-acesso" class="inp" placeholder="https://..." value="${esc(r.acesso || '')}"></div>
            <div class="sm:col-span-2"><label class="lbl">Observação</label><textarea id="er-obs" class="inp" rows="2" placeholder="Anotações sobre a atividade...">${esc(r.observacao || '')}</textarea></div>
            <div class="sm:col-span-2">
                <label class="lbl"><i class="fas fa-user-group mr-1"></i>Colaboradores ${gerir ? '' : '<span class="font-normal normal-case text-gray-400">(somente o responsável pode alterar)</span>'}</label>
                <div class="border border-gray-300 rounded-lg max-h-36 overflow-y-auto divide-y bg-white">${checkboxColabs('er-colab', rotinaColabs(r), r.responsavelEmail, !gerir)}</div>
            </div>
        </div>`, 'form-editar-rotina', 'Salvar Alterações', 'max-w-2xl');
}
