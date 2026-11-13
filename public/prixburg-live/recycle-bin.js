const RECYCLE_KEY = 'prixburgRecycleBin';
const RECYCLE_DAYS = 90;
const RECYCLE_DAY_MS = 24 * 60 * 60 * 1000;

const RECYCLE_KIND_LABELS = {
    'report-daily': 'Daily file',
    'report-weekly': 'Weekly file',
    'report-monthly': 'Monthly file',
    'report-yearly': 'Yearly file',
    formula: 'Detergent formula file',
    pricing: 'Pricing file',
    batch: 'Raw material movement batch'
};

const RECYCLE_RESTORE_PAGES = {
    'report-daily': 'daily-reports.html',
    'report-weekly': 'weekly-reports.html',
    'report-monthly': 'monthly-reports.html',
    'report-yearly': 'yearly-reports.html',
    formula: 'detergent-formulas.html',
    pricing: 'pricing.html',
    batch: 'raw-material-movements.html'
};

function recycleClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function loadRecycleBin() {
    const items = typeof dbGet === 'function' ? dbGet(RECYCLE_KEY) : [];
    const kept = pruneRecycleBin(Array.isArray(items) ? items : []);
    if (kept.length !== (items && items.length)) saveRecycleBin(kept);
    return kept;
}

function saveRecycleBin(items) {
    if (typeof dbSet === 'function') dbSet(RECYCLE_KEY, items);
}

function pruneRecycleBin(items) {
    const now = Date.now();
    return (items || []).filter(function (row) {
        const exp = Date.parse(row && row.expiresAt ? row.expiresAt : 0);
        return exp > now;
    });
}

function recycleLabelFor(kind, item) {
    if (!item) return 'File';
    if (kind.indexOf('report-') === 0) return item.label || item.period || 'Report file';
    if (kind === 'formula') return item.name || 'Detergent formula';
    if (kind === 'pricing') return item.name || 'Pricing file';
    if (kind === 'batch') {
        if (item.type === 'purchase') return (item.material || 'Purchase') + ' batch';
        return (item.product || 'Production') + ' batch';
    }
    return 'File';
}

function moveFilesToRecycleBin(kind, items) {
    const rows = (items || []).filter(Boolean);
    if (!rows.length) return;
    const bin = loadRecycleBin();
    const now = Date.now();
    const deletedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + (RECYCLE_DAYS * RECYCLE_DAY_MS)).toISOString();
    rows.forEach(function (item, index) {
        bin.push({
            id: String(now) + '-' + index + '-' + String(item.id || index),
            kind: kind,
            deletedAt: deletedAt,
            expiresAt: expiresAt,
            label: recycleLabelFor(kind, item),
            item: recycleClone(item)
        });
    });
    saveRecycleBin(bin);
}

function recycleDaysLeft(row) {
    const exp = Date.parse(row && row.expiresAt ? row.expiresAt : 0);
    if (!exp) return 0;
    return Math.max(0, Math.ceil((exp - Date.now()) / RECYCLE_DAY_MS));
}

function restoreReportFile(type, file) {
    const all = dbGet('prixburgReportFiles') || { daily: [], weekly: [], monthly: [], yearly: [] };
    const files = all[type] || [];
    if (files.some(function (row) { return row.id === file.id; })) return;
    const periodIndex = files.findIndex(function (row) { return row.period === file.period; });
    if (periodIndex >= 0) {
        files[periodIndex] = file;
    } else {
        files.push(file);
    }
    all[type] = files;
    dbSet('prixburgReportFiles', all);
}

function restoreFormulaFile(file) {
    const files = dbGet('prixburgDetergentFormulas') || [];
    if (!files.some(function (row) { return row.id === file.id; })) files.push(file);
    dbSet('prixburgDetergentFormulas', files);
}

function restorePricingFile(file) {
    const rows = dbGet('prixburgPricing') || [];
    if (!rows.some(function (row) { return row.id === file.id; })) rows.push(file);
    dbSet('prixburgPricing', rows);
}

function restoreBatchFile(file) {
    const rows = dbGet('prixburgStockMovements') || [];
    if (!rows.some(function (row) { return row.id === file.id; })) rows.push(file);
    dbSet('prixburgStockMovements', rows);
}

function restoreRecycleItem(id) {
    const bin = loadRecycleBin();
    const row = bin.find(function (item) { return item.id === id; });
    if (!row || !row.item) return;
    if (row.kind.indexOf('report-') === 0) {
        restoreReportFile(row.kind.slice(7), row.item);
    } else if (row.kind === 'formula') {
        restoreFormulaFile(row.item);
    } else if (row.kind === 'pricing') {
        restorePricingFile(row.item);
    } else if (row.kind === 'batch') {
        restoreBatchFile(row.item);
    }
    saveRecycleBin(bin.filter(function (item) { return item.id !== id; }));
}

