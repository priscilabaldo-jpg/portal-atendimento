// Dores Operacionais — cliques, formulário e filtros.
import { baixarModeloDores, confirmarImportacaoDores, exportarDores, lerPlanilhaDores } from './dores-excel.js';
import { abrirDetalheDor, excluirDor, modalDor, mudarStatusDor, salvarDor } from './dores-form.js';
import { atualizarDores } from './dores-view.js';
import { state } from './state.js';
import { $ } from './utils.js';

export const acoesDores = {
    'dor-nova': () => modalDor(),
    'dor-ver': (d) => abrirDetalheDor(d.id),
    'dor-editar': (d) => modalDor(d.id),
    'dor-excluir': (d) => excluirDor(d.id),
    'dor-exportar': () => exportarDores(),
    'dor-modelo': () => baixarModeloDores(),
    'dor-importar': () => $('#dor-file')?.click(),
    'dor-confirmar-import': (d, el) => confirmarImportacaoDores(el),
    'dor-modo': (d) => { state.filtros.dores.modo = d.modo; atualizarDores(); },
    'dor-limpar': () => { state.filtros.dores = { ...state.filtros.dores, q: '', setor: '', prio: '', status: '', quarter: '' }; atualizarDores(); },
    'dor-filtro-rapido': (d) => {
        const f = state.filtros.dores;
        if (d.campo === 'limpar') Object.assign(f, { q: '', setor: '', prio: '', status: '', quarter: '' });
        else f[d.campo === 'status' ? 'status' : 'prio'] = d.valor;
        atualizarDores();
    }
};

export const submitsDores = { 'form-dor': () => salvarDor() };

export const inputDores = (e) => {
    if (e.target.id === 'dr-q') { state.filtros.dores.q = e.target.value; atualizarDores(); }
};

export const changeDores = async (e) => {
    const { id, value } = e.target;
    const filtro = { 'dr-setor': 'setor', 'dr-prio': 'prio', 'dr-status': 'status', 'dr-quarter': 'quarter', 'dr-grupo': 'grupo' }[id];
    if (filtro) { state.filtros.dores[filtro] = value; atualizarDores(); }
    if (e.target.classList.contains('dor-status-sel')) await mudarStatusDor(e.target.dataset.id, value);
    if (id === 'dor-file' && e.target.files?.length) { await lerPlanilhaDores(e.target.files[0]); e.target.value = ''; }
};
