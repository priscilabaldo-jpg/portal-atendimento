// Tarefas — permissões.
import { isAdmin } from './helpers.js';
import { state } from './state.js';

export const ehResponsavel = (t) => t.responsavelEmail === state.user?.email;
export const ehColaborador = (t) => (t.colaboradoresEmails || []).includes(state.user?.email);
export const podeEditarTudo = (t) => ehResponsavel(t) || isAdmin();
export const podeAtuar = (t) => podeEditarTudo(t) || ehColaborador(t);
export const permKey = (t) => `${podeEditarTudo(t) ? 1 : 0}${podeAtuar(t) ? 1 : 0}`;
