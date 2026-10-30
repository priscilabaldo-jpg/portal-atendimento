// Dores Operacionais — importar / exportar Excel.
import { db, doc, serverTimestamp, writeBatch } from '../firebase.js';
import { camposDor, dorChave, dorDocId, DORES_COLUNAS, ehISO, normTxt } from './data.js';
import { toast } from '../helpers.js';
import { fecharModal } from '../modals.js';
import { state } from '../state.js';
import { $, esc, hojeISO, pad } from '../utils.js';

async function gravarDoresEmLote(lista, origem) {
    const base = Math.max(0, ...state.dores.map(x => x.ordem || 0));
    for (let i = 0; i < lista.length; i += 400) {
        const b = writeBatch(db);
        lista.slice(i, i + 400).forEach((d, j) => b.set(doc(db, 'dores', dorDocId(d)), {
            ...camposDor(d), ordem: base + i + j + 1, origem, criadoPorEmail: state.user.email, criadoEm: serverTimestamp()
        }));
        await b.commit();
    }
}

function separarNovas(lista) {
    const existentes = new Set(state.dores.map(dorChave)), vistos = new Set(), novas = [];
    let repetidas = 0;
    lista.forEach(d => { const k = dorChave(d); if (existentes.has(k) || vistos.has(k)) repetidas++; else { vistos.add(k); novas.push(d); } });
    return { novas, repetidas };
}

function dataParaISO(v) {
    if (v instanceof Date && !isNaN(v)) {
        const z = new Date(v.getTime() + 12 * 3600e3);
        return `${z.getUTCFullYear()}-${pad(z.getUTCMonth() + 1)}-${pad(z.getUTCDate())}`;
    }
    const s = String(v ?? '').trim();
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (br) return `${br[3]}-${pad(+br[2])}-${pad(+br[1])}`;
    return s;
}

function lerLinhasDores(rows) {
    const ncel = (c) => normTxt(c).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const hi = rows.findIndex(r => { const n = r.map(ncel); return n.includes('setor') && n.includes('dor'); });
    if (hi < 0) throw new Error('Não encontrei o cabeçalho (colunas "Setor" e "DOR"). Use o botão "Baixar modelo".');
    const mapa = {};
    rows[hi].forEach((c, i) => {
        const n = ncel(c); let k = null;
        if (n === 'id') k = 'codigo'; else if (n === 'setor') k = 'setor'; else if (n === 'direcional') k = 'direcional';
        else if (n === 'dor') k = 'dor'; else if (n === 'acao') k = 'acao'; else if (n.startsWith('resultado')) k = 'resultado';
        else if (n.startsWith('metrica')) k = 'metricaAtual'; else if (n.startsWith('kpi')) k = 'kpi'; else if (n === 'prioridade') k = 'prioridade';
        else if (n.startsWith('quarter')) k = 'squad'; else if (n.startsWith('alinhamento')) k = 'alinhamento'; else if (n === 'inicio') k = 'inicio';
        else if (n.startsWith('fim')) k = 'fim'; else if (n === 'status') k = 'status'; else if (n.startsWith('observ')) k = 'obs';
        if (k && !(k in mapa)) mapa[k] = i;
    });
    const out = [];
    rows.slice(hi + 1).forEach(r => {
        const d = {};
        DORES_COLUNAS.forEach(c => {
            let v = c.k in mapa ? r[mapa[c.k]] : '';
            d[c.k] = (c.k === 'inicio' || c.k === 'fim') ? dataParaISO(v) : String(v ?? '');
        });
        if (DORES_COLUNAS.some(c => d[c.k].trim() !== '')) out.push(d);
    });
    return out;
}

export async function lerPlanilhaDores(file) {
    try {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const dados = lerLinhasDores(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }));
        if (!dados.length) return toast('A planilha não tem nenhuma dor para importar.', 'erro');
        mostrarPreviaImportacao(dados, `Arquivo: ${file.name}`, 'planilha');
    } catch (err) { toast(err.message || 'Não foi possível ler a planilha.', 'erro'); }
}

