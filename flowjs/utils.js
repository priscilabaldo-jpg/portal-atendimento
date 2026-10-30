// Utilitários puros: DOM, escape de HTML, datas.
import { PALETA } from './constants.js';

export const $ = (s, r = document) => r.querySelector(s);
export const esc = (str) => (str === null || str === undefined) ? '' : String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hojeISO = () => toISO(new Date());
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const diasPara = (s) => s ? Math.round((parseISO(s) - parseISO(hojeISO())) / 86400000) : null;
export const fmtBR = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
export const tsMillis = (ts) => ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now();
export const fmtDataHora = (ms) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
export const corProjeto = (c) => PALETA.includes(c) ? c : PALETA[0];
export const primeiroNome = (n) => (n || '').split(' ')[0] || '';
