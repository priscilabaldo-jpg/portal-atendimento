// Configurações do projeto (Firebase, domínio permitido, administradores, e-mail).
export const firebaseConfig = {
    apiKey: "AIzaSyBTiJKRNXNt4H9IqATRrm9U32frQIQUvMo",
    authDomain: "portalcx-d6f7f.firebaseapp.com",
    databaseURL: "https://portalcx-d6f7f-default-rtdb.firebaseio.com",
    projectId: "portalcx-d6f7f",
    storageBucket: "portalcx-d6f7f.firebasestorage.app",
    messagingSenderId: "487975108101",
    appId: "1:487975108101:web:bf9dfee437c7ac2522266c",
    measurementId: "G-VEEHMX90Q7"
};

export const DOMINIO = '@leveros.com.br';
export const ADMINS = ['priscila.baldo@leveros.com.br', 'matheus.mendes@leveros.com.br'];

export const EMAIL_CONFIG = {
    provider: 'emailjs',
    emailjs: { serviceId: 'service_bs7w0ss', templateId: 'template_oet9kkt', publicKey: 'AUZIT5qioj8fQ_cQ8' }
};
