const PRIXBURG_DB_DEFAULTS = {
    rawMaterialsData: [],
    prixburgDetergentFormulas: [],
    prixburgReportFiles: { daily: [], weekly: [], monthly: [], yearly: [] },
    prixburgPricing: [],
    prixburgStockMovements: [],
    prixburgCreditPayments: [],
    prixburgLoginDetails: {
        mainUsername: 'CLEANZ',
        mainPassword: 'CLEANZ123',
        settingsUsername: 'PRIXBURG CHEMICALS',
        settingsPassword: 'Prixburg'
    },
    prixburgRecycleBin: [],
    prixburgAppSettings: {
        autoDailyFiles: true,
        projectStartedOn: ''
    }
};

const PRIXBURG_DB_KEYS = Object.keys(PRIXBURG_DB_DEFAULTS);

let prixburgCache = null;
let prixburgWriteQueue = Promise.resolve();
const prixburgWriteGen = {};

function dbClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function dbHeaders(extra) {
    const headers = {
        apikey: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Accept: 'application/json'
    };
    if (extra) Object.keys(extra).forEach(function (key) { headers[key] = extra[key]; });
    return headers;
}

function dbUrl(path) {
    return NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '') + path;
}

function dbIsNetworkError(err) {
    if (!err) return false;
    const name = err.name || '';
    const msg = String(err.message || err);
    return name === 'AbortError' || name === 'TimeoutError' || name === 'TypeError'
        || /fail|network|abort|timeout|fetch|Load failed/i.test(msg);
}

function dbFetch(url, options, ms) {
    const wait = ms || 8000;
    if (typeof AbortController === 'undefined') {
        return Promise.race([
            fetch(url, options || {}),
            new Promise(function (_, reject) {
                setTimeout(function () { reject(new Error('timeout')); }, wait);
            })
        ]);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, wait);
    const opts = {};
    if (options) Object.keys(options).forEach(function (key) { opts[key] = options[key]; });
    opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (res) {
        clearTimeout(timer);
        return res;
    }, function (err) {
        clearTimeout(timer);
        throw err;
    });
}

function dbStampKey(key) {
    return key + '__at';
}

function dbWriteLocal(key, value, at) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem(dbStampKey(key), String(at || Date.now()));
    } catch (err) {
        console.error('Local save failed for ' + key, err);
    }
}

function dbIsEmptyValue(key, value) {
    if (value == null) return true;
    if (key === 'prixburgReportFiles') {
        return ['daily', 'weekly', 'monthly', 'yearly'].every(function (type) {
            return !value[type] || !value[type].length;
        });
    }
    if (Array.isArray(value)) return value.length === 0;
    if (key === 'prixburgLoginDetails') {
        return !value || typeof value !== 'object' || !(value.mainUsername || value.settingsUsername);
    }
    return false;
}

function dbLocalAt(key) {
    return parseInt(localStorage.getItem(dbStampKey(key)) || '0', 10) || 0;
}

const PRIXBURG_SYNC_PENDING = 'prixburgSyncPending';
const PRIXBURG_SYNC_ACK = 'prixburgSyncAck';

function dbReadMap(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        return {};
    }
}

function dbPendingMap() {
    return dbReadMap(PRIXBURG_SYNC_PENDING);
}

function dbAckMap() {
    return dbReadMap(PRIXBURG_SYNC_ACK);
}

function dbIsPending(key) {
    return !!dbPendingMap()[key];
}

function dbAck(key) {
    return Number(dbAckMap()[key]) || 0;
}

let dbSyncEmitTimer = null;

function dbEmitSync() {
    clearTimeout(dbSyncEmitTimer);
    dbSyncEmitTimer = setTimeout(function () {
        try {
            window.dispatchEvent(new CustomEvent('prixburg-sync', {
                detail: { label: dbSyncLabel() }
            }));
        } catch (err) { /* ignore */ }
    }, 400);
}

function dbMarkPending(key) {
    const map = dbPendingMap();
    if (!map[key]) map[key] = Date.now();
    try { localStorage.setItem(PRIXBURG_SYNC_PENDING, JSON.stringify(map)); } catch (err) { /* ignore */ }
    dbEmitSync();
}

