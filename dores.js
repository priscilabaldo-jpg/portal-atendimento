// ==========================================================
        // DORES OPERACIONAIS — dados, constantes e helpers
        // ==========================================================
        // Colunas = exatamente as 15 colunas da planilha "CRONOGRAMA DE PRIORIZAÇÃO DE PROJETOS".
        // (k = campo salvo no Firestore · h = cabeçalho da planilha)
        const DORES_COLUNAS = [
            { k: 'codigo',       h: 'ID' },
            { k: 'setor',        h: 'Setor' },
            { k: 'direcional',   h: 'DIRECIONAL' },
            { k: 'dor',          h: 'DOR' },
            { k: 'acao',         h: 'AÇÃO' },
            { k: 'resultado',    h: 'Resultado Esperado (menor → maior ganho)' },
            { k: 'metricaAtual', h: 'Métrica Atual (do problema)' },
            { k: 'kpi',          h: 'KPI de Sucesso' },
            { k: 'prioridade',   h: 'Prioridade' },
            { k: 'squad',        h: 'Quarter & Squad de Destino' },
            { k: 'alinhamento',  h: 'Alinhamento "4 por 100"' },
            { k: 'inicio',       h: 'Início' },
            { k: 'fim',          h: 'Fim Estimado' },
            { k: 'status',       h: 'Status' },
            { k: 'obs',          h: 'Observações' }
        ];
        const DORES_PRIO = ['Crítica', 'Alta', 'Média', 'Baixa'];
        const DORES_STATUS = ['Em aprofundamento', 'Não iniciado', 'Concluído'];
        const DORES_NEUTRO = 'bg-gray-100 text-gray-600 border-gray-200';
        const DORES_PRIO_META = {
            'Crítica': { badge: 'bg-red-600 text-white border-red-700', bar: 'bg-red-600', ord: 0 },
            'Alta':    { badge: 'bg-orange-100 text-orange-800 border-orange-200', bar: 'bg-orange-400', ord: 1 },
            'Média':   { badge: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'bg-blue-400', ord: 2 },
            'Baixa':   { badge: DORES_NEUTRO, bar: 'bg-gray-300', ord: 3 }
        };
        const DORES_STATUS_META = {
            'Em aprofundamento': { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'fa-spinner', ord: 0 },
            'Não iniciado':      { badge: DORES_NEUTRO, icon: 'fa-pause-circle', ord: 1 },
            'Concluído':         { badge: 'bg-green-100 text-green-700 border-green-200', icon: 'fa-check-double', ord: 2 }
        };
        const SETORES_PADRAO = ['Atendimento', 'CX', 'Logística', 'Logística Reversa', 'T&D', 'Garantia'];

        // Carga inicial: as 24 linhas da planilha DORES_OPERACIONAIS.xlsx, copiadas sem alteração.
        const DORES_BASE = [{"codigo": "A1", "setor": "Atendimento", "direcional": "Rastreio", "dor": "Dificuldade de logar no ambiente da BoxLink, principalmente com clientes em linha.", "acao": "Validar com o TI alternativas para facilitar o acesso à BoxLink.\nGustavo da TI atuando para melhorar a disponibilização no Intergrall das informações do Rastreio - Ariany abrir chamado para TI", "resultado": "Menor ganho: login mais rápido. Maior ganho: redução do tempo médio de atendimento (TMA) em chamadas ao vivo.", "metricaAtual": "", "kpi": "Reduzir tempo médio de autenticação e TMA", "prioridade": "Alta", "squad": "Q4/2026 · Squad Atendimento/TI", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2026-10-15", "fim": "2026-11-15", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "", "setor": "Atendimento", "direcional": "Rastreio", "dor": "Atendimento sem informações complementares do rastreio do pedido, somente o que temos na BoxLink é insuficiente e sabemos que na Fup tem mais detalhes", "acao": "Dar acesso a visibilidade por sistema integrado ao time (exemplo BoxLink inicialmente, e posterior subir no CRM)", "resultado": "", "metricaAtual": "", "kpi": "", "prioridade": "", "squad": "", "alinhamento": "", "inicio": "", "fim": "", "status": "", "obs": ""}, {"codigo": "CX7", "setor": "CX", "direcional": "Rastreio", "dor": "Falta de atualização dos e-mails transacionais disparados ao cliente", "acao": "Melhoria do disparo dos e-mails transacionais ao cliente", "resultado": "Menor ganho: E-mails existentes com texto, prazo e orientação coerentes com o processo vigente, reduzindo dúvidas causadas por informação desatualizada. Maior ganho: Cliente informado nos marcos relevantes, com próximo passo claro — especialmente quando o pedido estiver disponível para retirada e quando houver prazo a cumprir.", "metricaAtual": "", "kpi": "Cobertura de comunicação nos eventos elegíveis: (eventos prioritários com comunicação enviada corretamente ÷ total de eventos prioritários elegíveis) × 100. Separar por tipo de evento; “enviado” deve ser conferido nos logs, não presumido pelo status do pedido.", "prioridade": "Alta", "squad": "Q4/2026 · Squad CX", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2026-01-05", "fim": "2026-10-31", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "L1.3", "setor": "Logística", "direcional": "Entrega - Ocorrências", "dor": "Alta incidência de contatos reativos por atraso na entrega.", "acao": "Incluir disparo via WhatsApp no status 'Atraso na Entrega', integrado ao CRM — testar com 2 regiões/2 transportadoras.\nRégua de Comunicação de Atrasos: Fluxo configurado na ferramenta de mensageria com gatilhos automáticos. Teste com 2 Transportadoras em 2 Regiões. \n1- Região Campinas - Transportadora Rodonaves", "resultado": "Menor ganho: cliente informado proativamente. Maior ganho: redução de contatos reativos e custo de atendimento.", "metricaAtual": "", "kpi": "Reduzir contatos relacionados a atraso em X%", "prioridade": "Alta", "squad": "Q4/2026 · Squad Logística", "alinhamento": "Pilar Eficiência Operacional / Redução de Custo", "inicio": "2026-10-22", "fim": "2026-12-31", "status": "Em aprofundamento", "obs": "Custo por disparo: R$ 0,56 (taxa de contato/NPS: Não mensurado) - agenda marcada para o dia 22/10"}, {"codigo": "L2.1", "setor": "Logística", "direcional": "Entrega - Ocorrências", "dor": "Experiência de entrega prejudicada em prédios sem elevador/acesso (subir andares).", "acao": "Entrega Conforto. Alinhar com transportadoras volume/carga limite para entrega com subida de andares, por região.", "resultado": "Menor ganho: alinhamento formal com transportadoras. Maior ganho: aumento do CSAT de entrega em regiões verticais.", "metricaAtual": "", "kpi": "Aumentar CSAT de entrega em regiões com prédios/apartamentos", "prioridade": "Baixa", "squad": "Q1/2027 · Squad Logística", "alinhamento": "Pilar Experiência do Cliente", "inicio": "2027-01-04", "fim": "2027-02-28", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "L3.1", "setor": "Logística", "direcional": "Entrega - Ocorrências", "dor": "Incidência de recebimento de produtos com avaria.", "acao": "Levantar custos de folder, e-mail transacional e disparo WhatsApp de rastreio orientando conferência do produto na entrega.\nTrazer quais as transportadoras que tem mais reclamações para tratr pontualmente com time de Logistica\nVErificar maior incidencia de transportadora e produto", "resultado": "Menor ganho: cliente orientado a conferir produto. Maior ganho: redução de avarias reportadas pós-entrega e custo de reversas.", "metricaAtual": "", "kpi": "Reduzir % de pedidos com avaria reportada", "prioridade": "Média", "squad": "Q1/2027 · Squad CX", "alinhamento": "Pilar Redução de Custo (trocas/reversas)", "inicio": "2027-01-04", "fim": "2027-01-31", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "L5.2", "setor": "Logística Reversa", "direcional": "Rastreio T&D", "dor": "Cliente sem informações do tracking da sua troca/devolução solicitada.", "acao": "Incluir rastreio de coleta no fluxo de troca/devolução.", "resultado": "Menor ganho: visibilidade básica do status. Maior ganho: redução de contatos 'cadê minha coleta' e aumento da confiança no processo.", "metricaAtual": "", "kpi": "Reduzir contatos sobre status de coleta em X%", "prioridade": "Média", "squad": "Q4/2026 · Squad Logística Reversa", "alinhamento": "Pilar Experiência do Cliente", "inicio": "2026-11-02", "fim": "2026-12-15", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T1", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Tracking de trocas e devoluções é manual, sem visibilidade ao cliente e sobrecarregando a operação.", "acao": "Criar notificações automáticas por etapa do T&D, com templates padronizados (Novo CRM + Troque Fácil).", "resultado": "Menor ganho: redução de trabalho manual. Maior ganho: cliente autoatendido sobre status, liberando capacidade operacional.", "metricaAtual": "", "kpi": "Reduzir handling manual (h/mês) e contatos de status em X%", "prioridade": "Alta", "squad": "Q4/2026 · Squad T&D/TI", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2026-11-02", "fim": "2027-01-31", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T2", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Emissão da NFD manualmente e envio do vale crédito SAP para o solicitante interno", "acao": "Emitir NFD no CRM/Troque Fácil e emissão do vale crédito automático através da Uappi ao cliente, dispararando comunicação automática após as emissões com NFD, valor e nº do vale", "resultado": "Menor ganho: elimina a etapa manual isolada de emissão → Maior ganho: automação fiscal ponta a ponta, reduzindo SLA, erro humano e exposição regulatória.", "metricaAtual": "", "kpi": "Reduzir tempo de emissão de NFD + vale para < 24h; zerar erros de cadastro fiscal na emissão", "prioridade": "Crítica", "squad": "A definir · Taskforce Fiscal/TI/T&D (ainda em aprofundamento, não entra em cronograma fechado)", "alinhamento": "Pilar Compliance Fiscal & Eficiência Operacional", "inicio": "A definir", "fim": "A definir", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T3", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Ausência de visão dos vales (créditos) pendentes do cliente.", "acao": "Cliente acompanha vales pendentes via área logada; time interno visualiza na Uappi.", "resultado": "Menor ganho: consulta disponível ao cliente. Maior ganho: redução de chamados sobre status do vale.", "metricaAtual": "", "kpi": "Reduzir chamados 'status do meu vale' em X%", "prioridade": "Média", "squad": "Q1/2027 · Squad T&D/TI", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2027-01-04", "fim": "2027-02-28", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T4", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Emissão manual de NFD para casos de exceção (sinistro).", "acao": "Automatizar emissão de NFD em massa para exceções (sinistro).", "resultado": "Menor ganho: menos digitação manual. Maior ganho: redução do tempo operacional no tratamento de sinistros.", "metricaAtual": "", "kpi": "Reduzir tempo de processamento de sinistros em X%", "prioridade": "Média", "squad": "Q1/2027 · Squad T&D/TI", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2027-02-01", "fim": "2027-02-28", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T5", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Ausência de visibilidade do cadastro fiscal (contribuinte) do cliente no momento da emissão.", "acao": "Integrar validação de cadastro fiscal (contribuinte) via Uappi ao Novo CRM/Troque Fácil.", "resultado": "Menor ganho: alerta de cadastro incompleto. Maior ganho: redução de erros/risco fiscal na emissão de NFD.", "metricaAtual": "", "kpi": "Reduzir % de NFDs emitidas com erro de cadastro fiscal", "prioridade": "Alta", "squad": "Q4/2026 · Squad T&D/TI/Fiscal", "alinhamento": "Pilar Compliance Fiscal", "inicio": "2026-11-02", "fim": "2026-12-15", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T6", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Ausência de trava na emissão de CSDEVOL no SAP quando o pedido já foi faturado.", "acao": "Travar a emissão de CSDEVOL no momento em que ela não está habilitada.", "resultado": "Menor ganho: alerta ao usuário. Maior ganho: eliminação de erro operacional e exposição fiscal.", "metricaAtual": "", "kpi": "Zerar incidentes de CSDEVOL emitido indevidamente", "prioridade": "Crítica", "squad": "Q4/2026 · Squad TI/Fiscal", "alinhamento": "Pilar Compliance Fiscal / Redução de Risco", "inicio": "2026-11-02", "fim": "2026-11-30", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T7", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Ausência de trava na emissão de NFD já cancelada no SAP.", "acao": "Travar a emissão de NFD no momento em que a nota não está habilitada.", "resultado": "Menor ganho: alerta ao usuário. Maior ganho: eliminação de erro operacional e exposição fiscal.", "metricaAtual": "", "kpi": "Zerar incidentes de NFD emitida sobre nota cancelada", "prioridade": "Crítica", "squad": "Q4/2026 · Squad TI/Fiscal", "alinhamento": "Pilar Compliance Fiscal / Redução de Risco", "inicio": "2026-11-02", "fim": "2026-11-30", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "T8", "setor": "T&D", "direcional": "Jornada T&D", "dor": "Ausência de plataforma de auto atendimento para solicitações de trocas e devoluções", "acao": "Testar POC da Troque Fácil", "resultado": "Menor ganho: validação técnica isolada da ferramenta → Maior ganho: viabiliza com segurança todo o cluster de automações de T&D (notificações, NFD, vale crédito), reduzindo risco de retrabalho e falha em produção.", "metricaAtual": "", "kpi": "Taxa de sucesso do POC ≥ 90% das transações testadas sem erro; aprovação formal da plataforma para rollout", "prioridade": "Crítica", "squad": "Q4/2026 · Squad T&D/TI", "alinhamento": "Pilar Eficiência Operacional / Compliance Fiscal", "inicio": "A definir", "fim": "A definir", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "P3", "setor": "T&D Ciclo", "direcional": "Jornada T&D", "dor": "Time de pós-vendas fica responsável pelo bloqueio e desbloqueio de pedidos sem critério formal.", "acao": "Definir matriz de risco e alçadas para bloqueio/desbloqueio pelo time de vendas assistidas.", "resultado": "Menor ganho: critério formalizado. Maior ganho: redução do tempo médio de liberação de pedidos bloqueados.", "metricaAtual": "", "kpi": "Reduzir tempo médio de liberação de pedidos bloqueados", "prioridade": "Média", "squad": "Q4/2026 · Squad Comercial/Pós-vendas", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2026-11-02", "fim": "2026-11-30", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "D3", "setor": "Garantia", "direcional": "Jornada Garantia", "dor": "Ausência de visão do motivo da solicitação de assistência técnica ou envio de peça.", "acao": "Incluir TAG no protocolo para descrição do defeito (gás, sensor etc.).", "resultado": "Menor ganho: categorização do protocolo. Maior ganho: análise de causa raiz e redução de reincidência.", "metricaAtual": "", "kpi": "Aumentar % de protocolos com causa raiz identificada", "prioridade": "Baixa", "squad": "Q1/2027 · Squad Garantia", "alinhamento": "Pilar Qualidade / Eficiência Operacional", "inicio": "2027-02-01", "fim": "2027-02-28", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "C1", "setor": "CD / Reversa & Garantia", "direcional": "Jornada T&D + DOA + Garantia", "dor": "Ausência de controle dos pedidos recebidos por número de série nos casos de DOA fabricante.", "acao": "Validar com o CD a automação de verificação do número de série na entrada (bipagem).", "resultado": "Menor ganho: rastreabilidade do item. Maior ganho: redução de divergências no controle de garantia fabricante.", "metricaAtual": "", "kpi": "Reduzir % de divergência de nº de série em recebimentos DOA", "prioridade": "Média", "squad": "Q1/2027 · Squad CD", "alinhamento": "Pilar Eficiência Operacional / Redução de Custo", "inicio": "2027-01-04", "fim": "2027-01-31", "status": "Não iniciado", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "CX1", "setor": "CX", "direcional": "Jornada cliente", "dor": "Falta de prioridade nos atendimentos do patrão", "acao": "Criação do fluxo exclusivo para os patrões vips selecionados", "resultado": "Menor ganho: atendimento diferenciado identificado. Maior ganho: aumento da retenção e satisfação dos patrões VIP.", "metricaAtual": "", "kpi": "Aumentar CSAT/NPS dos patrões VIP em X%", "prioridade": "Alta", "squad": "Q4/2026 · Squad CX", "alinhamento": "Pilar Experiência do Cliente", "inicio": "2026-08-21", "fim": "2026-11-02", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "CX2", "setor": "CX", "direcional": "NPS", "dor": "Ausência de análise das avaliações de NPS", "acao": "Análise diária do NPS e ação de melhoria com base na avaliação apresentada", "resultado": "Menor ganho: visibilidade diária dos resultados. Maior ganho: ações corretivas rápidas e aumento do NPS geral.", "metricaAtual": "", "kpi": "Aumentar NPS geral em X% / reduzir tempo de resposta a avaliações negativas", "prioridade": "Alta", "squad": "Q4/2026 · Squad CX", "alinhamento": "Pilar Experiência do Cliente", "inicio": "2026-08-13", "fim": "2026-12-31", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "CX3", "setor": "CX", "direcional": "NPS", "dor": "Ausência de NPS Relacional do Patrão", "acao": "Criação de NPS relacional do patrão para medirmos a qualidade dos nossos fluxos internos", "resultado": "Menor ganho: nova métrica implementada. Maior ganho: visão contínua da satisfação do patrão com os fluxos internos.", "metricaAtual": "", "kpi": "Implantar NPS relacional do patrão e atingir meta X pontos", "prioridade": "Média", "squad": "Q4/2026 · Squad CX", "alinhamento": "Pilar Experiência do Cliente", "inicio": "2026-08-10", "fim": "2026-12-31", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "CX4", "setor": "CX", "direcional": "Garantia - Cortina de Ar", "dor": "Ausência de fluxo especial para cortina de ar marca própria Leveros", "acao": "Criação de um fluxo para cortina de ar", "resultado": "Menor ganho: processo formalizado. Maior ganho: redução de erros e padronização no atendimento de cortina de ar.", "metricaAtual": "", "kpi": "Reduzir % de protocolos tratados fora do padrão", "prioridade": "Média", "squad": "Q4/2026 · Squad CX", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2026-09-18", "fim": "2026-11-02", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "CX6", "setor": "CX", "direcional": "Atendimento", "dor": "Ausência de IA para facilitar as dúvidas do atendimento", "acao": "Criação da IA conversacional para auxiliar no atendimento do canal online e offline", "resultado": "Menor ganho: suporte imediato ao atendente. Maior ganho: redução do TMA e aumento da qualidade das respostas.", "metricaAtual": "", "kpi": "Reduzir TMA em X% / aumentar % de respostas corretas na 1ª tentativa", "prioridade": "Alta", "squad": "Q4/2026 · Squad CX", "alinhamento": "Pilar Eficiência Operacional", "inicio": "2026-09-25", "fim": "2026-12-31", "status": "Em aprofundamento", "obs": "Base real — Dores Operacionais CX"}, {"codigo": "CX6", "setor": "CX", "direcional": "Jornada de Loja (HUB)", "dor": "", "acao": "Ponto focal adm para assuntos Operacionais e P´ós vendas", "resultado": "", "metricaAtual": "", "kpi": "", "prioridade": "", "squad": "", "alinhamento": "", "inicio": "", "fim": "", "status": "", "obs": ""}];

        const dorPrioMeta = (p) => DORES_PRIO_META[p] || { badge: DORES_NEUTRO, bar: 'bg-gray-300', ord: 9 };
        const dorStatusMeta = (s) => DORES_STATUS_META[s] || { badge: DORES_NEUTRO, icon: 'fa-circle', ord: 9 };
        const normTxt = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
        const ehISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
        const fmtDor = (v) => ehISO(v) ? fmtBR(v) : (v || '—');
        const dorQuarter = (d) => (String(d.squad || '').match(/^\s*(Q\d\/\d{4})/) || [])[1] || 'A definir';
        const qOrd = (q) => { const m = /^Q(\d)\/(\d{4})$/.exec(q); return m ? (+m[2]) * 10 + (+m[1]) : 99999; };
        const dorChave = (d) => {
            const s = normTxt([d.codigo, d.setor, d.dor, d.acao].join('|'));
            let h2 = 7; for (const c of s) h2 = (h2 * 33 + c.charCodeAt(0)) >>> 0;
            return `${hash(s).toString(36)}${h2.toString(36)}`;
        };
        const dorDocId = (d) => 'imp_' + dorChave(d);
        const camposDor = (d) => { const o = {}; DORES_COLUNAS.forEach(c => { o[c.k] = String(d[c.k] ?? ''); }); return o; };
        function dorCorSetor(setor) {
            const c = PALETA[hash(normTxt(setor)) % PALETA.length];
            const claro = ['#FFCE00', '#6FFFAF', '#4CDDDD'].includes(c);
            return { bg: c, fg: claro ? '#002D32' : '#ffffff' };
        }
        const podeExcluirDor = (d) => isAdmin() || !d.criadoPorEmail || d.criadoPorEmail === state.user?.email;

        // ==========================================================
        // DORES OPERACIONAIS — tempo real (Firestore: coleção "dores")
        // ==========================================================
        function ouvirDores() {
            const u = onSnapshot(collection(db, 'dores'), (snap) => {
                state.dores = snap.docs.map(x => ({ ...x.data(), id: x.id }))
                    .sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || tsMillis(a.criadoEm) - tsMillis(b.criadoEm));
                state.doresLoaded = true; state.doresErro = false;
                if (state.view === 'dores') render();
            }, (err) => {
                console.error('Erro em dores:', err);
                state.doresLoaded = true; state.doresErro = true;
                if (state.view === 'dores') render();
            });
            state.unsubs.push(u);
        }

        // ==========================================================
        // DORES OPERACIONAIS — filtros e agrupamento
        // ==========================================================
        function doresFiltradas() {
            const f = state.filtros.dores, q = normTxt(f.q);
            return state.dores.filter(d =>
                (!f.setor || d.setor === f.setor) && (!f.prio || d.prioridade === f.prio) &&
                (!f.status || d.status === f.status) && (!f.quarter || dorQuarter(d) === f.quarter) &&
                (!q || normTxt(DORES_COLUNAS.map(c => d[c.k]).join(' ')).includes(q)));
        }

        function agruparDores(lista) {
            const g = state.filtros.dores.grupo;
            if (g === 'nenhum') return [{ titulo: '', itens: lista }];
            const chave = (d) => g === 'setor' ? (d.setor || 'Sem setor') : g === 'prioridade' ? (d.prioridade || 'Sem prioridade')
                : g === 'status' ? (d.status || 'Sem status') : dorQuarter(d);
            const mapa = new Map();
            lista.forEach(d => { const k = chave(d); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(d); });
            const grupos = [...mapa].map(([titulo, itens]) => ({ titulo, itens }));
            if (g === 'prioridade') grupos.sort((a, b) => dorPrioMeta(a.titulo).ord - dorPrioMeta(b.titulo).ord);
            if (g === 'status') grupos.sort((a, b) => dorStatusMeta(a.titulo).ord - dorStatusMeta(b.titulo).ord);
            if (g === 'quarter') grupos.sort((a, b) => qOrd(a.titulo) - qOrd(b.titulo));
            return grupos;
        }

        const opcoesDe = (fn) => [...new Set(state.dores.map(fn).filter(Boolean))];
        const optsFiltro = (lista, sel) => lista.map(v => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');

        // ==========================================================
        // DORES OPERACIONAIS — views
        // ==========================================================
        function doresKpisHTML() {
            const n = (fn) => state.dores.filter(fn).length;
            const tile = (rotulo, valor, icon, cor, campo, val) => `
                <button data-action="dor-filtro-rapido" data-campo="${campo}" data-valor="${esc(val)}" class="text-left bg-white border border-gray-200 border-l-4 ${cor} rounded-lg px-3 py-2 hover:shadow-sm transition-shadow">
                    <div class="flex items-center justify-between gap-2"><span class="text-[11px] font-semibold text-gray-500 leading-tight">${rotulo}</span><i class="fas ${icon} text-gray-300 text-xs"></i></div>
                    <div class="text-xl font-bold text-leveros-verde1 leading-tight">${valor}</div>
                </button>`;
            return `
                ${tile('Total de dores', state.dores.length, 'fa-list-ol', 'border-l-leveros-verde2', 'limpar', '')}
                ${tile('Em aprofundamento', n(d => d.status === 'Em aprofundamento'), 'fa-spinner', 'border-l-yellow-400', 'status', 'Em aprofundamento')}
                ${tile('Não iniciado', n(d => d.status === 'Não iniciado'), 'fa-pause-circle', 'border-l-gray-400', 'status', 'Não iniciado')}
                ${tile('Concluído', n(d => d.status === 'Concluído'), 'fa-check-double', 'border-l-green-500', 'status', 'Concluído')}
                ${tile('Prioridade crítica', n(d => d.prioridade === 'Crítica'), 'fa-triangle-exclamation', 'border-l-red-600', 'prio', 'Crítica')}
                ${tile('Prioridade alta', n(d => d.prioridade === 'Alta'), 'fa-arrow-up', 'border-l-orange-400', 'prio', 'Alta')}`;
        }

        function cardDorHTML(d) {
            const pm = dorPrioMeta(d.prioridade), sm = dorStatusMeta(d.status);
            return `
            <div role="button" tabindex="0" data-action="dor-ver" data-id="${esc(d.id)}" class="bg-white rounded-lg border border-gray-200 hover:border-leveros-verde2 hover:shadow-md transition cursor-pointer relative pl-4 pr-3 py-3 flex flex-col gap-1.5">
                <span class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${pm.bar}"></span>
                <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span class="font-bold text-gray-500">#${esc(d.codigo || '—')}</span>
                    <span class="px-1.5 py-0.5 rounded-full border font-bold ${pm.badge}">${esc(d.prioridade || '—')}</span>
                    <span class="ml-auto px-1.5 py-0.5 rounded-full border font-semibold ${sm.badge}"><i class="fas ${sm.icon} mr-1"></i>${esc(d.status || '—')}</span>
                </div>
                <div class="text-[10px] uppercase font-bold tracking-wide text-leveros-verde2 truncate">${esc(d.setor)}${d.direcional ? ' · ' + esc(d.direcional) : ''}</div>
                <h4 class="text-sm font-semibold text-gray-800 leading-snug line-clamp-3">${d.dor ? esc(d.dor) : '<span class="text-gray-400 font-normal">(sem descrição da dor)</span>'}</h4>
                <p class="text-xs text-gray-600 line-clamp-3 whitespace-pre-line"><i class="fas fa-hammer text-blue-400 mr-1"></i>${esc(d.acao)}</p>
                <div class="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-x-3 gap-y-1 text-[11px] text-gray-500 flex-wrap">
                    <span class="truncate max-w-full"><i class="fas fa-users mr-1 text-gray-400"></i>${esc(d.squad || '—')}</span>
                    <span class="whitespace-nowrap"><i class="far fa-calendar-alt mr-1 text-gray-400"></i>${fmtDor(d.inicio)} → ${fmtDor(d.fim)}</span>
                </div>
            </div>`;
        }

        const DORES_LARGURAS = { codigo: 'min-w-[64px]', setor: 'min-w-[120px]', direcional: 'min-w-[140px]', dor: 'min-w-[280px]', acao: 'min-w-[300px]', resultado: 'min-w-[300px]', metricaAtual: 'min-w-[160px]', kpi: 'min-w-[240px]', prioridade: 'min-w-[90px]', squad: 'min-w-[180px]', alinhamento: 'min-w-[170px]', inicio: 'min-w-[96px]', fim: 'min-w-[96px]', status: 'min-w-[160px]', obs: 'min-w-[220px]' };

        function tabelaDoresHTML(grupos) {
            const linha = (d) => `
                <tr data-action="dor-ver" data-id="${esc(d.id)}" class="border-t border-gray-100 hover:bg-leveros-verde4/30 cursor-pointer align-top">
                    ${DORES_COLUNAS.map(c => {
                        const v = d[c.k];
                        if (c.k === 'prioridade') return `<td class="px-2 py-2"><span class="px-1.5 py-0.5 rounded-full border font-bold text-[11px] whitespace-nowrap ${dorPrioMeta(v).badge}">${esc(v || '—')}</span></td>`;
                        if (c.k === 'status') {
                            const lista = DORES_STATUS.includes(v) || !v ? DORES_STATUS : [v, ...DORES_STATUS];
                            return `<td class="px-2 py-2"><select data-action="noop" data-id="${esc(d.id)}" class="dor-status-sel inp !py-1 !px-1.5 !text-xs ${dorStatusMeta(v).badge}">${v ? '' : '<option value="" selected>—</option>'}${lista.map(s => `<option ${s === v ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>`;
                        }
                        if (c.k === 'inicio' || c.k === 'fim') return `<td class="px-2 py-2 whitespace-nowrap">${fmtDor(v)}</td>`;
                        if (c.k === 'codigo') return `<td class="px-2 py-2 font-bold text-gray-600 whitespace-nowrap">${esc(v || '—')}</td>`;
                        return `<td class="px-2 py-2 whitespace-pre-line break-words">${esc(v)}</td>`;
                    }).join('')}
                </tr>`;
            return `
            <div class="bg-white border border-gray-200 rounded-lg overflow-auto" style="max-height: calc(100vh - 16.5rem)">
                <table class="w-full text-xs text-gray-700 border-collapse">
                    <thead><tr>${DORES_COLUNAS.map(c => `<th class="sticky top-0 z-10 bg-leveros-verde1 text-white text-left font-semibold px-2 py-2 ${DORES_LARGURAS[c.k]}">${esc(c.h)}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${grupos.map(g => (g.titulo ? `<tr><td colspan="${DORES_COLUNAS.length}" class="bg-leveros-verde4/60 text-leveros-verde1 font-bold px-3 py-1.5 text-xs">${esc(g.titulo)} <span class="font-normal text-gray-500">· ${g.itens.length}</span></td></tr>` : '') + g.itens.map(linha).join('')).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        function doresResultadoHTML() {
            if (state.doresErro) return `
                <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
                    <b><i class="fas fa-triangle-exclamation mr-1"></i> Não foi possível ler a coleção "dores" no Firestore.</b>
                    <p class="mt-1">Provavelmente falta liberar a coleção nas regras do Firestore. Adicione em <i>Firestore → Regras</i>:</p>
                    <pre class="mt-2 bg-white border border-red-100 rounded p-2 text-xs overflow-auto">match /dores/{id} {
  allow read, write: if request.auth != null
    &amp;&amp; request.auth.token.email.matches('.*@leveros.com.br');
}</pre>
                </div>`;
            if (!state.doresLoaded) return '<div class="text-center py-16"><div class="loader"></div></div>';
            if (!state.dores.length) return `
                <div class="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                    <i class="fas fa-heart-crack text-4xl text-leveros-azul mb-3"></i>
                    <h3 class="font-bold text-leveros-verde1 text-lg">Nenhuma dor cadastrada ainda</h3>
                    <p class="text-sm text-gray-500 mt-1 mb-5">Carregue a planilha base (${DORES_BASE.length} dores) ou comece cadastrando uma nova.</p>
                    <div class="flex justify-center gap-2 flex-wrap">
                        <button data-action="dor-carregar-base" class="bg-leveros-verde1 text-white hover:bg-leveros-verde2 px-4 py-2 rounded-lg font-semibold text-sm"><i class="fas fa-file-import mr-1"></i> Carregar planilha base (${DORES_BASE.length} dores)</button>
                        <button data-action="dor-nova" class="bg-leveros-amarelo text-leveros-verde1 hover:bg-yellow-400 px-4 py-2 rounded-lg font-semibold text-sm"><i class="fas fa-plus mr-1"></i> Nova dor</button>
                    </div>
                </div>`;
            const lista = doresFiltradas();
            if (!lista.length) return '<div class="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">Nenhuma dor encontrada com esses filtros. <button data-action="dor-limpar" class="text-leveros-verde2 font-semibold underline">Limpar filtros</button></div>';
            const grupos = agruparDores(lista);
            if (state.filtros.dores.modo === 'tabela') return tabelaDoresHTML(grupos);
            return grupos.map(g => {
                const cor = state.filtros.dores.grupo === 'setor' ? dorCorSetor(g.titulo) : { bg: '#005A64', fg: '#ffffff' };
                return `
                <section class="mb-4">
                    ${g.titulo ? `<div class="flex items-center gap-2 mb-2">
                        <span class="px-2.5 py-1 rounded-md text-sm font-bold" style="background:${cor.bg};color:${cor.fg}">${esc(g.titulo)}</span>
                        <span class="text-xs text-gray-500">${g.itens.length} ${g.itens.length === 1 ? 'dor' : 'dores'}</span>
                        <div class="flex-1 border-t border-gray-200"></div>
                    </div>` : ''}
                    <div class="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">${g.itens.map(cardDorHTML).join('')}</div>
                </section>`;
            }).join('');
        }

        function doresContagemHTML() {
            const filtrando = Object.entries(state.filtros.dores).some(([k, v]) => ['q', 'setor', 'prio', 'status', 'quarter'].includes(k) && v);
            return `Mostrando <b>${doresFiltradas().length}</b> de ${state.dores.length}${filtrando ? ' · <button data-action="dor-limpar" class="text-leveros-verde2 font-semibold underline">limpar filtros</button>' : ''}`;
        }

        // Atualiza só KPIs/lista/filtros (não perde o foco da busca nem a posição da página)
        function atualizarDores() {
            if (!$('#dores-root')) return;
            const f = state.filtros.dores;
            $('#dores-kpis').innerHTML = doresKpisHTML();
            $('#dores-resultado').innerHTML = doresResultadoHTML();
            $('#dores-contagem').innerHTML = doresContagemHTML();
            const setSel = (id, html, val) => { const s = $(id); if (s) { s.innerHTML = html; s.value = val; } };
            setSel('#dr-setor', '<option value="">Todos os setores</option>' + optsFiltro(opcoesDe(d => d.setor), f.setor), f.setor);
            setSel('#dr-quarter', '<option value="">Todos os quarters</option>' + optsFiltro(opcoesDe(dorQuarter).sort((a, b) => qOrd(a) - qOrd(b)), f.quarter), f.quarter);
            const q = $('#dr-q'); if (q && document.activeElement !== q) q.value = f.q;
            ['prio', 'status', 'grupo'].forEach(k => { const s = $('#dr-' + k); if (s) s.value = f[k]; });
            document.querySelectorAll('[data-action=dor-modo]').forEach(b => {
                const ativo = b.dataset.modo === f.modo;
                b.classList.toggle('bg-leveros-verde1', ativo); b.classList.toggle('text-white', ativo);
                b.classList.toggle('text-gray-600', !ativo);
            });
        }

        function doresOperacionaisHTML() {
            const f = state.filtros.dores;
            const btnModo = (modo, icon, rot) => `<button data-action="dor-modo" data-modo="${modo}" class="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${f.modo === modo ? 'bg-leveros-verde1 text-white' : 'text-gray-600'}"><i class="fas ${icon}"></i> ${rot}</button>`;
            return `
            <div id="dores-root">
                <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div>
                        <h2 class="text-xl font-bold text-leveros-verde1 leading-tight">Dores Operacionais</h2>
                        <p class="text-xs text-gray-500">Cronograma de priorização de projetos · atualizado em tempo real para todo o time</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button data-action="dor-nova" class="bg-leveros-amarelo text-leveros-verde1 hover:bg-yellow-400 px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"><i class="fas fa-plus"></i> Nova dor</button>
                        <button data-action="dor-importar" title="Importar novas dores de uma planilha Excel" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"><i class="fas fa-file-import text-leveros-verde2"></i> Importar Excel</button>
                        <button data-action="dor-exportar" title="Exportar tudo para Excel" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 w-9 h-9 rounded-lg flex items-center justify-center"><i class="fas fa-file-excel text-green-600"></i></button>
                        <button data-action="dor-modelo" title="Baixar planilha modelo (para preencher várias dores de uma vez)" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 w-9 h-9 rounded-lg flex items-center justify-center"><i class="fas fa-table-list text-gray-500"></i></button>
                        <input type="file" id="dor-file" accept=".xlsx,.xls,.csv" class="hidden">
                    </div>
                </div>

                <div id="dores-kpis" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">${doresKpisHTML()}</div>

                <div class="bg-white border border-gray-200 rounded-lg p-2 mb-3 flex flex-wrap items-center gap-2">
                    <div class="relative flex-1 min-w-[200px]"><i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i><input id="dr-q" class="inp !pl-8 !py-1.5" placeholder="Buscar em qualquer campo (dor, ação, KPI, observações...)" value="${esc(f.q)}"></div>
                    <select id="dr-setor" class="inp !w-auto !py-1.5"><option value="">Todos os setores</option>${optsFiltro(opcoesDe(d => d.setor), f.setor)}</select>
                    <select id="dr-prio" class="inp !w-auto !py-1.5"><option value="">Toda prioridade</option>${optsFiltro(DORES_PRIO, f.prio)}</select>
                    <select id="dr-status" class="inp !w-auto !py-1.5"><option value="">Todo status</option>${optsFiltro(DORES_STATUS, f.status)}</select>
                    <select id="dr-quarter" class="inp !w-auto !py-1.5"><option value="">Todos os quarters</option>${optsFiltro(opcoesDe(dorQuarter).sort((a, b) => qOrd(a) - qOrd(b)), f.quarter)}</select>
                    <select id="dr-grupo" title="Agrupar por" class="inp !w-auto !py-1.5">
                        ${[['setor', 'Agrupar: Setor'], ['prioridade', 'Agrupar: Prioridade'], ['status', 'Agrupar: Status'], ['quarter', 'Agrupar: Quarter'], ['nenhum', 'Sem agrupamento']].map(([v, r]) => `<option value="${v}" ${f.grupo === v ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                    <div class="flex border border-gray-300 rounded-lg overflow-hidden shrink-0">${btnModo('cards', 'fa-table-cells-large', 'Cards')}${btnModo('tabela', 'fa-table', 'Tabela')}</div>
                </div>
                <div id="dores-contagem" class="text-xs text-gray-500 mb-2 px-1">${doresContagemHTML()}</div>

                <div id="dores-resultado">${doresResultadoHTML()}</div>
            </div>`;
        }

        // ==========================================================
        // DORES OPERACIONAIS — detalhe (100% dos campos), formulário, exclusão
        // ==========================================================
        function abrirDetalheDor(id) {
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

        function modalDor(id = '') {
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

        async function salvarDor() {
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

        async function excluirDor(id) {
            const d = state.dores.find(x => x.id === id); if (!d) return;
            if (!podeExcluirDor(d)) return toast('Somente quem cadastrou a dor ou um administrador pode excluir.', 'erro');
            if (!confirm(`Excluir a dor "${d.codigo || ''} ${(d.dor || d.acao || '').slice(0, 60)}"? Essa ação não pode ser desfeita.`)) return;
            await deleteDoc(doc(db, 'dores', id));
            fecharModal(); toast('Dor excluída.');
        }

        async function mudarStatusDor(id, status) {
            try { await updateDoc(doc(db, 'dores', id), { status, atualizadoEm: serverTimestamp(), atualizadoPorEmail: state.user.email }); toast('Status atualizado.'); }
            catch (err) { console.error(err); toast('Erro ao atualizar o status.', 'erro'); }
        }

        // ==========================================================
        // DORES OPERACIONAIS — importar / exportar Excel
        // ==========================================================
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

        // separa o que já existe (mesmo ID + setor + dor + ação) do que é novo
        function separarNovas(lista) {
            const existentes = new Set(state.dores.map(dorChave)), vistos = new Set(), novas = [];
            let repetidas = 0;
            lista.forEach(d => { const k = dorChave(d); if (existentes.has(k) || vistos.has(k)) repetidas++; else { vistos.add(k); novas.push(d); } });
            return { novas, repetidas };
        }

        function dataParaISO(v) {
            if (v instanceof Date && !isNaN(v)) {
                const z = new Date(v.getTime() + 12 * 3600e3); // evita virar o dia por fuso horário
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

        async function lerPlanilhaDores(file) {
            try {
                const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const dados = lerLinhasDores(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }));
                if (!dados.length) return toast('A planilha não tem nenhuma dor para importar.', 'erro');
                mostrarPreviaImportacao(dados, `Arquivo: ${file.name}`, 'planilha');
            } catch (err) { console.error(err); toast(err.message || 'Não foi possível ler a planilha.', 'erro'); }
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

        async function confirmarImportacaoDores(btn) {
            const imp = state.importDores; if (!imp?.novas.length) return;
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
            try { await gravarDoresEmLote(imp.novas, imp.origem); fecharModal(); toast(`${imp.novas.length} dores importadas!`); state.importDores = null; }
            catch (err) { console.error(err); toast('Erro ao importar. Verifique as permissões do Firestore.', 'erro'); btn.disabled = false; btn.innerHTML = 'Tentar novamente'; }
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

        const exportarDores = () => { baixarPlanilhaDores(state.dores, `DORES_OPERACIONAIS_${hojeISO()}.xlsx`); toast('Planilha exportada!'); };
        const baixarModeloDores = () => {
            baixarPlanilhaDores([{ codigo: 'X1', setor: 'CX', direcional: 'Jornada cliente', dor: 'Descreva a dor aqui', acao: 'O que será feito', resultado: 'Menor ganho: … Maior ganho: …', kpi: 'Reduzir X em Y%', prioridade: 'Média', squad: 'Q1/2027 · Squad CX', alinhamento: 'Pilar Eficiência Operacional', inicio: '2027-01-04', fim: '2027-02-28', status: 'Não iniciado', obs: '' }], 'MODELO_DORES_OPERACIONAIS.xlsx');
            toast('Modelo baixado. Preencha e use "Importar Excel".', 'info');
        };

        // ==========================================================
