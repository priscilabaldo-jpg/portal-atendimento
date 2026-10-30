// Dores Operacionais — detalhe, formulário, salvar/excluir.
import { addDoc, collection, db, deleteDoc, doc, serverTimestamp, updateDoc } from '../firebase.js';
import { DORES_COLUNAS, DORES_PRIO, DORES_STATUS, dorPrioMeta, dorQuarter, dorStatusMeta, ehISO, normTxt, opcoesDe, podeExcluirDor, qOrd, SETORES_PADRAO } from './data.js';
import { getMembro, toast } from '../helpers.js';
import { abrirModal, fecharModal } from '../modals.js';
import { state } from '../state.js';
import { $, esc } from '../utils.js';
import { linhaTarefaCompacta } from '../views/dashboard.js';

export function abrirDetalheDor(id) {
    const d = state.dores.find(x => x.id === id); if (!d) return;
    const pm = dorPrioMeta(d.prioridade), sm = dorStatusMeta(d.status);
    const h = (k) => DORES_COLUNAS.find(c => c.k === k).h;
    const bloco = (k, icon, extra = '', cor = '') => `
        <div class="${extra}">
            <div class="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1"><i class="fas ${icon} mr-1"></i>${esc(h(k))}</div>
            <div class="text-sm whitespace-pre-line break-words rounded-lg ${cor || 'text-gray-800'} ${cor ? 'p-3' : ''} ${d[k] ? '' : 'text-gray-400'}">${d[k] ? esc(d[k]) : '—'}</div>
        </div>`;
    const m = $('#modal');
    m.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden fade-in max-h-[92vh] flex flex-col">
        <div class="bg-leveros-verde2 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-2 flex-wrap text-white min-w-0">
                <span class="font-bold text-lg">Dor #${esc(d.codigo || '—')}</span>
                <span class="px-2 py-0.5 rounded-full border text-[11px] font-bold ${pm.badge}">${esc(d.prioridade || '—')}</span>
                <span class="px-2 py-0.5 rounded-full border text-[11px] font-semibold ${sm.badge}"><i class="fas ${sm.icon} mr-1"></i>${esc(d.status || '—')}</span>
            </div>
            <button data-action="fechar-modal" class="text-gray-300 hover:text-white"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            ${bloco('setor', 'fa-layer-group')}${bloco('direcional', 'fa-compass')}${bloco('squad', 'fa-users')}
            ${bloco('dor', 'fa-circle-exclamation', 'md:col-span-3', 'bg-red-50 border border-red-100 text-red-900')}
            ${bloco('acao', 'fa-hammer', 'md:col-span-3', 'bg-blue-50 border border-blue-100 text-blue-900')}
            ${bloco('resultado', 'fa-trophy', 'md:col-span-3')}
            ${bloco('metricaAtual', 'fa-gauge')}${bloco('kpi', 'fa-bullseye', 'md:col-span-2')}
            ${bloco('alinhamento', 'fa-flag', 'md:col-span-1')}${bloco('inicio', 'fa-play')}${bloco('fim', 'fa-flag-checkered')}
            ${bloco('obs', 'fa-note-sticky', 'md:col-span-3')}
            <div class="md:col-span-3 mt-2">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-[11px] font-bold uppercase tracking-wide text-gray-500"><i class="fas fa-tasks mr-1"></i> Plano de Ação (Tarefas)</div>
                    <button data-action="nova-tarefa" data-dor="${esc(d.id)}" class="text-xs px-3 py-1.5 bg-leveros-verde1 text-white rounded-lg hover:bg-leveros-verde2 font-medium transition-colors"><i class="fas fa-plus mr-1"></i> Nova Tarefa</button>
                </div>
                <div id="dor-tarefas-list" class="border border-gray-100 rounded-lg p-2 bg-gray-50 max-h-64 overflow-y-auto">
                    <!-- Será preenchido via JavaScript -->
                </div>
            </div>
        </div>
        <div class="px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0 bg-gray-50">
            <span class="text-[11px] text-gray-400">${d.atualizadoPorEmail ? `Última edição: ${esc(getMembro(d.atualizadoPorEmail).nome)}` : (d.criadoPorEmail ? `Cadastrada por ${esc(getMembro(d.criadoPorEmail).nome)}` : '')}</span>
            <div class="flex gap-2">
                ${podeExcluirDor(d) ? `<button data-action="dor-excluir" data-id="${esc(d.id)}" class="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"><i class="fas fa-trash mr-1"></i> Excluir</button>` : ''}
                <button data-action="dor-editar" data-id="${esc(d.id)}" class="px-4 py-2 bg-leveros-verde1 text-white rounded-lg hover:bg-leveros-verde2 text-sm font-medium"><i class="fas fa-pen mr-1"></i> Editar</button>
            </div>
        </div>
    </div>`;
    m.classList.remove('hidden'); m.classList.add('flex');
    renderizarTarefasDaDor(id);
}

export function renderizarTarefasDaDor(dorId) {
    const cont = $('#dor-tarefas-list');
    if (!cont) return;
    const tarefasDor = state.tarefas.filter(t => t.dorId === dorId).sort((a,b) => (a.prazo||'9999').localeCompare(b.prazo||'9999'));
    cont.innerHTML = tarefasDor.length 
        ? `<div class="flex flex-col gap-2">` + tarefasDor.map(t => linhaTarefaCompacta(t, true)).join('') + `</div>` 
        : `<p class="text-xs text-gray-400 py-4 text-center">Nenhuma tarefa vinculada a esta dor.</p>`;
}

const parseSquad = (s) => {
    const m = /^\s*(Q\d\/\d{4}|A definir)\s*·\s*([\s\S]*)$/.exec(s || '');
    if (m) return { quarter: m[1], squad: m[2] };
    const q = /^\s*(Q\d\/\d{4})\s*$/.exec(s || '');
    return q ? { quarter: q[1], squad: '' } : { quarter: '', squad: s || '' };
};

function opcoesQuarter(atual) {
    const hoje = new Date(), set = new Set(opcoesDe(dorQuarter).filter(q => q !== 'A definir'));
    let ano = hoje.getFullYear(), tri = Math.floor(hoje.getMonth() / 3) + 1;
    for (let i = 0; i < 6; i++) { set.add(`Q${tri}/${ano}`); if (++tri > 4) { tri = 1; ano++; } }
    if (/^Q\d\/\d{4}$/.test(atual || '')) set.add(atual);
    return [...set].sort((a, b) => qOrd(a) - qOrd(b));
}

export function modalDor(id = '') {
    const d = id ? state.dores.find(x => x.id === id) : null;
    if (id && !d) return;
    const v = (k) => esc(d ? (d[k] ?? '') : '');
    const sq = parseSquad(d?.squad);
    const dl = (nome, lista) => `<datalist id="${nome}">${lista.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
    const campoData = (nome, rotulo, valor) => {
        const adef = valor === 'A definir', iso = ehISO(valor) ? valor : '';
        return `<div><label class="lbl">${rotulo}</label><div class="flex items-center gap-2">
            <input id="dr-${nome}" type="date" class="inp" value="${iso}" ${adef ? 'disabled' : ''}>
            <label class="flex items-center gap-1 text-xs whitespace-nowrap text-gray-600 cursor-pointer"><input type="checkbox" id="dr-${nome}-adef" class="rounded" ${adef ? 'checked' : ''}> A definir</label></div></div>`;
    };
    const area = (k, rotulo, rows = 2, dica = '', extra = '') => `<div class="${extra}"><label class="lbl">${rotulo}${dica ? ` <span class="font-normal normal-case text-gray-400">${dica}</span>` : ''}</label><textarea id="dr-${k}" rows="${rows}" class="inp">${v(k)}</textarea></div>`;
    const statusAtual = d?.status || 'Não iniciado', prioAtual = d?.prioridade || 'Média';
    const lista = (arr, atual) => (arr.includes(atual) || !atual ? arr : [atual, ...arr]);
    abrirModal(d ? `Editar dor ${esc(d.codigo || '')}` : 'Nova dor operacional', `
        <input type="hidden" id="dr-id" value="${esc(id)}">
        ${dl('dl-setor', [...new Set([...SETORES_PADRAO, ...opcoesDe(x => x.setor)])])}
        ${dl('dl-direcional', opcoesDe(x => x.direcional))}
        ${dl('dl-squad', opcoesDe(x => parseSquad(x.squad).squad))}
        ${dl('dl-alinh', opcoesDe(x => x.alinhamento))}
        <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div class="sm:col-span-1"><label class="lbl">ID</label><input id="dr-codigo" class="inp" placeholder="ex.: T9" value="${v('codigo')}"></div>
            <div class="sm:col-span-2"><label class="lbl">Setor *</label><input id="dr-setor-f" list="dl-setor" class="inp" required value="${v('setor')}" placeholder="ex.: T&D"></div>
            <div class="sm:col-span-3"><label class="lbl">Direcional</label><input id="dr-direcional" list="dl-direcional" class="inp" value="${v('direcional')}" placeholder="ex.: Jornada T&D"></div>

            ${area('dor', 'Dor *', 2, '(o problema que o time enfrenta)', 'sm:col-span-6')}
            ${area('acao', 'Ação', 3, '(o que será feito)', 'sm:col-span-6')}
            ${area('resultado', 'Resultado esperado', 2, '(Menor ganho: … Maior ganho: …)', 'sm:col-span-6')}
            ${area('metricaAtual', 'Métrica atual', 2, '(do problema)', 'sm:col-span-3')}
            ${area('kpi', 'KPI de sucesso', 2, '', 'sm:col-span-3')}

            <div class="sm:col-span-2"><label class="lbl">Prioridade</label><select id="dr-prioridade" class="inp">${lista(DORES_PRIO, prioAtual).map(p => `<option ${p === prioAtual ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
            <div class="sm:col-span-2"><label class="lbl">Status</label><select id="dr-status-f" class="inp">${lista(DORES_STATUS, statusAtual).map(s => `<option ${s === statusAtual ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="sm:col-span-2"><label class="lbl">Quarter</label><select id="dr-quarter-f" class="inp"><option value="">—</option><option ${sq.quarter === 'A definir' ? 'selected' : ''}>A definir</option>${opcoesQuarter(sq.quarter).map(q => `<option ${q === sq.quarter ? 'selected' : ''}>${esc(q)}</option>`).join('')}</select></div>
            <div class="sm:col-span-3"><label class="lbl">Squad de destino</label><input id="dr-squad-f" list="dl-squad" class="inp" value="${esc(sq.squad)}" placeholder="ex.: Squad T&D/TI"></div>
            <div class="sm:col-span-3"><label class="lbl">Alinhamento "4 por 100"</label><input id="dr-alinhamento" list="dl-alinh" class="inp" value="${v('alinhamento')}" placeholder="ex.: Pilar Eficiência Operacional"></div>
            <div class="sm:col-span-3">${campoData('inicio', 'Início', d?.inicio)}</div>
            <div class="sm:col-span-3">${campoData('fim', 'Fim estimado', d?.fim)}</div>
            ${area('obs', 'Observações', 2, '', 'sm:col-span-6')}
        </div>`, 'form-dor', d ? 'Salvar alterações' : 'Cadastrar dor', 'max-w-3xl');
}

export async function salvarDor() {
    const id = $('#dr-id').value;
    const val = (k) => $('#dr-' + k).value.trim();
    const dataVal = (n) => $(`#dr-${n}-adef`).checked ? 'A definir' : $('#dr-' + n).value;
    const quarter = $('#dr-quarter-f').value, squadNome = val('squad-f');
    const dados = {
        codigo: val('codigo'), setor: val('setor-f'), direcional: val('direcional'), dor: val('dor'), acao: val('acao'),
        resultado: val('resultado'), metricaAtual: val('metricaAtual'), kpi: val('kpi'), prioridade: $('#dr-prioridade').value,
        squad: quarter && squadNome ? `${quarter} · ${squadNome}` : (quarter || squadNome),
        alinhamento: val('alinhamento'), inicio: dataVal('inicio'), fim: dataVal('fim'), status: $('#dr-status-f').value, obs: val('obs')
    };
    if (!dados.setor) throw new Error('Informe o setor.');
    if (!dados.dor && !dados.acao) throw new Error('Preencha ao menos a dor ou a ação.');
    if (ehISO(dados.inicio) && ehISO(dados.fim) && dados.fim < dados.inicio) throw new Error('O fim estimado não pode ser antes do início.');
    const dup = dados.codigo && state.dores.some(x => x.id !== id && normTxt(x.codigo) === normTxt(dados.codigo));
    if (dup && !confirm(`Já existe uma dor com o ID "${dados.codigo}". Salvar mesmo assim?`)) throw new Error('Cadastro cancelado.');
    if (id) {
        await updateDoc(doc(db, 'dores', id), { ...dados, atualizadoEm: serverTimestamp(), atualizadoPorEmail: state.user.email });
        toast('Dor atualizada!');
    } else {
        const ordem = Math.max(0, ...state.dores.map(x => x.ordem || 0)) + 1;
        await addDoc(collection(db, 'dores'), { ...dados, ordem, origem: 'manual', criadoPorEmail: state.user.email, criadoEm: serverTimestamp() });
        toast('Dor cadastrada!');
    }
    fecharModal();
}

export async function excluirDor(id) {
    const d = state.dores.find(x => x.id === id); if (!d) return;
    if (!podeExcluirDor(d)) return toast('Somente quem cadastrou a dor ou um administrador pode excluir.', 'erro');
    if (!confirm(`Excluir a dor "${d.codigo || ''} ${(d.dor || d.acao || '').slice(0, 60)}"? Essa ação não pode ser desfeita.`)) return;
    await deleteDoc(doc(db, 'dores', id));
    fecharModal(); toast('Dor excluída.');
}

export async function mudarStatusDor(id, status) {
    try { await updateDoc(doc(db, 'dores', id), { status, atualizadoEm: serverTimestamp(), atualizadoPorEmail: state.user.email }); toast('Status atualizado.'); }
    catch (err) { toast('Erro ao atualizar o status.', 'erro'); }
}