function dbClearPending(key, ackedAt) {
    const map = dbPendingMap();
    delete map[key];
    const ack = dbAckMap();
    ack[key] = ackedAt || Date.now();
    try {
        localStorage.setItem(PRIXBURG_SYNC_PENDING, JSON.stringify(map));
        localStorage.setItem(PRIXBURG_SYNC_ACK, JSON.stringify(ack));
    } catch (err) { /* ignore */ }
    dbEmitSync();
}

function dbSyncLabel() {
    return Object.keys(dbPendingMap()).length ? 'Waiting' : 'Synced';
}

function dbRecordSyncStatus(key, recordTime) {
    const at = Number(recordTime) || 0;
    if (dbIsPending(key) && at > dbAck(key)) return 'Waiting';
    return 'Synced';
}

function dbSaleVersion(row) {
    const updated = Number(row && row.updatedAt);
    if (updated > 0) return updated;
    const saved = Number(row && row.savedAt);
    if (saved > 0) return saved;
    if (row && row.createdAt) {
        const created = Date.parse(row.createdAt);
        if (created > 0) return created;
    }
    const id = row && row.id != null ? String(row.id) : '';
    const fromId = parseInt(id, 10);
    if (Number.isFinite(fromId) && fromId > 1000000000000) return fromId;
    return 0;
}

function dbMergeSales(remoteRows, localRows, removedIds) {
    const gone = {};
    (removedIds || []).forEach(function (id) {
        if (id != null && id !== '') gone[String(id)] = true;
    });
    const map = {};
    function take(row) {
        if (!row || typeof row !== 'object') return;
        const id = row.id != null && String(row.id) ? String(row.id) : '';
        if (!id || gone[id]) return;
        const next = Object.assign({}, row, { id: id });
        if (!Number(next.savedAt)) next.savedAt = dbSaleVersion(next) || Date.now();
        const prev = map[id];
        if (!prev || dbSaleVersion(next) >= dbSaleVersion(prev)) map[id] = next;
    }
    (Array.isArray(remoteRows) ? remoteRows : []).forEach(take);
    (Array.isArray(localRows) ? localRows : []).forEach(take);
    return Object.keys(map).map(function (id) { return map[id]; }).sort(function (a, b) {
        const byTime = (Number(a.savedAt) || 0) - (Number(b.savedAt) || 0);
        if (byTime) return byTime;
        return String(a.id).localeCompare(String(b.id));
    });
}

function dbMergeIdList(remoteIds, localIds) {
    const map = {};
    (Array.isArray(remoteIds) ? remoteIds : []).concat(Array.isArray(localIds) ? localIds : []).forEach(function (id) {
        if (id != null && id !== '') map[String(id)] = true;
    });
    return Object.keys(map);
}

function dbReportSignature(value) {
    return ['daily', 'weekly', 'monthly', 'yearly'].map(function (type) {
        return ((value && value[type]) || []).map(function (file) {
            const sales = (file.salesRows || []).map(function (row) {
                return [
                    row && row.id,
                    row && (row.updatedAt || row.savedAt),
                    row && row.item,
                    row && row.teamLeader,
                    row && row.customer,
                    row && row.unitPrice,
                    row && row.quantity,
                    row && row.saleType
                ].join(':');
            }).join('|');
            const productions = (file.productions || []).map(function (row) {
                return [
                    row && row.id,
                    row && (row.savedAt || row.createdAt),
                    row && (row.detergent || row.product),
                    row && row.quantity,
                    row && row.unit
                ].join(':');
            }).join('|');
            return [
                file && file.period,
                file && file.expensesSavedAt,
                JSON.stringify(file && file.expenses || null),
                (file && file.removedSaleIds || []).join(','),
                sales,
                productions
            ].join('~');
        }).join(';');
    }).join('#');
}

