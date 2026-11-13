function fillLoginDetailsForm() {
    const details = getLoginDetails();
    document.getElementById('mainUsername').value = details.mainUsername;
    document.getElementById('mainPassword').value = details.mainPassword;
    document.getElementById('settingsUsername').value = details.settingsUsername;
    document.getElementById('settingsPassword').value = details.settingsPassword;
}

function setLoginDetailsStatus(message) {
    const status = document.getElementById('loginDetailsStatus');
    if (status) status.textContent = message || '';
}

document.getElementById('loginDetailsForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const details = {
        mainUsername: document.getElementById('mainUsername').value.trim(),
        mainPassword: document.getElementById('mainPassword').value,
        settingsUsername: document.getElementById('settingsUsername').value.trim(),
        settingsPassword: document.getElementById('settingsPassword').value
    };

    if (!details.mainUsername || !details.mainPassword || !details.settingsUsername || !details.settingsPassword) {
        setLoginDetailsStatus('Enter a username and password in both sections.');
        return;
    }

    saveLoginDetails(details);
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        sessionStorage.setItem('currentUser', details.mainUsername);
    }
    setLoginDetailsStatus('Saved.');
});

document.querySelectorAll('#loginDetailsForm input').forEach(function (input) {
    input.addEventListener('input', function () {
        setLoginDetailsStatus('');
    });
});

whenDbReady(fillLoginDetailsForm);
