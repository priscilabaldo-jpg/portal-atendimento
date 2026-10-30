// Configurações do projeto (Firebase, domínio permitido, administradores, e-mail).
export const firebaseConfig = {
    apiKey:      "AIzaSyA6WjOoM-KCi-Yl4E5rwKbOulF8tBYEClo",
    authDomain:  "portal-atendimento-541ae.firebaseapp.com",
    projectId:   "portal-atendimento-541ae",
    storageBucket: "portal-atendimento-541ae.appspot.com"
};

export const DOMINIO = '@leveros.com.br';
export const ADMINS = ['priscila.baldo@leveros.com.br', 'matheus.mendes@leveros.com.br'];

export const EMAIL_CONFIG = {
    provider: 'emailjs',
    emailjs: { serviceId: 'service_bs7w0ss', templateId: 'template_oet9kkt', publicKey: 'AUZIT5qioj8fQ_cQ8' }
};
