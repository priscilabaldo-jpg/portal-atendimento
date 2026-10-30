// Ponto de entrada do CX FLOW.
import { acoesNotificacoes } from './notificacoes.js';

import { initAuth } from './auth.js';
import { initEvents } from './events.js';

initEvents();
initAuth();
