// Relatório gerencial em Excel.

//teste
import { getMembro, getOrigemTarefa, situacao, toast } from './helpers.js';
import { state } from './state.js';
import { diasPara, fmtBR, hojeISO } from './utils.js';

let _xlsxCarregado = false;
function carregarXLSX() { if (_xlsxCarregado && window.XLSX) return Promise.resolve(); return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js'; s.onload = () => { _xlsxCarregado = true; resolve(); }; s.onerror = () => reject(new Error('Falha ao carregar biblioteca de planilhas.')); document.head.appendChild(s); }); }

export async function exportarRelatorioExcel() {
    if (!state.projetos.length && !state.tarefas.length && !state.rotinas.length) {
        return toast('Não há dados para exportar.', 'erro');
    }
    toast('Gerando relatório Excel completo...', 'info'); try { await carregarXLSX(); } catch (e) { return toast('Não foi possível carregar o módulo de Excel. Verifique sua conexão.', 'erro'); }

    const calcProgresso = (pId) => {
        const ts = state.tarefas.filter(t => t.projetoId === pId);
        const feitas = ts.filter(t => t.status === 'Validado').length;
        const atrasadas = ts.filter(t => t.status !== 'Validado' && diasPara(t.prazo) < 0).length;
        const pct = ts.length ? Math.round((feitas / ts.length) * 100) : 0;
        return { total: ts.length, feitas, atrasadas, pct };
    };

    const getNome = (email) => getMembro(email).nome;
    const nomesColabs = (emails) => (emails || []).map(getNome).join(', ');

    // 1. DADOS DE PROJETOS
    const dadosProjetos = state.projetos.map(p => {
        const pr = calcProgresso(p.id);
        return {
            'Nome do Projeto': p.nome,
            'Status': p.status === 'arquivado' ? 'Arquivado' : 'Ativo',
            'Progresso (%)': `${pr.pct}%`,
            'Tarefas Concluídas': `${pr.feitas} de ${pr.total}`,
            'Tarefas Atrasadas': pr.atrasadas,
            'Data de Início': fmtBR(p.inicio),
            'Qual a Dor?': p.dor || '-',
            'O Que Queremos Sanar?': p.sanar || '-',
            'KPI a Medir': p.kpi || '-',
            'Criado por': getNome(p.criadoPorEmail),
            'Descrição': p.descricao || '-'
        };
    });

    // 2. DADOS DE TAREFAS
    const dadosTarefas = state.tarefas.map(t => {
        const p = getOrigemTarefa(t);
        const c = state.cronogramas.find(x => x.id === t.cronogramaId);
        const sit = situacao(t);
        return {
            'Projeto / Dor': p ? p.nome : 'Sem projeto',
            'Cronograma / Fase': c ? c.nome : (t.dorId ? '-' : 'Geral'),
            'Título da Tarefa': t.titulo,
            'Status Kanban': t.status,
            'Situação de Prazo': sit.label, 
            'Data Limite': fmtBR(t.prazo),
            'Prioridade': t.prioridade || 'Média',
            'Responsável Principal': getNome(t.responsavelEmail),
            'Colaboradores Apoio': nomesColabs(t.colaboradoresEmails) || '-',
            'Qtd. Observações': t.comentariosCount || 0,
            'Criado por': getNome(t.criadoPorEmail),
            'Descrição Detalhada': t.descricao || '-'
        };
    });

    // 3. DADOS DE ROTINAS E AVULSAS
    const dadosRotinas = state.rotinas.map(r => {
        return {
            'Data de Execução': fmtBR(r.data),
            'Prazo Final': fmtBR(r.prazo),
            'Categoria da Atividade': r.categoria,
            'Status Atual': r.status,
            'Título da Atividade': r.titulo,
            'Responsável': getNome(r.responsavelEmail),
            'Equipe Envolvida': nomesColabs(r.colaboradoresEmails) || '-',
            'Link de Acesso': r.acesso || '-',
            'Observação / Pauta': r.observacao || '-',
            'Descrição Extra': r.descricao || '-'
        };
    });

    const wb = XLSX.utils.book_new();

    if (dadosProjetos.length) {
        const wsProj = XLSX.utils.json_to_sheet(dadosProjetos);
        wsProj['!cols'] = [{wch: 35}, {wch: 12}, {wch: 15}, {wch: 20}, {wch: 18}, {wch: 15}, {wch: 40}, {wch: 40}, {wch: 20}, {wch: 25}, {wch: 50}];
        XLSX.utils.book_append_sheet(wb, wsProj, "Visão Projetos");
    }
    
    if (dadosTarefas.length) {
        const wsTar = XLSX.utils.json_to_sheet(dadosTarefas);
        wsTar['!cols'] = [{wch: 25}, {wch: 25}, {wch: 45}, {wch: 18}, {wch: 20}, {wch: 15}, {wch: 12}, {wch: 25}, {wch: 35}, {wch: 18}, {wch: 25}, {wch: 50}];
        XLSX.utils.book_append_sheet(wb, wsTar, "Quadro de Tarefas");
    }
    
    if (dadosRotinas.length) {
        const wsRot = XLSX.utils.json_to_sheet(dadosRotinas);
        wsRot['!cols'] = [{wch: 18}, {wch: 15}, {wch: 25}, {wch: 20}, {wch: 45}, {wch: 25}, {wch: 35}, {wch: 35}, {wch: 50}, {wch: 40}];
        XLSX.utils.book_append_sheet(wb, wsRot, "Rotina Diária");
    }

    XLSX.writeFile(wb, `Relatorio_Gerencial_CX_FLOW_${hojeISO()}.xlsx`);
    toast('Relatório exportado com sucesso!');
}