function permanentlyDeleteRecycleItem(id) {
    saveRecycleBin(loadRecycleBin().filter(function (item) { return item.id !== id; }));
}

function recycleSearchText(row) {
    return [
        row.label,
        RECYCLE_KIND_LABELS[row.kind] || row.kind,
        row.deletedAt,
        recycleDaysLeft(row) + ' days'
    ].join(' ');
}

function escapeRecycleHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderRecycleBin() {
    const list = document.getElementById('recycleList');
    const empty = document.getElementById('recycleEmpty');
    if (!list) return;
    if (typeof bindSearchInput === 'function') bindSearchInput('recycleSearch', renderRecycleBin);
    const query = typeof currentSearchValue === 'function' ? currentSearchValue('recycleSearch') : '';
    const items = loadRecycleBin().slice().reverse();
    const visible = items.filter(function (row) {
        return typeof matchesSearch === 'function' ? matchesSearch(recycleSearchText(row), query) : true;
    });
    list.innerHTML = '';
    visible.forEach(function (row) {
        const kind = RECYCLE_KIND_LABELS[row.kind] || 'File';
        const days = recycleDaysLeft(row);
        const when = row.deletedAt ? new Date(row.deletedAt).toLocaleString() : '';
        const div = document.createElement('div');
        div.className = 'app-file-row recycle-file-row';
        div.innerHTML = `
            <span class="app-file-icon" aria-hidden="true">${recycleBinIcon()}</span>
            <span class="app-file-name-block">
                <span class="app-file-label">${escapeRecycleHtml(row.label)}</span>
                <span class="app-file-sub">${escapeRecycleHtml(kind)} · Deleted ${escapeRecycleHtml(when)} · ${days} day${days === 1 ? '' : 's'} left</span>
            </span>
            <span class="file-actions">
                <button type="button" class="choice-btn" data-restore="${escapeRecycleHtml(row.id)}">Restore</button>
                <button type="button" class="danger-btn" data-purge="${escapeRecycleHtml(row.id)}">Delete permanently</button>
            </span>
        `;
        list.appendChild(div);
    });
    if (empty) {
        if (!items.length) {
            empty.textContent = 'Recycle bin is empty. Deleted files stay here for 90 days.';
            empty.style.display = 'block';
        } else if (!visible.length) {
            empty.textContent = 'No files match that search.';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
        }
    }
}

function recycleBinIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
}

function confirmRecycleAction(message, onYes) {
    const overlay = document.getElementById('recycleConfirm');
    const text = document.getElementById('recycleConfirmText');
    if (!overlay || !text) {
        if (window.confirm(message) && onYes) onYes();
        return;
    }
    text.textContent = message;
    overlay.classList.add('show');
    confirmRecycleAction._yes = onYes;
}

function bindRecycleBinPage() {
    const list = document.getElementById('recycleList');
    if (!list || bindRecycleBinPage.bound) return;
    bindRecycleBinPage.bound = true;
    list.addEventListener('click', function (event) {
        const restore = event.target.closest('[data-restore]');
        const purge = event.target.closest('[data-purge]');
        if (restore) {
            const id = restore.getAttribute('data-restore');
            confirmRecycleAction('Restore this file to where it was before?', function () {
                restoreRecycleItem(id);
                renderRecycleBin();
            });
            return;
        }
        if (purge) {
            const id = purge.getAttribute('data-purge');
            confirmRecycleAction('Permanently delete this file? It cannot be restored after this.', function () {
                permanentlyDeleteRecycleItem(id);
                renderRecycleBin();
            });
        }
    });
    const overlay = document.getElementById('recycleConfirm');
    const yes = document.getElementById('recycleConfirmYes');
    const no = document.getElementById('recycleConfirmNo');
    if (yes) {
        yes.addEventListener('click', function () {
            const fn = confirmRecycleAction._yes;
            confirmRecycleAction._yes = null;
            if (overlay) overlay.classList.remove('show');
            if (fn) fn();
        });
    }
    if (no) {
        no.addEventListener('click', function () {
            confirmRecycleAction._yes = null;
            if (overlay) overlay.classList.remove('show');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                confirmRecycleAction._yes = null;
                overlay.classList.remove('show');
            }
        });
    }
}

window.moveFilesToRecycleBin = moveFilesToRecycleBin;

if (document.getElementById('recycleList')) {
    bindRecycleBinPage();
    if (typeof whenDbReady === 'function') whenDbReady(renderRecycleBin);
    else renderRecycleBin();
}