function dbExpensesHaveFigures(file) {
    const expenses = file && file.expenses;
    if (!expenses || typeof expenses !== 'object') return false;
    const wages = Array.isArray(expenses.wages) && expenses.wages.some(function (row) {
        return row && (String(row.worker || '').trim() || String(row.formula || '').trim() || Number(row.amount));
    });
    const other = Array.isArray(expenses.other) && expenses.other.some(function (row) {
        return row && (String(row.item || '').trim() || String(row.formula || '').trim() || Number(row.amount));
    });
    function line(item) {
        return item && (String(item.formula || '').trim() || Number(item.amount));
    }
    return !!(wages || other || line(expenses.rent) || line(expenses.fuel) || line(expenses.transport) || line(expenses.lunch));
}

function dbFileVersion(file) {
    if (!file) return 0;
    const saleVersion = (file.salesRows || []).reduce(function (max, row) {
        return Math.max(max, dbSaleVersion(row));
    }, 0);
    const productionVersion = (file.productions || []).reduce(function (max, row) {
        return Math.max(max, dbSaleVersion(row));
    }, 0);
    return Math.max(Number(file.expensesSavedAt) || 0, Number(file.touchedAt) || 0, saleVersion, productionVersion);
}

function dbMergeReportFiles(remote, local) {
    const types = ['daily', 'weekly', 'monthly', 'yearly'];
    const out = { daily: [], weekly: [], monthly: [], yearly: [] };
    types.forEach(function (type) {
        const byPeriod = {};
        function take(file, source) {
            if (!file || file.period == null || file.period === '') return;
            const period = String(file.period);
            if (!byPeriod[period]) byPeriod[period] = {};
            byPeriod[period][source] = file;
        }
        ((remote && remote[type]) || []).forEach(function (file) { take(file, 'remote'); });
        ((local && local[type]) || []).forEach(function (file) { take(file, 'local'); });
        out[type] = Object.keys(byPeriod).sort().map(function (period) {
            const pair = byPeriod[period];
            const remoteFile = pair.remote;
            const localFile = pair.local;
            if (!remoteFile) return dbClone(localFile);
            if (!localFile) return dbClone(remoteFile);
            const base = dbFileVersion(localFile) >= dbFileVersion(remoteFile) ? localFile : remoteFile;
            const merged = dbClone(base);
            merged.id = (remoteFile.id || localFile.id || merged.id);
            merged.removedSaleIds = dbMergeIdList(remoteFile.removedSaleIds, localFile.removedSaleIds);
            merged.salesRows = dbMergeSales(remoteFile.salesRows, localFile.salesRows, merged.removedSaleIds);
            merged.productions = dbMergeSales(remoteFile.productions, localFile.productions, []);
            const remoteExpenseAt = Number(remoteFile.expensesSavedAt) || 0;
            const localExpenseAt = Number(localFile.expensesSavedAt) || 0;
            let expenseSource = base;
            if (localExpenseAt !== remoteExpenseAt) {
                expenseSource = localExpenseAt > remoteExpenseAt ? localFile : remoteFile;
            } else if (dbExpensesHaveFigures(remoteFile) !== dbExpensesHaveFigures(localFile)) {
                expenseSource = dbExpensesHaveFigures(localFile) ? localFile : remoteFile;
            }
            if (expenseSource.expenses) merged.expenses = dbClone(expenseSource.expenses);
            merged.expensesUpdated = !!(expenseSource.expensesUpdated || localFile.expensesUpdated || remoteFile.expensesUpdated);
            merged.expensesSavedAt = Math.max(localExpenseAt, remoteExpenseAt);
            return merged;
        });
    });
    return out;
}

const PRIXBURG_LIST_KEYS = {
    rawMaterialsData: true,
    prixburgStockMovements: true,
    prixburgCreditPayments: true,
    prixburgDetergentFormulas: true,
    prixburgPricing: true,
    prixburgRecycleBin: true
};

function dbSeenStorage(key) {
    return 'prixburgSeenIds:' + key;
}

function dbRememberRows(key, rows) {
    if (!PRIXBURG_LIST_KEYS[key] || !Array.isArray(rows)) return;
    const seen = dbReadMap(dbSeenStorage(key));
    rows.forEach(function (row) {
        if (row && row.id != null && String(row.id) !== '') seen[String(row.id)] = 1;
    });
    try { localStorage.setItem(dbSeenStorage(key), JSON.stringify(seen)); } catch (err) { /* ignore */ }
}

