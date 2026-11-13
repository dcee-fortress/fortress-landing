function checkAuthentication() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const loginTime = sessionStorage.getItem('loginTime');
    const sessionTimeout = 8 * 60 * 60 * 1000;

    if (!isLoggedIn || !loginTime) {
        window.location.replace('login.html');
        return false;
    }

    const now = new Date().getTime();
    const sessionAge = now - parseInt(loginTime);

    if (sessionAge > sessionTimeout) {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loginTime');
        sessionStorage.removeItem('currentUser');
        window.location.replace('login.html?logout=true');
        return false;
    }

    return true;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loginTime');
        sessionStorage.removeItem('currentUser');
        window.location.replace('login.html?logout=true');
    }
}

function iconHome() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M10 21v-6h4v6"/></svg>';
}

function iconSettings() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
}

function iconLogout() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';
}

function iconRawMaterials() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/></svg>';
}

function iconFactory() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V10l5 3V10l5 3V5h4v16"/></svg>';
}

function iconFinance() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2"/></svg>';
}

function iconCeo() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 14v4"/><path d="M12 9v9"/><path d="M17 5v13"/></svg>';
}

function iconSales() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/></svg>';
}

function iconProfit() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>';
}

function iconCredit() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
}

function iconProduction() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v7.5L5.2 18.2A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.8L14 10.5V3"/><path d="M8.5 14h7"/></svg>';
}

function iconFinished() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M12 8v8"/><path d="M8.5 12h7"/></svg>';
}

function iconEntry() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>';
}

function iconAnalysis() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="10" width="3" height="6"/><rect x="12" y="7" width="3" height="9"/><rect x="17" y="12" width="3" height="4"/></svg>';
}

function iconDaily() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M19.1 4.9l-1.4 1.4"/><path d="M6.3 17.7l-1.4 1.4"/></svg>';
}

function iconWeekly() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>';
}

function iconMonthly() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';
}

function iconYearly() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V10l6-5 6 5v10"/><path d="M10 20v-5h4v5"/></svg>';
}

function iconStoreroom() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-6 9 6"/><path d="M4 10v10h16V10"/><path d="M9 20v-6h6v6"/></svg>';
}

function iconMovement() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3"/><path d="M18 7l-3 3"/><path d="M17 17H6l3 3"/><path d="M6 17l3-3"/></svg>';
}

function iconGo() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
}

function choiceButtonIcon(label) {
    const text = String(label || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const icons = {
        'sales reports': iconSales,
        'sales analysis report': iconAnalysis,
        'profit and expense reports': iconProfit,
        'outstanding credit report': iconCredit,
        'outstanding credit entry': iconCredit,
        'production report': iconProduction,
        'finished products': iconFinished,
        'manufacturing factory': iconFactory,
        'sales and finance': iconFinance,
        'sales entry reports': iconEntry,
        'daily sales entry': iconEntry,
        'weekly sales entry': iconEntry,
        'monthly sales entry': iconEntry,
        'yearly sales entry': iconEntry,
        'daily expenses entry': iconProfit,
        'weekly expenses entry': iconProfit,
        'monthly expenses entry': iconProfit,
        'yearly expenses entry': iconProfit,
        'daily': iconDaily,
        'weekly': iconWeekly,
        'monthly': iconMonthly,
        'yearly': iconYearly,
        'store room': iconStoreroom,
        'movement history': iconMovement,
        'raw materials': iconRawMaterials,
        'ceo analysis': iconCeo,
        'ceo net profit': iconProfit,
        'ceo gross profit': iconProduction
    };
    const draw = icons[text] || iconGo;
    return draw();
}

function decorateChoiceButtons() {
    const buttons = document.querySelectorAll('a.choice-btn, button.choice-btn');
    Array.prototype.forEach.call(buttons, function (button) {
        if (button.querySelector('svg')) return;
        button.insertAdjacentHTML('afterbegin', choiceButtonIcon(button.textContent));
    });
}

function renderAppMenu() {
    const menu = document.getElementById('dropdownMenu');
    if (!menu) return;

    menu.innerHTML = `
        <a class="menu-btn" href="index.html">${iconHome()} Home</a>
        <a class="menu-btn" href="manufacturing-factory.html">${iconFactory()} Manufacturing factory</a>
        <a class="menu-btn" href="sales-finance.html">${iconFinance()} Sales and finance</a>
        <a class="menu-btn" href="ceo-analysis.html">${iconCeo()} CEO Analysis</a>
    `;
}

function syncStatusLabel() {
    return typeof dbSyncLabel === 'function' ? dbSyncLabel() : 'Synced';
}

function paintSyncPill() {
    const el = document.getElementById('topbarActions');
    if (!el) return;
    const label = syncStatusLabel();
    const waiting = label === 'Waiting';
    let pill = document.getElementById('syncPill');
    if (!pill) {
        pill = document.createElement('span');
        pill.id = 'syncPill';
        el.insertBefore(pill, el.firstChild);
    }
    pill.textContent = label;
    pill.className = 'sync-pill ' + (waiting ? 'is-waiting' : 'is-synced');
    pill.title = waiting
        ? 'Saved on this device. It uploads when the internet is back.'
        : 'Uploaded to the main system.';
}

function renderTopbarActions() {
    const el = document.getElementById('topbarActions');
    if (!el) return;

    el.innerHTML = `
        <a class="icon-btn icon-settings" href="access-login.html?next=settings" title="Settings">${iconSettings()}</a>
        <button type="button" class="icon-btn icon-logout" onclick="logout()" title="Logout">${iconLogout()}</button>
    `;
    paintSyncPill();
}

function toggleDropdown(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const menu = document.getElementById('dropdownMenu');
    if (!menu) return;
    menu.classList.toggle('show');
}

function closeAllMenus() {
    const menu = document.getElementById('dropdownMenu');
    if (menu) menu.classList.remove('show');
}

function renderFortressBrand() {
    const wrap = document.querySelector('.menu-wrap');
    if (!wrap || wrap.querySelector('.fortress-brand')) return;

    const brand = document.createElement('a');
    brand.className = 'fortress-brand';
    brand.href = 'index.html';
    brand.title = 'Prixburg under Fortress';
    brand.innerHTML = '<span class="fortress-f">F</span><span class="fortress-name">Prixburg</span>';
    wrap.insertBefore(brand, wrap.querySelector('.dropdown-content'));
}

function initNav() {
    renderAppMenu();
    renderFortressBrand();
    renderTopbarActions();
    decorateChoiceButtons();
    window.addEventListener('click', function (event) {
        if (!event.target.closest('.menu-wrap')) {
            closeAllMenus();
        }
    });
    window.addEventListener('prixburg-sync', paintSyncPill);
    window.addEventListener('online', paintSyncPill);
    window.addEventListener('offline', paintSyncPill);
}

checkAuthentication();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
} else {
    initNav();
}
