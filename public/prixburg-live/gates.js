const GATE_USERNAME = 'PRIXBURG CHEMICALS';
const GATE_PASSWORD = 'Prixburg';
const SETTINGS_ACCESS_KEY = 'prixburgSettingsAccess';
const FORMULAS_ACCESS_KEY = 'prixburgFormulasAccess';

function checkGateCredentials(username, password) {
    if (typeof checkSettingsCredentials === 'function') {
        return checkSettingsCredentials(username, password);
    }
    return String(username || '').trim() === GATE_USERNAME && String(password || '') === GATE_PASSWORD;
}

function grantSettingsAccess() {
    sessionStorage.setItem(SETTINGS_ACCESS_KEY, 'true');
}

function grantFormulasAccess() {
    sessionStorage.setItem(FORMULAS_ACCESS_KEY, 'true');
}

function hasSettingsAccess() {
    return sessionStorage.getItem(SETTINGS_ACCESS_KEY) === 'true';
}

function hasFormulasAccess() {
    return sessionStorage.getItem(FORMULAS_ACCESS_KEY) === 'true';
}

function requireSettingsAccess() {
    if (!hasSettingsAccess()) {
        window.location.href = 'access-login.html?next=settings';
        return false;
    }
    return true;
}

function requireFormulasAccess() {
    if (!hasFormulasAccess()) {
        window.location.href = 'access-login.html?next=formulas';
        return false;
    }
    return true;
}

function gateNextTarget() {
    const params = new URLSearchParams(window.location.search);
    return params.get('next') === 'formulas' ? 'formulas' : 'settings';
}