function dbMergeRecordLists(key, remote, local, localIsNewer) {
    const remoteRows = Array.isArray(remote) ? remote : [];
    const localRows = Array.isArray(local) ? local : [];
    const seen = dbReadMap(dbSeenStorage(key));
    const primary = localIsNewer ? localRows : remoteRows;
    const secondary = localIsNewer ? remoteRows : localRows;
    const map = {};
    primary.forEach(function (row) {
        if (!row || row.id == null || String(row.id) === '') return;
        map[String(row.id)] = dbClone(row);
    });
    secondary.forEach(function (row) {
        if (!row || row.id == null || String(row.id) === '') return;
        const id = String(row.id);
        const current = map[id];
        if (!current) {
            if (localIsNewer && seen[id]) return;
            map[id] = dbClone(row);
            return;
        }
        const currentVersion = dbSaleVersion(current);
        const nextVersion = dbSaleVersion(row);
        if (nextVersion > currentVersion) map[id] = dbClone(row);
    });
    dbRememberRows(key, primary.concat(secondary));
    return Object.keys(map).map(function (id) { return map[id]; }).sort(function (a, b) {
        const byTime = dbSaleVersion(a) - dbSaleVersion(b);
        if (byTime) return byTime;
        return String(a.id).localeCompare(String(b.id));
    });
}

function dbMergeLists(remote, local, localIsNewer) {
    const remoteList = Array.isArray(remote) ? remote : [];
    const localList = Array.isArray(local) ? local : [];
    if (localIsNewer && localList.length) return dbClone(localList);
    if (remoteList.length) return dbClone(remoteList);
    return dbClone(localList);
}

function dbMergeKey(key, remote, local, remoteUpdatedAt) {
    const localAt = dbLocalAt(key);
    const remoteAt = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : 0;
    const localIsNewer = !dbIsEmptyValue(key, local) && localAt > 0 && localAt > remoteAt;
    if (key === 'prixburgReportFiles') return dbMergeReportFiles(remote, local);
    if (PRIXBURG_LIST_KEYS[key]) return dbMergeRecordLists(key, remote, local, localIsNewer);
    if (Array.isArray(remote) || Array.isArray(local)) {
        return dbMergeLists(remote, local, localIsNewer);
    }
    if (localIsNewer && local != null) return dbClone(local);
    if (remote == null) return dbClone(local);
    return dbClone(remote);
}

function dbStripHeavyReportContent(cache) {
    const files = cache && cache.prixburgReportFiles;
    if (!files) return false;
    let changed = false;
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(function (type) {
        (files[type] || []).forEach(function (file) {
            if (file && file.content) {
                file.content = '';
                changed = true;
            }
        });
    });
    return changed;
}

function dbLoadAllLocal() {
    const cache = dbClone(PRIXBURG_DB_DEFAULTS);
    PRIXBURG_DB_KEYS.forEach(function (key) {
        const localValue = dbReadLocal(key, null);
        if (localValue == null) return;
        cache[key] = localValue;
    });
    if (dbStripHeavyReportContent(cache)) {
        dbWriteLocal('prixburgReportFiles', cache.prixburgReportFiles);
    }
    return cache;
}

function dbPeek(key) {
    if (!prixburgCache) prixburgCache = dbLoadAllLocal();
    if (!Object.prototype.hasOwnProperty.call(prixburgCache, key)) return PRIXBURG_DB_DEFAULTS[key];
    return prixburgCache[key];
}

function dbGet(key) {
    if (!prixburgCache) prixburgCache = dbLoadAllLocal();
    if (!Object.prototype.hasOwnProperty.call(prixburgCache, key)) return dbClone(PRIXBURG_DB_DEFAULTS[key]);
    return dbClone(prixburgCache[key]);
}

