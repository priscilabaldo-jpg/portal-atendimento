// Constantes de interface: status, prioridades, categorias da rotina, paleta, calendário.
export const STATUS = ['Pendente', 'Em Andamento', 'Validado'];
export const STATUS_META = {
    'Pendente':     { icon: 'fa-inbox',      txt: 'text-red-500',   border: 'border-red-400',   badge: 'bg-red-100 text-red-600' },
    'Em Andamento': { icon: 'fa-spinner',      txt: 'text-blue-500',  border: 'border-blue-400',  badge: 'bg-blue-100 text-blue-600' },
    'Validado':     { icon: 'fa-check-double', txt: 'text-leveros-verde2', border: 'border-leveros-verde3', badge: 'bg-green-100 text-green-700' }
};
export const PRIORIDADES = ['Baixa', 'Média', 'Alta'];
export const PRIO_META = {
    'Baixa': { cls: 'bg-gray-100 text-gray-600', icon: 'fa-arrow-down' },
    'Média': { cls: 'bg-blue-100 text-blue-700', icon: 'fa-equals' },
    'Alta':  { cls: 'bg-orange-100 text-orange-700', icon: 'fa-arrow-up' }
};

export const STATUS_ROTINA_META = {
    'Não iniciado': 'bg-pink-100 text-pink-700 border-pink-200',
    'Iniciado': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pausado': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'Concluído Parcial': 'bg-purple-100 text-purple-700 border-purple-200',
    'Concluído': 'bg-green-100 text-green-700 border-green-200',
    'Continua': 'bg-leveros-verde2 text-white border-leveros-verde1'
};
export const STATUS_ROTINA = Object.keys(STATUS_ROTINA_META);
export const CATS_ROTINA = ['Rotina Operacional', 'Suporte e Dúvidas', 'Reuniões', 'Melhoria Contínua', 'Planejamento', 'Outros'];

export const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const PALETA = ['#005A64', '#4CDDDD', '#6FFFAF', '#FFCE00', '#F97316', '#8B5CF6', '#EC4899', '#3B82F6'];
export const AV_CORES = ['bg-teal-600', 'bg-sky-600', 'bg-violet-600', 'bg-pink-600', 'bg-orange-500', 'bg-emerald-600', 'bg-indigo-600', 'bg-rose-600'];