function mostrarPreviaImportacao(dados, fonte, origem) {
    const { novas, repetidas } = separarNovas(dados);
    state.importDores = { novas, origem };
    const m = $('#modal');
    m.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden fade-in max-h-[92vh] flex flex-col">
        <div class="bg-leveros-verde2 px-5 py-3 flex items-center justify-between shrink-0"><h3 class="text-lg font-bold text-white">Importar dores</h3><button data-action="fechar-modal" class="text-gray-300 hover:text-white"><i class="fas fa-times text-xl"></i></button></div>
        <div class="p-5 overflow-y-auto">
            <p class="text-xs text-gray-500 mb-3">${esc(fonte)}</p>
            <div class="grid grid-cols-3 gap-2 mb-4 text-center">
                <div class="border rounded-lg p-2"><div class="text-xl font-bold text-leveros-verde1">${dados.length}</div><div class="text-[11px] text-gray-500">linhas lidas</div></div>
                <div class="border border-green-200 bg-green-50 rounded-lg p-2"><div class="text-xl font-bold text-green-700">${novas.length}</div><div class="text-[11px] text-green-700">novas (serão incluídas)</div></div>
                <div class="border rounded-lg p-2"><div class="text-xl font-bold text-gray-500">${repetidas}</div><div class="text-[11px] text-gray-500">já existem (ignoradas)</div></div>
            </div>
            ${novas.length ? `<div class="border rounded-lg overflow-auto max-h-64"><table class="w-full text-xs"><thead class="bg-gray-50 text-gray-500"><tr><th class="text-left p-2">ID</th><th class="text-left p-2">Setor</th><th class="text-left p-2">Dor / Ação</th><th class="text-left p-2">Prioridade</th></tr></thead><tbody>
                ${novas.map(d => `<tr class="border-t"><td class="p-2 font-bold">${esc(d.codigo || '—')}</td><td class="p-2">${esc(d.setor)}</td><td class="p-2">${esc((d.dor || d.acao).slice(0, 110))}</td><td class="p-2">${esc(d.prioridade || '—')}</td></tr>`).join('')}</tbody></table></div>`
                : '<p class="text-sm text-gray-500">Tudo isso já está cadastrado. Nada a importar.</p>'}
        </div>
        <div class="px-5 py-3 border-t flex justify-end gap-2 bg-gray-50 shrink-0">
            <button data-action="fechar-modal" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white text-sm font-medium">Cancelar</button>
            ${novas.length ? `<button data-action="dor-confirmar-import" class="px-4 py-2 bg-leveros-verde1 text-white rounded-lg hover:bg-leveros-verde2 text-sm font-medium"><i class="fas fa-file-import mr-1"></i> Importar ${novas.length} ${novas.length === 1 ? 'dor' : 'dores'}</button>` : ''}
        </div>
    </div>`;
    m.classList.remove('hidden'); m.classList.add('flex');
}

export async function confirmarImportacaoDores(btn) {
    const imp = state.importDores; if (!imp?.novas.length) return;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
    try { await gravarDoresEmLote(imp.novas, imp.origem); fecharModal(); toast(`${imp.novas.length} dores importadas!`); state.importDores = null; }
    catch (err) { toast('Erro ao importar. Verifique as permissões do Firestore.', 'erro'); btn.disabled = false; btn.innerHTML = 'Tentar novamente'; }
}

function baixarPlanilhaDores(lista, nomeArquivo, titulo = 'CRONOGRAMA DE PRIORIZAÇÃO DE PROJETOS') {
    const celula = (c, d) => {
        const v = d[c.k] ?? '';
        if ((c.k === 'inicio' || c.k === 'fim') && ehISO(v)) { const [y, m, dd] = v.split('-').map(Number); return new Date(y, m - 1, dd, 12); }
        return v;
    };
    const ws = XLSX.utils.aoa_to_sheet([[titulo], DORES_COLUNAS.map(c => c.h), ...lista.map(d => DORES_COLUNAS.map(c => celula(c, d)))], { cellDates: true });
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: DORES_COLUNAS.length - 1 } }];
    ws['!cols'] = [8, 18, 22, 50, 55, 55, 28, 40, 12, 32, 28, 12, 14, 18, 40].map(w => ({ wch: w }));
    Object.keys(ws).forEach(a => { if (ws[a] && ws[a].t === 'd') ws[a].z = 'dd/mm/yyyy'; });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Página1');
    XLSX.writeFile(wb, nomeArquivo);
}

export const exportarDores = () => { baixarPlanilhaDores(state.dores, `DORES_OPERACIONAIS_${hojeISO()}.xlsx`); toast('Planilha exportada!'); };
export const baixarModeloDores = () => {
    baixarPlanilhaDores([{ codigo: 'X1', setor: 'CX', direcional: 'Jornada cliente', dor: 'Descreva a dor aqui', acao: 'O que será feito', resultado: 'Menor ganho: … Maior ganho: …', kpi: 'Reduzir X em Y%', prioridade: 'Média', squad: 'Q1/2027 · Squad CX', alinhamento: 'Pilar Eficiência Operacional', inicio: '2027-01-04', fim: '2027-02-28', status: 'Não iniciado', obs: '' }], 'MODELO_DORES_OPERACIONAIS.xlsx');
    toast('Modelo baixado. Preencha e use "Importar Excel".', 'info');
};