function dbSet(key, value) {
    if (!prixburgCache) prixburgCache = dbClone(PRIXBURG_DB_DEFAULTS);
    const stored = dbClone(value);
    const gen = (prixburgWriteGen[key] = (prixburgWriteGen[key] || 0) + 1);
    dbRememberRows(key, prixburgCache[key]);
    prixburgCache[key] = stored;
    dbWriteLocal(key, stored);
    dbRememberRows(key, stored);
    dbMarkPending(key);
    prixburgWriteQueue = prixburgWriteQueue.then(function () {
        if (prixburgWriteGen[key] !== gen) return;
        return dbUpsert(key, stored).then(function () {
            if (prixburgWriteGen[key] !== gen) return;
            dbClearPending(key, Date.now());
        });
    }).catch(function (err) {
        console.error('Supabase save failed for ' + key, err);
        if (!dbIsNetworkError(err)) dbShowError(err.message || String(err));
        dbEmitSync();
    });
    return prixburgWriteQueue;
}

function dbUpsert(key, value) {
    return dbFetch(dbUrl('/rest/v1/prixburg_data?on_conflict=key'), {
        method: 'POST',
        headers: dbHeaders({
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        }),
        body: JSON.stringify({
            key: key,
            value: value,
            updated_at: new Date().toISOString()
        })
    }, 12000).then(function (res) {
        if (!res.ok) {
            return res.text().then(function (text) {
                throw new Error(text || ('Supabase HTTP ' + res.status));
            });
        }
    });
}

function dbReadLocal(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        return fallback;
    }
}

function dbClearLocal() {
    PRIXBURG_DB_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
    });
    localStorage.removeItem('allowedUsers');
}

function dbShowError(message) {
    if (typeof document === 'undefined') return;
    var box = document.getElementById('prixburgDbError');
    if (!box) {
        box = document.createElement('div');
        box.id = 'prixburgDbError';
        box.className = 'db-error';
        document.body.appendChild(box);
    }
    box.textContent = 'Supabase: ' + message;
}

function initPrixburgDb() {
    const gensAtStart = {};
    const memory = prixburgCache;
    PRIXBURG_DB_KEYS.forEach(function (key) {
        gensAtStart[key] = prixburgWriteGen[key] || 0;
    });
    prixburgCache = dbLoadAllLocal();
    if (memory) {
        PRIXBURG_DB_KEYS.forEach(function (key) {
            if ((prixburgWriteGen[key] || 0) > 0 && memory[key] != null) {
                prixburgCache[key] = dbClone(memory[key]);
            }
        });
    }
    return dbFetch(dbUrl('/rest/v1/prixburg_data?select=key,value,updated_at'), {
        headers: dbHeaders()
    }, 8000).then(function (res) {
        if (res.status === 404) {
            throw new Error('Create table public.prixburg_data in the Supabase SQL editor. Run supabase/schema.sql.');
        }
        if (!res.ok) {
            return res.text().then(function (text) {
                throw new Error(text || ('Supabase HTTP ' + res.status));
            });
        }
        return res.json();
    }).then(function (rows) {
        const remoteMap = {};
        (rows || []).forEach(function (row) {
            if (row && PRIXBURG_DB_KEYS.indexOf(row.key) !== -1) remoteMap[row.key] = row;
        });
        PRIXBURG_DB_KEYS.forEach(function (key) {
            if ((prixburgWriteGen[key] || 0) > gensAtStart[key]) return;
            const remoteRow = remoteMap[key];
            const localValue = prixburgCache[key];
            if (remoteRow) {
                const remoteAt = remoteRow.updated_at ? Date.parse(remoteRow.updated_at) : 0;
                const merged = dbMergeKey(key, remoteRow.value, localValue, remoteRow.updated_at);
                prixburgCache[key] = merged;
                const changed = key === 'prixburgReportFiles'
                    ? dbReportSignature(remoteRow.value) !== dbReportSignature(merged)
                    : JSON.stringify(remoteRow.value) !== JSON.stringify(merged);
                if (changed || (!dbIsEmptyValue(key, localValue) && dbLocalAt(key) > remoteAt)) {
                    dbSet(key, merged);
                } else {
                    dbWriteLocal(key, merged, remoteAt || Date.now());
                    if (!dbAck(key)) dbClearPending(key, remoteAt || Date.now());
                }
            } else if (!dbIsEmptyValue(key, localValue)) {
                dbSet(key, localValue);
            }
        });
    }).catch(function (err) {
        console.error('Supabase init failed', err);
        if (!dbIsNetworkError(err)) dbShowError(err.message || String(err));
        PRIXBURG_DB_KEYS.forEach(function (key) {
            if ((prixburgWriteGen[key] || 0) > gensAtStart[key]) return;
            const localValue = dbReadLocal(key, null);
            if (localValue != null) prixburgCache[key] = localValue;
        });
    });
}

