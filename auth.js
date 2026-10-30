// Login com Google (restrito ao domínio corporativo).
import { auth, db, doc, onAuthStateChanged, serverTimestamp, setDoc, signOut } from './firebase.js';
import { DOMINIO } from './config.js';
import { nomeDoEmail } from './helpers.js';
import { iniciarListeners, pararListeners } from './listeners.js';
import { state } from './state.js';
import { $, esc } from './utils.js';

export function mostrarErroLogin(msg) {
    const el = $('#login-error');
    el.textContent = msg; el.classList.remove('hidden');
}
export function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const email = (user.email || '').toLowerCase();
            if (!email.endsWith(DOMINIO) || !user.emailVerified) {
                mostrarErroLogin(`Acesso restrito a contas ${DOMINIO}.`);
                await signOut(auth);
                return;
            }
            state.user = { uid: user.uid, email, nome: user.displayName || nomeDoEmail(email), foto: user.photoURL || '' };
            $('#login-screen').classList.add('hidden');
            $('#app-screen').classList.remove('hidden');
            $('#app-screen').classList.add('flex');
            $('#user-name').textContent = state.user.nome;
            $('#user-avatar').innerHTML = state.user.foto
                ? `<img src="${esc(state.user.foto)}" referrerpolicy="no-referrer" class="w-full h-full object-cover">`
                : '<i class="fas fa-user text-white"></i>';
            $('#view').innerHTML = '<div class="text-center py-20"><div class="loader"></div><p class="text-gray-500">Sincronizando com o banco de dados...</p></div>';
            try {
                await setDoc(doc(db, 'proj_membros', email), {
                    email, nome: state.user.nome, foto: state.user.foto, ultimoAcesso: serverTimestamp()
                }, { merge: true });
            } catch (e) { /* log removido em produção */ }
            iniciarListeners();
        } else {
            pararListeners();
            state.user = null;
            $('#app-screen').classList.add('hidden');
            $('#app-screen').classList.remove('flex');
            $('#login-screen').classList.remove('hidden');
        }
    });
}
