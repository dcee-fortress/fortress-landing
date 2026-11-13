function adoptLegacySession() {
    ['isLoggedIn', 'loginTime', 'currentUser', 'userRole'].forEach(function (key) {
        if (!sessionStorage.getItem(key) && localStorage.getItem(key)) {
            sessionStorage.setItem(key, localStorage.getItem(key));
        }
        localStorage.removeItem(key);
    });
    localStorage.removeItem('allowedUsers');
}

adoptLegacySession();

function permittedUsersList() {
    if (typeof getLoginDetails === 'function') {
        const details = getLoginDetails();
        const base = (typeof PERMITTED_USERS !== 'undefined' && PERMITTED_USERS[0]) ? PERMITTED_USERS[0] : {
            role: 'Administrator',
            permissions: ['read', 'write', 'delete', 'manage_users']
        };
        return [{
            username: details.mainUsername,
            password: details.mainPassword,
            role: base.role,
            permissions: base.permissions
        }];
    }
    return (typeof PERMITTED_USERS !== 'undefined' && PERMITTED_USERS.length) ? PERMITTED_USERS : [];
}

class UserProtection {
    constructor() {
        this.sessionTimeout = 8 * 60 * 60 * 1000;
        this.checkInterval = 60 * 1000;
        this.init();
    }

    init() {
        if (this.isLoggedIn() && this.isSessionValid()) {
            if (this.isLoginPage()) {
                window.location.replace('index.html');
                return;
            }
        } else if (this.isLoggedIn()) {
            this.logout();
            this.redirectToLogin('Session expired. Please login again.');
            return;
        } else if (this.isProtectedPage()) {
            this.redirectToLogin('Please login to continue.');
            return;
        }

        this.startSessionMonitoring();
        this.preventBackNavigation();
    }

    isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    }

    isSessionValid() {
        const loginTime = sessionStorage.getItem('loginTime');
        if (!loginTime) return false;
        return (new Date().getTime() - parseInt(loginTime, 10)) < this.sessionTimeout;
    }

    authenticate(username, password) {
        const user = permittedUsersList().find(function (item) {
            return item.username === username && item.password === password;
        });

        if (user) {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('loginTime', new Date().getTime().toString());
            sessionStorage.setItem('currentUser', username);
            sessionStorage.setItem('userRole', user.role || 'User');
            return true;
        }

        return false;
    }

    logout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loginTime');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userRole');
    }

    startSessionMonitoring() {
        setInterval(() => {
            if (this.isLoggedIn() && !this.isSessionValid()) {
                this.logout();
                this.redirectToLogin('Your session has expired. Please login again.');
            }
        }, this.checkInterval);
    }

    preventBackNavigation() {
        window.addEventListener('popstate', () => {
            if (!this.isLoggedIn() && !this.isLoginPage()) {
                window.location.replace('login.html');
            }
        });
    }

    currentPageName() {
        return window.location.pathname.split('/').pop() || '';
    }

    isLoginPage() {
        return this.currentPageName() === 'login.html';
    }

    isHomePage() {
        const path = window.location.pathname;
        const page = this.currentPageName();
        return path === '/' || path === '' || page === 'index.html' || page === 'homepage.html';
    }

    isProtectedPage() {
        if (this.isLoginPage()) return false;
        if (this.isHomePage()) return true;

        const currentPage = this.currentPageName() || 'index.html';
        const protectedPages = [
            'raw-materials-storeroom.html',
            'daily-reports.html',
            'weekly-reports.html',
            'monthly-reports.html',
            'yearly-reports.html',
            'reports.html',
            'raw-materials.html',
            'sales-reports.html',
            'sales-entry-reports.html',
            'sales-analysis-reports.html',
            'sales-analysis.html',
            'sales-entry.html',
            'profit-expense-reports.html',
            'profit-expense.html',
            'expenses-entry.html',
            'outstanding-credit.html',
            'outstanding-credit-entry.html',
            'production-reports.html',
            'production.html',
            'ceo-analysis.html',
            'ceo-net-profit.html',
            'ceo-gross-profit.html',
            'manufacturing-factory.html',
            'sales-finance.html',
            'finished-products.html',
            'settings.html',
            'access-login.html',
            'detergent-formulas.html',
            'detergent-formula.html',
            'daily-report.html',
            'report-dashboard.html',
            'production-entry.html',
            'pricing.html',
            'login-details.html',
            'recycle-bin.html',
            'raw-material-movements.html'
        ];
        return protectedPages.includes(currentPage);
    }

    redirectToLogin(message) {
        if (message) sessionStorage.setItem('loginMessage', message);
        if (this.isLoginPage()) return;
        window.location.replace('login.html');
    }

    getCurrentUser() {
        if (!this.isLoggedIn()) return null;
        return {
            username: sessionStorage.getItem('currentUser'),
            role: sessionStorage.getItem('userRole'),
            loginTime: new Date(parseInt(sessionStorage.getItem('loginTime'), 10)).toLocaleString()
        };
    }

    getPermittedUsers() {
        return permittedUsersList();
    }

    hasPermission(permission) {
        const user = sessionStorage.getItem('currentUser');
        const currentUser = this.getPermittedUsers().find(function (item) {
            return item.username === user;
        });
        if (!currentUser) return false;
        if (!currentUser.permissions) return true;
        return currentUser.permissions.includes(permission);
    }
}

const userProtection = new UserProtection();
if (typeof window !== 'undefined') {
    window.UserProtection = userProtection;
}