let dbPulling = false;

function dbPullAndMerge() {
    if (dbPulling) return Promise.resolve();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();
    dbPulling = true;
    return initPrixburgDb().catch(function (err) {
        if (!dbIsNetworkError(err)) dbShowError(err.message || String(err));
    }).then(function () {
        dbPulling = false;
        dbEmitSync();
    });
}

function whenDbReady(fn) {
    function start() {
        if (!prixburgCache) prixburgCache = dbLoadAllLocal();
        try { fn(); } catch (err) { console.error(err); }
        (window.dbReady || Promise.resolve()).then(fn).catch(function () { fn(); });
    }
    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }
}

function waitForDbReady(ms) {
    const ready = window.dbReady || Promise.resolve();
    return Promise.race([
        Promise.resolve(ready).catch(function () {}),
        new Promise(function (resolve) { setTimeout(resolve, ms == null ? 2500 : ms); })
    ]);
}

function registerPrixburgServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').then(function (reg) {
            reg.update().catch(function () {});
            if (reg.waiting) {
                try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (err) { /* ignore */ }
            }
        }).catch(function () {});
    });
}

function getAppSettings() {
    const saved = dbGet('prixburgAppSettings') || {};
    return {
        autoDailyFiles: saved.autoDailyFiles !== false,
        projectStartedOn: saved.projectStartedOn || ''
    };
}

function saveAppSettings(next) {
    dbSet('prixburgAppSettings', Object.assign({}, getAppSettings(), next || {}));
}

function autoDailyFilesOn() {
    return getAppSettings().autoDailyFiles !== false;
}

window.dbPeek = dbPeek;
window.dbGet = dbGet;
window.dbSet = dbSet;
window.dbSyncLabel = dbSyncLabel;
window.dbRecordSyncStatus = dbRecordSyncStatus;
window.addEventListener('prixburg-sync', function () {
    if (typeof paintSyncPill === 'function') paintSyncPill();
    if (typeof paintSaleSyncCells === 'function') paintSaleSyncCells();
    if (typeof paintExpenseSync === 'function') paintExpenseSync();
    if (dbSyncLabel() !== 'Synced') return;
    const active = document.activeElement;
    const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
    if (typing) return;
    if (document.getElementById('produceName')) return;
    if (document.getElementById('expenseForm')) return;
    if (typeof getReportMode === 'function' && getReportMode() === 'sales-entry') return;
    if (typeof refreshLiveReportViews === 'function') refreshLiveReportViews();
    if (typeof renderStoreroom === 'function' && document.getElementById('storeroomBody')) renderStoreroom();
    if (typeof renderMovementsHistory === 'function' && document.getElementById('movementsList')) renderMovementsHistory();
});
window.addEventListener('online', function () { dbPullAndMerge(); });
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') dbPullAndMerge();
});
window.whenDbReady = whenDbReady;
window.waitForDbReady = waitForDbReady;
window.getAppSettings = getAppSettings;
window.saveAppSettings = saveAppSettings;
window.autoDailyFilesOn = autoDailyFilesOn;
window.dbLiveReady = false;
registerPrixburgServiceWorker();
window.dbReady = new Promise(function (resolve, reject) {
    function begin() {
        if (!prixburgCache) prixburgCache = dbLoadAllLocal();
        initPrixburgDb().then(function (value) {
            window.dbLiveReady = true;
            resolve(value);
        }).catch(function (err) {
            window.dbLiveReady = true;
            reject(err);
        });
    }
    function afterPaint() {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () { setTimeout(begin, 0); });
        } else {
            setTimeout(begin, 0);
        }
    }
    if (document.body) afterPaint();
    else document.addEventListener('DOMContentLoaded', afterPaint);
});
