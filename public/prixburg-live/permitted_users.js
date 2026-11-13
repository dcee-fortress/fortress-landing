// Permitted Users Configuration
// This file contains all authorized users with their credentials

const PERMITTED_USERS = [
    {
        username: 'CLEANZ',
        password: 'CLEANZ123',
        role: 'Administrator',
        permissions: ['read', 'write', 'delete', 'manage_users']
    }
];

const LOGIN_DETAILS_KEY = 'prixburgLoginDetails';
const DEFAULT_LOGIN_DETAILS = {
    mainUsername: 'CLEANZ',
    mainPassword: 'CLEANZ123',
    settingsUsername: 'PRIXBURG CHEMICALS',
    settingsPassword: 'Prixburg',
    ceoName: 'Tawanda Chitukutuku'
};

function normalizeLoginDetails(value) {
    const saved = value && typeof value === 'object' ? value : {};
    return {
        mainUsername: String(saved.mainUsername != null ? saved.mainUsername : DEFAULT_LOGIN_DETAILS.mainUsername),
        mainPassword: String(saved.mainPassword != null ? saved.mainPassword : DEFAULT_LOGIN_DETAILS.mainPassword),
        settingsUsername: String(saved.settingsUsername != null ? saved.settingsUsername : DEFAULT_LOGIN_DETAILS.settingsUsername),
        settingsPassword: String(saved.settingsPassword != null ? saved.settingsPassword : DEFAULT_LOGIN_DETAILS.settingsPassword),
        ceoName: String(saved.ceoName != null ? saved.ceoName : DEFAULT_LOGIN_DETAILS.ceoName)
    };
}

function getLoginDetails() {
    if (typeof dbGet !== 'function') return normalizeLoginDetails(DEFAULT_LOGIN_DETAILS);
    return normalizeLoginDetails(dbGet(LOGIN_DETAILS_KEY));
}

function saveLoginDetails(details) {
    const next = normalizeLoginDetails(details);
    if (typeof dbSet === 'function') dbSet(LOGIN_DETAILS_KEY, next);
    return next;
}

function checkMainCredentials(username, password) {
    const details = getLoginDetails();
    return String(username || '').trim() === String(details.mainUsername || '').trim()
        && String(password || '') === String(details.mainPassword || '');
}

function checkSettingsCredentials(username, password) {
    const details = getLoginDetails();
    return String(username || '').trim() === String(details.settingsUsername || '').trim()
        && String(password || '') === String(details.settingsPassword || '');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PERMITTED_USERS;
}
