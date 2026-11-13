const REPORTS_KEY = 'prixburgReportFiles';

const REPORT_CONFIG = {
    daily: {
        title: 'Daily reports',
        createLabel: 'Create daily file',
        periodLabel: 'Report date',
        inputType: 'date'
    },
    weekly: {
        title: 'Weekly reports',
        createLabel: 'Create weekly file',
        periodLabel: 'Report week',
        inputType: 'week'
    },
    monthly: {
        title: 'Monthly reports',
        createLabel: 'Create monthly file',
        periodLabel: 'Report month',
        inputType: 'month'
    },
    yearly: {
        title: 'Yearly report',
        createLabel: 'Create yearly file',
        periodLabel: 'Report year',
        inputType: 'number'
    }
};

function getReportType() {
    return document.body.getAttribute('data-report-type') || 'daily';
}

function getReportMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || document.body.getAttribute('data-report-mode') || '';
}

function reportDashboardHref(type, id, mode) {
    let href = 'report-dashboard.html?type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(id);
    if (mode) href += '&mode=' + encodeURIComponent(mode);
    return href;
}

function reportListHref(type, mode) {
    if (mode === 'sales-entry') return 'sales-analysis.html?type=' + encodeURIComponent(type);
    if (mode === 'sales-analysis') return 'sales-analysis-reports.html';
    if (mode === 'profit-expense') return 'profit-expense-reports.html';
    if (mode === 'production') return 'production-reports.html';
    return type + '-reports.html';
}

function reportListLabel(type, mode) {
    if (mode === 'sales-entry') return periodSalesPrefix(type) + ' sales analysis';
    if (mode === 'sales-analysis') return 'Sales analysis report';
    if (mode === 'profit-expense') return 'Profit and expense reports';
    if (mode === 'production') return 'Production report';
    const names = {
        daily: 'Daily files',
        weekly: 'Weekly files',
        monthly: 'Monthly files',
        yearly: 'Yearly files'
    };
    return names[type] || 'Files';
}

function peekAllReportFiles() {
    if (typeof dbPeek === 'function') {
        const all = dbPeek(REPORTS_KEY);
        if (all && typeof all === 'object') return all;
    }
    return loadAllReportFiles();
}

function loadAllReportFiles() {
    return dbGet(REPORTS_KEY);
}

function saveAllReportFiles(all) {
    dbSet(REPORTS_KEY, all);
}

function loadMaterials() {
    return dbGet('rawMaterialsData');
}

function getISOWeekValue(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

function localDateValue(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function defaultPeriodValue(type) {
    const now = new Date();
    if (type === 'daily') return localDateValue(now);
    if (type === 'weekly') return getISOWeekValue(now);
    if (type === 'monthly') return localDateValue(now).slice(0, 7);
    return String(now.getFullYear());
}

function startOfWeekMonday(dateValue) {
    const d = new Date(dateValue + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateValue;
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return localDateValue(d);
}

function isoWeekMondayValue(period) {
    const parts = String(period).split('-W');
    if (parts.length !== 2) return '';
    const year = Number(parts[0]);
    const week = Number(parts[1]);
    if (!year || !week) return '';
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
    return localDateValue(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
}

function getProjectStartDate() {
    const settings = typeof getAppSettings === 'function' ? getAppSettings() : { projectStartedOn: '' };
    const daily = (peekAllReportFiles().daily || []).map(function (file) {
        return file.period;
    }).filter(Boolean).sort();
    const earliest = daily[0] || '';
    if (settings.projectStartedOn) {
        if (earliest && earliest < settings.projectStartedOn) {
            if (typeof saveAppSettings === 'function') saveAppSettings({ projectStartedOn: earliest });
            return earliest;
        }
        return settings.projectStartedOn;
    }
    if (earliest && typeof saveAppSettings === 'function') {
        saveAppSettings({ projectStartedOn: earliest });
        return earliest;
    }
    return earliest || localDateValue(new Date());
}

function projectWeekNumber(period) {
    const monday = isoWeekMondayValue(period);
    const startMonday = startOfWeekMonday(getProjectStartDate());
    if (!monday) return 1;
    const ms = new Date(monday + 'T00:00:00').getTime() - new Date(startMonday + 'T00:00:00').getTime();
    const n = Math.round(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
    return n < 1 ? 1 : n;
}

function shiftDateValue(dateValue, days) {
    const d = new Date(dateValue + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return localDateValue(d);
}

function emptyWageRow() {
    return {
        id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7),
        worker: '',
        formula: '',
        amount: 0
    };
}

function emptyOtherExpenseRow() {
    return {
        id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7),
        item: '',
        formula: '',
        amount: 0
    };
}

function emptyExpenseLine() {
    return { formula: '', amount: 0 };
}

function emptyExpenses() {
    return {
        wages: [emptyWageRow()],
        rent: emptyExpenseLine(),
        fuel: emptyExpenseLine(),
        transport: emptyExpenseLine(),
        lunch: emptyExpenseLine(),
        other: []
    };
}

function normalizeExpenseLine(line) {
    const raw = line && typeof line === 'object' ? line : {};
    const amount = Number(raw.amount);
    return {
        formula: raw.formula != null ? String(raw.formula) : '',
        amount: Number.isFinite(amount) ? amount : 0
    };
}

function normalizeExpenses(raw) {
    const base = emptyExpenses();
    if (!raw || typeof raw !== 'object') return base;
    const wages = Array.isArray(raw.wages) && raw.wages.length
        ? raw.wages.map(function (row) {
            const line = normalizeExpenseLine(row);
            return {
                id: row && row.id ? String(row.id) : emptyWageRow().id,
                worker: row && row.worker != null ? String(row.worker) : '',
                formula: line.formula,
                amount: line.amount
            };
        })
        : base.wages;
    const other = Array.isArray(raw.other)
        ? raw.other.map(function (row) {
            const line = normalizeExpenseLine(row);
            return {
                id: row && row.id ? String(row.id) : emptyOtherExpenseRow().id,
                item: row && row.item != null ? String(row.item) : '',
                formula: line.formula,
                amount: line.amount
            };
        }).filter(function (row) {
            return String(row.item || '').trim() || String(row.formula || '').trim() || Number(row.amount);
        })
        : [];
    return {
        wages: wages,
        rent: normalizeExpenseLine(raw.rent),
        fuel: normalizeExpenseLine(raw.fuel),
        transport: normalizeExpenseLine(raw.transport),
        lunch: normalizeExpenseLine(raw.lunch),
        other: other
    };
}

function expenseLineEntered(line) {
    const item = normalizeExpenseLine(line);
    return String(item.formula || '').trim() !== '' || Number(item.amount) !== 0;
}

function wageRowEntered(row) {
    return String(row && row.worker || '').trim() !== ''
        || String(row && row.formula || '').trim() !== ''
        || Number(row && row.amount) !== 0;
}

function otherRowEntered(row) {
    return String(row && row.item || '').trim() !== ''
        || String(row && row.formula || '').trim() !== ''
        || Number(row && row.amount) !== 0;
}

function expensesWereSaved(file) {
    if (!file || !file.expenses) return false;
    if (file.expensesUpdated) return true;
    const saved = normalizeExpenses(file.expenses);
    if (saved.wages.some(wageRowEntered)) return true;
    if (expenseLineEntered(saved.rent) || expenseLineEntered(saved.fuel)
        || expenseLineEntered(saved.transport) || expenseLineEntered(saved.lunch)) return true;
    return (saved.other || []).some(otherRowEntered);
}

function carriedExpenseSnapshot(source) {
    const saved = normalizeExpenses(source);
    const wages = saved.wages.filter(wageRowEntered).map(function (row) {
        return {
            id: emptyWageRow().id,
            worker: row.worker,
            formula: row.formula,
            amount: row.amount
        };
    });
    const other = saved.other.filter(otherRowEntered).map(function (row) {
        return {
            id: emptyOtherExpenseRow().id,
            item: row.item,
            formula: row.formula,
            amount: row.amount
        };
    });
    return {
        wages: wages.length ? wages : [emptyWageRow()],
        rent: normalizeExpenseLine(saved.rent),
        fuel: normalizeExpenseLine(saved.fuel),
        transport: normalizeExpenseLine(saved.transport),
        lunch: normalizeExpenseLine(saved.lunch),
        other: other
    };
}

function latestSavedExpensesBefore(period) {
    let best = null;
    let bestPeriod = '';
    (peekAllReportFiles().daily || []).forEach(function (file) {
        const day = String(file.period || '');
        if (!day || day >= String(period || '')) return;
        if (!expensesWereSaved(file)) return;
        if (!best || day > bestPeriod) {
            best = file.expenses;
            bestPeriod = day;
        }
    });
    return best;
}

function effectiveDailyExpenses(file) {
    if (!file) return emptyExpenses();
    if (expensesWereSaved(file)) return normalizeExpenses(file.expenses);
    const prior = latestSavedExpensesBefore(file.period);
    if (!prior) return normalizeExpenses(file.expenses);
    return carriedExpenseSnapshot(prior);
}

function evaluateExpenseInput(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) return { formula: '', amount: 0, error: false };
    try {
        let expr = raw;
        if (expr.charAt(0) !== '=' && /[+\-*/()]/.test(expr)) expr = '=' + expr;
        const amount = typeof evaluateQtyMath === 'function'
            ? evaluateQtyMath(expr.charAt(0) === '=' ? expr : '=' + expr)
            : Number(raw);
        if (!Number.isFinite(amount)) throw new Error('#ERROR!');
        return { formula: raw, amount: amount, error: false };
    } catch (err) {
        return { formula: raw, amount: 0, error: true };
    }
}

function expenseInputDisplay(line, focused) {
    const item = line && typeof line === 'object' ? line : {};
    if (focused) return item.formula || '';
    if (item.error) return item.formula || '';
    const formula = String(item.formula || '').trim();
    if (!formula) return '';
    if (formula.charAt(0) === '=' || /[+\-*/()]/.test(formula)) {
        return Number(item.amount || 0).toFixed(2);
    }
    return formula;
}

function otherExpenseRowsTotal(rows) {
    return (rows || []).reduce(function (sum, row) {
        return sum + (Number(row.amount) || 0);
    }, 0);
}

function expenseFileTotal(expenses) {
    const e = normalizeExpenses(expenses);
    const wages = e.wages.reduce(function (sum, row) {
        return sum + (Number(row.amount) || 0);
    }, 0);
    return wages
        + e.rent.amount
        + e.fuel.amount
        + e.transport.amount
        + e.lunch.amount
        + otherExpenseRowsTotal(e.other);
}

function productionMaterialCostForPeriod(type, period) {
    return productionsForDashboard(type, period).reduce(function (sum, row) {
        return sum + (Number(row.cost) || 0);
    }, 0);
}

function productionMaterialCostForFile(file) {
    return productionMaterialCostForPeriod('daily', file && file.period);
}

function dailyExpenseTotal(file, expenses) {
    return expenseFileTotal(expenses || effectiveDailyExpenses(file)) + productionMaterialCostForFile(file);
}

function expensesHaveEntry(file) {
    const e = effectiveDailyExpenses(file);
    if (expenseFileTotal(e) > 0) return true;
    if (productionMaterialCostForFile(file) > 0) return true;
    return e.wages.some(function (row) {
        return String(row.worker || '').trim() || String(row.formula || '').trim();
    }) || String(e.rent.formula || '').trim()
        || String(e.fuel.formula || '').trim()
        || String(e.transport.formula || '').trim()
        || String(e.lunch.formula || '').trim()
        || e.other.some(function (row) {
            return String(row.item || '').trim() || String(row.formula || '').trim();
        });
}

function collectExpenseLines(type, period) {
    const totals = {
        wages: 0,
        rent: 0,
        fuel: 0,
        transport: 0,
        lunch: 0,
        other: 0
    };
    const wageMap = {};
    const otherMap = {};
    (peekAllReportFiles().daily || []).forEach(function (file) {
        if (!dailyMatchesRollup(file.period, type, period)) return;
        const e = effectiveDailyExpenses(file);
        e.wages.forEach(function (row) {
            const amount = Number(row.amount) || 0;
            const named = String(row.worker || '').trim();
            const hasFormula = String(row.formula || '').trim();
            if (!amount && !named && !hasFormula) return;
            totals.wages += amount;
            const key = (named || 'Worker').toLowerCase();
            if (!wageMap[key]) wageMap[key] = { worker: named || 'Worker', amount: 0 };
            wageMap[key].amount += amount;
        });
        e.other.forEach(function (row) {
            const amount = Number(row.amount) || 0;
            const named = String(row.item || '').trim();
            const hasFormula = String(row.formula || '').trim();
            if (!amount && !named && !hasFormula) return;
            totals.other += amount;
            const key = (named || 'Other').toLowerCase();
            if (!otherMap[key]) otherMap[key] = { item: named || 'Other', amount: 0 };
            otherMap[key].amount += amount;
        });
        totals.rent += Number(e.rent.amount) || 0;
        totals.fuel += Number(e.fuel.amount) || 0;
        totals.transport += Number(e.transport.amount) || 0;
        totals.lunch += Number(e.lunch.amount) || 0;
    });
    totals.wageRows = Object.keys(wageMap).map(function (key) { return wageMap[key]; });
    totals.otherRows = Object.keys(otherMap).map(function (key) { return otherMap[key]; });
    totals.materials = productionMaterialCostForPeriod(type, period);
    totals.entered = totals.wages + totals.rent + totals.fuel + totals.transport + totals.lunch + totals.other;
    // Same figure shown on Expenses entry: materials + every entered expense line.
    totals.total = totals.entered + totals.materials;
    return totals;
}

function collectExpensesTotal(type, period) {
    return collectExpenseLines(type, period).total;
}

function expenseBreakdown(type, period) {
    const lines = collectExpenseLines(type, period);
    const sales = salesEntryTotal(type, period);
    const rows = [
        { item: periodSalesPrefix(type) + ' total sales', amount: sales },
        { item: 'Cost of raw materials', amount: lines.materials },
        { item: 'Wages', amount: lines.wages },
        { item: 'Rent', amount: lines.rent },
        { item: 'Fuel delivery', amount: lines.fuel },
        { item: 'Transport allowance', amount: lines.transport },
        { item: 'Lunch cash', amount: lines.lunch }
    ];
    (lines.otherRows || []).forEach(function (row) {
        rows.push({ item: row.item, amount: row.amount });
    });
    rows.push(
        { item: 'Total expenses', amount: lines.total },
        { item: 'Net profit', amount: sales - lines.total }
    );
    return {
        sales: sales,
        expenses: lines.total,
        profit: sales - lines.total,
        lines: lines,
        rows: rows
    };
}

function profitExpenseTotals(type, period) {
    const breakdown = expenseBreakdown(type, period);
    return {
        sales: breakdown.sales,
        expenses: breakdown.expenses,
        profit: breakdown.profit
    };
}

function saveDailyExpenses(fileId, expenses) {
    const all = loadAllReportFiles();
    let saved = false;
    all.daily = (all.daily || []).map(function (item) {
        if (item.id !== fileId) return item;
        item.expenses = normalizeExpenses(expenses);
        item.expensesUpdated = true;
        item.expensesSavedAt = Date.now();
        saved = true;
        return item;
    });
    if (!saved) return;
    saveAllReportFiles(all);
    refreshFilesSnap('daily');
    notifyReportDataChanged('expenses');
}

function makeReportFileRecord(type, period, suffix) {
    return {
        id: Date.now().toString() + '-' + type + '-' + String(period) + (suffix ? '-' + suffix : ''),
        period: period,
        filename: filenameFor(type, period),
        label: fileDisplayLabel(type, period),
        createdAt: new Date().toISOString(),
        content: '',
        productions: [],
        salesRows: [],
        expenses: emptyExpenses()
    };
}

function ensureReportFile(type, period) {
    const peeked = peekAllReportFiles();
    const files = peeked[type] || [];
    const existing = files.find((file) => file.period === period);
    if (existing) return existing;

    const all = loadAllReportFiles();
    const record = makeReportFileRecord(type, period);
    all[type] = (all[type] || []).concat(record);
    saveAllReportFiles(all);
    return record;
}

function autoDailyFilesEnabled() {
    try {
        if (typeof autoDailyFilesOn === 'function') return autoDailyFilesOn();
        const saved = typeof dbGet === 'function' ? dbGet('prixburgAppSettings') : null;
        if (saved && saved.autoDailyFiles === false) return false;
    } catch (err) { /* old cache without settings */ }
    return true;
}

function ensureDailyFilesEveryDay() {
    if (!autoDailyFilesEnabled()) return;
    const today = defaultPeriodValue('daily');
    const peeked = peekAllReportFiles();
    const daily = peeked.daily || [];
    const have = {};
    daily.forEach(function (file) {
        have[file.period] = true;
    });

    let start = today;
    if (daily.length) {
        const sorted = daily.map(function (file) { return file.period; }).sort();
        start = sorted[0] || today;
        const floor = shiftDateValue(today, -92);
        if (start < floor) start = floor;
        if (start > today) start = today;
    }

    const added = [];
    let period = start;
    let n = 0;
    while (period <= today && n < 93) {
        if (!have[period]) {
            added.push(makeReportFileRecord('daily', period, String(n)));
        }
        if (period === today) break;
        period = shiftDateValue(period, 1);
        n += 1;
    }

    if (added.length) {
        const all = loadAllReportFiles();
        all.daily = (all.daily || []).concat(added);
        saveAllReportFiles(all);
    }
}

function ensureCurrentPeriodFiles() {
    if (autoDailyFilesEnabled()) {
        ensureDailyFilesEveryDay();
    }
    ensureReportFile('weekly', defaultPeriodValue('weekly'));
    ensureReportFile('monthly', defaultPeriodValue('monthly'));
    ensureReportFile('yearly', defaultPeriodValue('yearly'));
}

function materialMatchesPeriod(row, type, period) {
    if (!row.date) return false;
    const date = new Date(row.date + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return false;
    if (type === 'daily') return row.date === period;
    if (type === 'weekly') return getISOWeekValue(date) === period;
    if (type === 'monthly') return row.date.slice(0, 7) === period;
    if (type === 'yearly') return row.date.slice(0, 4) === String(period);
    return false;
}

function formatMaterialLines(rows) {
    if (!rows.length) return 'No matching raw materials.';
    const header = 'Date | Material | Unit | Quantity | Unit Price | Total Cost';
    const lines = rows.map((row) => {
        const qty = Number(row.quantity || 0);
        const cost = Number(row.unitCost || 0);
        const total = qty * cost;
            return `${row.date} | ${row.name} | ${row.unit} | ${qty.toFixed(2)} | $${cost.toFixed(2)} | $${total.toFixed(2)}`;
    });
    const value = rows.reduce((sum, row) => sum + (Number(row.quantity || 0) * Number(row.unitCost || 0)), 0);
    return [header, ...lines, '', 'Line items: ' + rows.length, 'Value: $' + value.toFixed(2)].join('\n');
}

function buildReportContent(type, period) {
    const materials = loadMaterials();
    const periodRows = materials.filter((row) => materialMatchesPeriod(row, type, period));
    const created = new Date().toLocaleString();
    const user = sessionStorage.getItem('currentUser') || 'Unknown';
    const label = type.charAt(0).toUpperCase() + type.slice(1);

    return [
        'PRIXBURG ' + label.toUpperCase() + ' REPORT',
        'Period: ' + period,
        'Created: ' + created,
        'Created by: ' + user,
        '',
        'OVERVIEW',
        'Total Revenue: $0.00',
        'Profit: $0.00',
        'Production Cost: $0.00',
        '',
        'RAW MATERIALS FOR THIS PERIOD',
        formatMaterialLines(periodRows),
        '',
        'CURRENT STOREROOM INVENTORY',
        formatMaterialLines(materials)
    ].join('\n');
}

function filenameFor(type, period) {
    const safe = String(period).replace(/[^\w.-]+/g, '-');
    return type + '-report-' + safe + '.txt';
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function fileDisplayLabel(type, period) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (type === 'daily') {
        const date = new Date(period + 'T00:00:00');
        if (Number.isNaN(date.getTime())) return period;
        return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    }
    if (type === 'weekly') {
        return 'Week ' + projectWeekNumber(period);
    }
    if (type === 'monthly') {
        const parts = String(period).split('-');
        const monthIndex = Number(parts[1]) - 1;
        return months[monthIndex] ? months[monthIndex] + ' ' + parts[0] : period;
    }
    return String(period);
}

function displayFileLabel(type, file) {
    return fileDisplayLabel(type, file && file.period);
}

function productionsForFileRow(type, file, all) {
    if (type === 'daily') return file.productions || [];
    const rows = [];
    ((all && all.daily) || []).forEach(function (daily) {
        if (!dailyMatchesRollup(daily.period, type, file.period)) return;
        (daily.productions || []).forEach(function (row) {
            rows.push(row);
        });
    });
    return rows;
}

function round2(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
}

function saleLineTotal(row) {
    const price = Number(row && row.unitPrice);
    const qty = Number(row && row.quantity);
    return round2((Number.isFinite(price) ? price : 0) * (Number.isFinite(qty) ? qty : 0));
}

function normalizeSaleType(value) {
    return value === 'credit' ? 'credit' : 'cash';
}

function salesRowsForFileRow(type, file, all) {
    if (type === 'daily') return (file && file.salesRows) || [];
    const rows = [];
    ((all && all.daily) || []).forEach(function (daily) {
        if (!dailyMatchesRollup(daily.period, type, file.period)) return;
        (daily.salesRows || []).forEach(function (row) { rows.push(row); });
    });
    return rows;
}

function collectSalesRows(type, period) {
    const rows = [];
    (peekAllReportFiles().daily || []).forEach(function (file) {
        if (!dailyMatchesRollup(file.period, type, period)) return;
        (file.salesRows || []).forEach(function (row) { rows.push(row); });
    });
    return rows;
}

function salesEntryLabel(type) {
    return periodSalesPrefix(type) + ' sales entry';
}

function expensesEntryLabel(type) {
    return periodSalesPrefix(type) + ' expenses entry';
}

function periodDateBounds(type, period) {
    if (type === 'daily') return { min: period, max: period };
    if (type === 'weekly') {
        const monday = isoWeekMondayValue(period);
        return { min: monday, max: shiftDateValue(monday, 6) };
    }
    if (type === 'monthly') {
        const start = String(period) + '-01';
        const end = new Date(start + 'T00:00:00');
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        return { min: start, max: localDateValue(end) };
    }
    return { min: String(period) + '-01-01', max: String(period) + '-12-31' };
}

function defaultEntryDate(type, period) {
    const bounds = periodDateBounds(type, period);
    const today = localDateValue(new Date());
    if (bounds.min && today >= bounds.min && today <= bounds.max) return today;
    return bounds.min || today;
}

function clampDateToPeriod(dateValue, type, period) {
    const bounds = periodDateBounds(type, period);
    const date = String(dateValue || '');
    if (!date) return defaultEntryDate(type, period);
    if (bounds.min && date < bounds.min) return bounds.min;
    if (bounds.max && date > bounds.max) return bounds.max;
    return date;
}

function flattenPeriodSalesRows(type, period) {
    const rows = [];
    (peekAllReportFiles().daily || []).forEach(function (file) {
        if (!dailyMatchesRollup(file.period, type, period)) return;
        currentSalesRows(file).forEach(function (row) {
            rows.push(Object.assign({}, row, { fileId: file.id, date: file.period }));
        });
    });
    rows.sort(function (a, b) {
        const byDate = String(a.date || '').localeCompare(String(b.date || ''));
        if (byDate) return byDate;
        const byTime = (Number(a.savedAt) || 0) - (Number(b.savedAt) || 0);
        if (byTime) return byTime;
        return String(a.id).localeCompare(String(b.id));
    });
    return rows;
}

function saleRowSearchText(row) {
    return [
        row.date,
        row.item,
        row.teamLeader,
        row.customer,
        normalizeSaleType(row.saleType),
        row.unitPrice,
        row.quantity,
        saleLineTotal(row)
    ].join(' ');
}

function stripStoredSaleRow(row) {
    const now = Date.now();
    const stored = {
        id: row.id || (now.toString() + '-' + Math.random().toString(36).slice(2, 7)),
        item: row.item || '',
        teamLeader: row.teamLeader || '',
        customer: row.customer || '',
        unitPrice: row.unitPrice === '' || row.unitPrice == null ? row.unitPrice : round2(row.unitPrice),
        quantity: row.quantity === '' || row.quantity == null ? row.quantity : round2(row.quantity),
        saleType: normalizeSaleType(row.saleType),
        savedAt: Number(row.savedAt) || now,
        updatedAt: now
    };
    if (row.source) stored.source = String(row.source);
    if (row.creditPaymentId) stored.creditPaymentId = String(row.creditPaymentId);
    return stored;
}

function saleSyncLabel(row) {
    const at = Number(row && (row.updatedAt || row.savedAt)) || 0;
    if (typeof dbRecordSyncStatus === 'function') return dbRecordSyncStatus('prixburgReportFiles', at);
    return 'Synced';
}

function rememberRemovedSale(file, id) {
    if (!file || !id) return;
    const list = Array.isArray(file.removedSaleIds) ? file.removedSaleIds.slice() : [];
    if (list.indexOf(id) === -1) list.push(id);
    file.removedSaleIds = list;
}

function canRefreshLiveViewsHere() {
    if (document.getElementById('produceName')) return false;
    if (document.getElementById('expenseForm')) return false;
    if (document.querySelector('[data-credit-pay]:focus')) return false;
    if (getReportMode() === 'sales-entry') return false;
    return !!(document.getElementById('dashboardBody')
        || document.getElementById('finishedBody')
        || document.getElementById('creditBody')
        || document.getElementById('creditEntryBody')
        || document.getElementById('ceoNetBody')
        || document.getElementById('ceoGrossBody')
        || document.getElementById('reportFiles'));
}

function notifyReportDataChanged(kind) {
    const stamp = String(Date.now());
    const payload = { at: stamp, kind: kind || 'all' };
    try {
        localStorage.setItem('prixburgReportSync', JSON.stringify(payload));
    } catch (err) { /* ignore quota */ }
    try {
        if (!window._prixburgReportChannel && typeof BroadcastChannel === 'function') {
            window._prixburgReportChannel = new BroadcastChannel('prixburg-reports');
        }
        if (window._prixburgReportChannel) {
            window._prixburgReportChannel.postMessage(payload);
        }
    } catch (err) { /* ignore */ }
    if (canRefreshLiveViewsHere()) refreshLiveReportViews();
}

function notifySalesChanged() {
    notifyReportDataChanged('sales');
}

function notifyProductionChanged() {
    notifyReportDataChanged('production');
}

function refreshLiveReportViews() {
    clearReportCalcMemo();
    if (document.getElementById('dashboardBody')) renderDashboard();
    if (document.getElementById('reportFiles')) renderReportFiles();
    if (document.getElementById('finishedBody')) initFinishedProducts();
    if (document.getElementById('creditBody')) initOutstandingCredit();
    if (document.getElementById('creditEntryBody')) initOutstandingCreditEntry();
    if (document.getElementById('ceoNetBody') || document.getElementById('ceoGrossBody')) initCeoAnalysis();
    if (document.getElementById('expenseForm') && !expenseDraft) initExpensesEntry();
    else if (document.getElementById('expenseForm')) updateExpenseTotalCard();
}

function paintSaleSyncCells() {
    document.querySelectorAll('#dashboardBody tr[data-row-id]').forEach(function (tr) {
        const cell = tr.querySelector('[data-sale-sync]');
        if (!cell) return;
        const rowId = tr.getAttribute('data-row-id');
        const current = typeof dashboardFile === 'function' ? dashboardFile() : null;
        const row = current && current.file
            ? flattenPeriodSalesRows(current.type, current.file.period).filter(function (item) { return item.id === rowId; })[0]
            : null;
        const label = saleSyncLabel(row || { updatedAt: Date.now() });
        cell.textContent = label;
        cell.className = 'sync-cell ' + (label === 'Waiting' ? 'is-waiting' : 'is-synced');
    });
}

function paintExpenseSync() {
    const title = document.getElementById('expenseTitle');
    if (!title) return;
    let el = document.getElementById('expenseSyncStatus');
    if (!el) {
        el = document.createElement('p');
        el.id = 'expenseSyncStatus';
        title.insertAdjacentElement('afterend', el);
    }
    const file = typeof currentExpenseFile === 'function' ? currentExpenseFile() : null;
    const label = typeof dbRecordSyncStatus === 'function'
        ? dbRecordSyncStatus('prixburgReportFiles', file && file.expensesSavedAt)
        : 'Synced';
    el.textContent = label;
    el.className = 'sync-status ' + (label === 'Waiting' ? 'is-waiting' : 'is-synced');
}

function bindLiveReportRefresh() {
    if (window._prixburgReportSyncBound) return;
    window._prixburgReportSyncBound = true;
    window.addEventListener('storage', function (event) {
        if (event.key !== 'prixburgReportSync' && event.key !== 'prixburgSalesSync') return;
        refreshLiveReportViews();
    });
    try {
        if (!window._prixburgReportChannel && typeof BroadcastChannel === 'function') {
            window._prixburgReportChannel = new BroadcastChannel('prixburg-reports');
        }
        if (window._prixburgReportChannel) {
            window._prixburgReportChannel.onmessage = function () {
                refreshLiveReportViews();
            };
        }
    } catch (err) { /* ignore */ }
    try {
        if (typeof BroadcastChannel === 'function') {
            const legacy = new BroadcastChannel('prixburg-sales');
            legacy.onmessage = function () {
                refreshLiveReportViews();
            };
        }
    } catch (err) { /* ignore */ }
}

function saveSalesEntryRow(row) {
    const date = row.date;
    ensureReportFile('daily', date);
    const all = loadAllReportFiles();
    const dest = (all.daily || []).find(function (file) { return file.period === date; });
    const stored = stripStoredSaleRow(row);
    all.daily = (all.daily || []).map(function (file) {
        const had = (file.salesRows || []).some(function (item) { return item && item.id === stored.id; });
        let rows = currentSalesRows(file).filter(function (item) { return item.id !== stored.id; });
        if (dest && file.id === dest.id) {
            rows = rows.concat([stored]);
            file.removedSaleIds = (file.removedSaleIds || []).filter(function (id) { return id !== stored.id; });
        } else if (had) {
            rememberRemovedSale(file, stored.id);
        }
        file.salesRows = rows;
        return file;
    });
    saveAllReportFiles(all);
    refreshFilesSnap('daily');
    refreshSalesAnalysisSnapsForDate(date);
    notifySalesChanged();
    return dest ? dest.id : '';
}

function salesTotals(rows) {
    let cash = 0;
    let credit = 0;
    (rows || []).forEach(function (row) {
        const total = saleLineTotal(row);
        if (normalizeSaleType(row.saleType) === 'credit') credit += total;
        else cash += total;
    });
    return { cash: cash, credit: credit, total: cash + credit };
}

function salesEntryTotal(type, period) {
    return salesTotals(collectSalesRows(type, period)).total;
}

function moneyText(value) {
    return '$' + round2(value).toFixed(2);
}

function qtyText(value) {
    const n = round2(value);
    if (!Number.isFinite(n) || n === 0) return '0';
    if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
    return n.toFixed(2);
}

function periodHasExpenses(type, file) {
    if (type === 'daily') return expensesHaveEntry(file);
    return (peekAllReportFiles().daily || []).some(function (daily) {
        if (!dailyMatchesRollup(daily.period, type, file.period)) return false;
        return expensesHaveEntry(daily);
    });
}

function fileEntryStatus(type, file, productions) {
    const sales = salesRowsForFileRow(type, file, peekAllReportFiles());
    const rows = productions || file.productions || [];
    const hasEntry = sales.length > 0 || rows.length > 0 || periodHasExpenses(type, file);
    const current = defaultPeriodValue(type);
    if (!hasEntry) return 'Awaiting entry';
    if (file.period === current) return 'In progress';
    return 'Completed';
}

function fileStatusCostLine(type, file, productions) {
    const sales = salesRowsForFileRow(type, file, peekAllReportFiles());
    const status = fileEntryStatus(type, file, productions);
    if (sales.length) return status + ' · ' + moneyText(salesTotals(sales).total);
    const expenseTotal = collectExpensesTotal(type, file.period);
    if (expenseTotal > 0) return status + ' · ' + moneyText(expenseTotal);
    const rows = productions || file.productions || [];
    const cost = rows.reduce(function (sum, row) {
        return sum + Number(row.cost || 0);
    }, 0);
    if (status === 'Awaiting entry' || cost <= 0) return status;
    return status + ' · $' + cost.toFixed(2);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fileRowIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';
}

function binIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
}

function fileSearchText(type, file, productions) {
    const label = displayFileLabel(type, file);
    const status = fileEntryStatus(type, file, productions);
    const sub = fileStatusCostLine(type, file, productions);
    return [label, file.period, file.filename, status, sub].join(' ');
}

function saveDashboardSnap(type, file, rows) {
    if (!file || !file.id) return;
    try {
        sessionStorage.setItem('prixburgDash:' + file.id, JSON.stringify({
            id: file.id,
            type: type,
            label: displayFileLabel(type, file),
            period: file.period,
            rows: rows || []
        }));
    } catch (err) { /* ignore quota */ }
}

function saveFilesSnap(type, items) {
    if (!type) return;
    try {
        sessionStorage.setItem('prixburgFiles:' + type, JSON.stringify(items || []));
    } catch (err) { /* ignore quota */ }
}

function refreshFilesSnap(type) {
    const all = peekAllReportFiles();
    const files = (all[type] || []).slice().sort(function (a, b) {
        return String(b.period || '').localeCompare(String(a.period || ''));
    });
    saveFilesSnap(type, files.map(function (file) {
        const productions = productionsForFileRow(type, file, all);
        const label = displayFileLabel(type, file);
        const status = fileEntryStatus(type, file, productions);
        return {
            id: file.id,
            label: label,
            status: status,
            sub: fileStatusCostLine(type, file, productions),
            href: 'report-dashboard.html?type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(file.id)
        };
    }));
}

function renderReportFiles() {
    const type = getReportType();
    const list = document.getElementById('reportFiles');
    const empty = document.getElementById('reportEmpty');
    if (!list) return;

    bindSearchInput('fileSearch', renderReportFiles);
    const query = currentSearchValue('fileSearch');
    const all = peekAllReportFiles();
    const files = (all[type] || []).slice().sort(function (a, b) {
        return String(b.period || '').localeCompare(String(a.period || ''));
    });
    const visible = files.filter(function (file) {
        return matchesSearch(fileSearchText(type, file, productionsForFileRow(type, file, all)), query);
    });
    list.innerHTML = '';

    visible.forEach((file) => {
        const productions = productionsForFileRow(type, file, all);
        const label = displayFileLabel(type, file);
        const status = fileEntryStatus(type, file, productions);
        const sub = fileStatusCostLine(type, file, productions);
        const mode = getReportMode();
        const href = reportDashboardHref(type, file.id, mode);
        const row = document.createElement('div');
        row.className = 'app-file-row';
        row.setAttribute('data-file-id', file.id);
        const deleteBtn = mode
            ? ''
            : `<button type="button" class="app-file-bin" title="Delete" onclick="deleteSavedFile('${type}', '${file.id}')">${binIcon()}</button>`;
        row.innerHTML = `
            <a class="app-file-icon" href="${href}" aria-hidden="true">${fileRowIcon()}</a>
            <a class="app-file-name-block" href="${href}">
                <span class="app-file-label">${escapeHtml(label)}</span>
                <span class="app-file-sub">${escapeHtml(sub)}</span>
            </a>
            <span class="app-file-pill">${escapeHtml(status)}</span>
            ${deleteBtn}
        `;
        list.appendChild(row);
    });

    if (empty) {
        if (!files.length) {
            empty.textContent = type === 'daily' && !autoDailyFilesEnabled()
                ? 'No daily files yet. Create a daily file to enter sales.'
                : 'No ' + type + ' files yet.';
            empty.style.display = 'block';
        } else if (!visible.length) {
            empty.textContent = 'No files match that search.';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
        }
    }
    if (!query) refreshFilesSnap(type);
    if (!getReportMode() && typeof bindFileSelect === 'function') {
        bindFileSelect({
            container: list,
            item: '.app-file-row',
            onDelete: function (ids) {
                deleteSavedFilesNow(type, ids);
            }
        });
    }
    if (typeof syncFileSelect === 'function') syncFileSelect(list);
}

function createReportFile() {
    const type = getReportType();
    const periodInput = document.getElementById('reportPeriod');
    const period = (periodInput && periodInput.value) ? periodInput.value : defaultPeriodValue(type);
    const filename = filenameFor(type, period);
    const content = buildReportContent(type, period);
    const all = loadAllReportFiles();
    const files = all[type] || [];
    const existing = files.find((file) => file.period === period);
    const record = {
        id: existing ? existing.id : Date.now().toString(),
        period: period,
        filename: filename,
        label: fileDisplayLabel(type, period),
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        content: content,
        productions: existing && existing.productions ? existing.productions : [],
        salesRows: existing && existing.salesRows ? existing.salesRows : [],
        expenses: existing && existing.expenses ? existing.expenses : emptyExpenses()
    };

    all[type] = existing
        ? files.map((file) => file.period === period ? record : file)
        : files.concat(record);

    saveAllReportFiles(all);
    renderReportFiles();
    closeCreateDailyFileModal();

    const status = document.getElementById('reportStatus');
    if (status) status.textContent = 'Created ' + filename;
}

function openCreateDailyFileModal() {
    const modal = document.getElementById('createDailyModal');
    const input = document.getElementById('reportPeriod');
    if (input) input.value = defaultPeriodValue('daily');
    if (modal) modal.classList.add('show');
}

function closeCreateDailyFileModal() {
    const modal = document.getElementById('createDailyModal');
    if (modal) modal.classList.remove('show');
}

function bindCreateDailyFileModal() {
    const form = document.getElementById('createDailyForm');
    if (!form || form._bound) return;
    form._bound = true;
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        createReportFile();
    });
}

function deleteSavedFilesNow(type, ids) {
    const remove = {};
    (ids || []).forEach(function (id) {
        remove[String(id)] = true;
    });
    if (!Object.keys(remove).length) return;
    const all = loadAllReportFiles();
    const removed = (all[type] || []).filter(function (item) {
        return remove[String(item.id)];
    });
    if (typeof moveFilesToRecycleBin === 'function') moveFilesToRecycleBin('report-' + type, removed);
    all[type] = (all[type] || []).filter(function (item) {
        return !remove[String(item.id)];
    });
    saveAllReportFiles(all);
    renderReportFiles();
}

function deleteSavedFile(type, id) {
    if (typeof protectDeleteFile === 'function') {
        protectDeleteFile(function () {
            deleteSavedFilesNow(type, [id]);
        });
        return;
    }
    deleteSavedFilesNow(type, [id]);
}

function getDailyReportFile() {
    const id = new URLSearchParams(window.location.search).get('id');
    const files = peekAllReportFiles().daily || [];
    if (id) {
        return files.find((file) => file.id === id) || null;
    }
    return ensureReportFile('daily', defaultPeriodValue('daily'));
}

function findFormulaByName(name) {
    if (typeof loadFormulas !== 'function') return null;
    const files = loadFormulas();
    if (typeof bestNameMatch === 'function') {
        return bestNameMatch(name, files, function (file) { return file.name; });
    }
    const needle = String(name || '').trim().toLowerCase();
    return files.find((file) => String(file.name || '').trim().toLowerCase() === needle) || null;
}

let formulaRateMemo = Object.create(null);
let sellingPriceMemo = Object.create(null);

function clearReportCalcMemo() {
    formulaRateMemo = Object.create(null);
    sellingPriceMemo = Object.create(null);
}

function formulaRateFor(name) {
    const key = String(name || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(formulaRateMemo, key)) return formulaRateMemo[key];
    const formula = findFormulaByName(name);
    let rate = 0;
    if (formula) {
        if (typeof formulaTotals === 'function') {
            rate = Number(formulaTotals(formula).rate) || 0;
        } else {
            const production = parseFloat(formula.production) || 0;
            if (production > 0) {
                const totalCost = (formula.ingredients || []).reduce(function (sum, row) {
                    return sum + (parseFloat(row.amount) || 0) * (parseFloat(row.unitPrice) || 0);
                }, 0);
                rate = totalCost / production;
            }
        }
    }
    formulaRateMemo[key] = rate;
    return rate;
}

function cachedSellingUnitPrice(name) {
    const key = String(name || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(sellingPriceMemo, key)) return sellingPriceMemo[key];
    const value = typeof sellingUnitPriceFor === 'function' ? sellingUnitPriceFor(name) : 0;
    sellingPriceMemo[key] = value;
    return value;
}

function formulaIngredientAmount(row) {
    const amount = parseFloat(row && row.amount);
    if (amount > 0) return amount;
    const text = String((row && row.qtyFormula) || '').trim();
    if (!text) return 0;
    if (typeof evaluateQtyMath === 'function') {
        try {
            const n = evaluateQtyMath(text);
            if (n > 0) return n;
        } catch (err) { /* use parseFloat below */ }
    }
    const n = parseFloat(text.replace(/^=/, ''));
    return n > 0 ? n : 0;
}

function scaledFormulaIngredients(formula, quantity) {
    const base = parseFloat(formula.production) || 0;
    const scale = quantity / base;
    return (formula.ingredients || []).map((row) => ({
        name: String(row.name || '').trim(),
        unit: row.unit,
        amount: (typeof roundQty === 'function'
            ? roundQty(formulaIngredientAmount(row) * scale)
            : formulaIngredientAmount(row) * scale)
    })).filter(function (row) {
        return row.name && (parseFloat(row.amount) || 0) > 0;
    });
}

function storeUnitCostFor(name, storeRows) {
    const match = typeof findStoreMaterial === 'function'
        ? findStoreMaterial(storeRows, name)
        : (typeof bestNameMatch === 'function'
            ? bestNameMatch(name, storeRows, function (row) { return row.name; })
            : (storeRows || []).find(function (row) {
                return String(row.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase();
            }));
    return parseFloat(match && match.unitCost) || 0;
}

function rawMaterialCostFromIngredients(ingredients, storeRows) {
    return (ingredients || []).reduce(function (sum, ing) {
        return sum + (parseFloat(ing.amount) || 0) * storeUnitCostFor(ing.name, storeRows);
    }, 0);
}

function produceDetergent() {
    const status = document.getElementById('produceStatus');
    const btn = document.querySelector('button[onclick="produceDetergent()"]');
    const name = (document.getElementById('produceName') && document.getElementById('produceName').value || '').trim();
    const amount = parseFloat(document.getElementById('produceAmount') && document.getElementById('produceAmount').value) || 0;
    const unit = (document.getElementById('produceUnit') && document.getElementById('produceUnit').value) || 'L';

    function setStatus(message) {
        if (status) status.textContent = message;
    }

    if (!name || !(amount > 0)) {
        setStatus('Enter the detergent name and the amount to produce.');
        return;
    }
    if (produceDetergent.busy) return;
    produceDetergent.busy = true;
    if (btn) btn.disabled = true;
    setStatus('Producing...');

    function finish() {
        produceDetergent.busy = false;
        if (btn) btn.disabled = false;
    }

    function run() {
        try {
            runProduceDetergent(name, amount, unit, setStatus);
        } catch (err) {
            console.error(err);
            setStatus('Produce failed. Check the detergent formula file and the storeroom, then try again.');
        }
        finish();
    }

    run();
}

function runProduceDetergent(name, amount, unit, setStatus) {
    clearReportCalcMemo();
    const formula = findFormulaByName(name);
    if (!formula) {
        setStatus('No formula found for "' + name + '". Save it under Detergent formulars first.');
        return;
    }
    const baseAmount = parseFloat(formula.production) || 0;
    if (!(baseAmount > 0)) {
        setStatus('The formula for ' + formula.name + ' needs an amount produced greater than 0.');
        return;
    }

    const file = getDailyReportFile();
    if (!file) {
        setStatus('Open Production entry from a daily file.');
        return;
    }

    const ingredients = scaledFormulaIngredients(formula, amount);
    if (!ingredients.length) {
        setStatus('The formula for ' + formula.name + ' needs ingredient rows with names and quantities. Add them in the detergent formula file, then Produce again.');
        return;
    }

    const result = subtractIngredientsFromStore(ingredients);
    if (!result.ok) {
        setStatus(result.message);
        return;
    }

    dbSet('rawMaterialsData', result.rows);

    const rate = formulaRateFor(formula.name);
    const cost = rate * amount;
    const unitPrice = cachedSellingUnitPrice(formula.name) || cachedSellingUnitPrice(name);
    const productionValue = unitPrice * amount;
    const totalSales = productionValue - cost;

    const all = loadAllReportFiles();
    all.daily = (all.daily || []).map((item) => {
        if (item.id !== file.id) return item;
        const madeAt = Date.now();
        item.productions = (item.productions || []).concat([{
            id: madeAt.toString() + '-' + Math.random().toString(36).slice(2, 7),
            product: formula.name,
            detergent: formula.name,
            quantity: amount,
            unit: unit,
            cost: cost,
            production: productionValue,
            totalSales: totalSales,
            createdAt: new Date(madeAt).toISOString(),
            savedAt: madeAt
        }]);
        return item;
    });
    saveAllReportFiles(all);
    const updated = (peekAllReportFiles().daily || []).find(function (item) {
        return item.id === file.id;
    }) || file;
    saveDashboardSnap('daily', updated, aggregateDashboardRows(productionsForDashboard('daily', updated.period)));
    refreshFilesSnap('daily');
    ['weekly', 'monthly', 'yearly'].forEach(function (type) {
        const period = defaultPeriodValue(type);
        const periodFile = (peekAllReportFiles()[type] || []).find(function (item) {
            return item.period === period;
        });
        if (!periodFile) return;
        saveDashboardSnap(type, periodFile, aggregateDashboardRows(productionsForDashboard(type, period)));
        refreshFilesSnap(type);
    });
    notifyProductionChanged();

    const remaining = result.remainingStock || (typeof remainingUsedStockText === 'function'
        ? remainingUsedStockText(result.rows, result.used)
        : remainingStockText(result.rows));
    logProductionMovement(formula.name, amount, unit, result.used, remaining);
    if (!(rate > 0) && !(unitPrice > 0)) {
        setStatus('Produced ' + amount + ' ' + unit + ' ' + formula.name + '. Storeroom and batch updated. Add formula unit prices and Pricing files so the dashboard can calculate cost and expected sales.');
        return;
    }
    if (!(rate > 0)) {
        setStatus('Produced ' + amount + ' ' + unit + ' ' + formula.name + '. Storeroom and batch updated. Add ingredient unit prices in the detergent formula file so Cost of raw materials can be calculated.');
        return;
    }
    if (!(unitPrice > 0)) {
        setStatus('Produced ' + amount + ' ' + unit + ' ' + formula.name + '. Storeroom and batch updated. Add this detergent in Pricing files so Expected sales can be calculated.');
        return;
    }
    setStatus('Produced ' + amount + ' ' + unit + ' ' + formula.name + '. Storeroom, movement history, and production report updated.');
}

function dailyMatchesRollup(dateValue, type, period) {
    if (!dateValue) return false;
    if (type === 'daily') return dateValue === period;
    const date = new Date(dateValue + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return false;
    if (type === 'weekly') return getISOWeekValue(date) === period;
    if (type === 'monthly') return dateValue.slice(0, 7) === period;
    if (type === 'yearly') return dateValue.slice(0, 4) === String(period);
    return false;
}

function enrichProduction(row) {
    const name = row.detergent || row.product || '';
    const qty = parseFloat(row.quantity) || 0;
    const rate = formulaRateFor(name);
    const unitPrice = cachedSellingUnitPrice(name);
    const cost = (rate > 0 && qty > 0) ? rate * qty : Number(row.cost || 0);
    let production = (unitPrice > 0 && qty > 0) ? unitPrice * qty : Number(row.production);
    if (!Number.isFinite(production)) production = 0;
    const totalSales = production - cost;
    return {
        product: name,
        unit: row.unit || '',
        cost: cost,
        production: production,
        totalSales: totalSales
    };
}

function productionsForDashboard(type, period) {
    const dailies = peekAllReportFiles().daily || [];
    const rows = [];
    dailies.forEach(function (file) {
        if (!dailyMatchesRollup(file.period, type, period)) return;
        (file.productions || []).forEach(function (row) {
            rows.push(enrichProduction(row));
        });
    });
    return rows;
}

function aggregateDashboardRows(rows) {
    const map = {};
    rows.forEach(function (row) {
        const key = String(row.product || '').toLowerCase();
        if (!map[key]) {
            map[key] = {
                product: row.product || '',
                cost: 0,
                production: 0,
                totalSales: 0
            };
        }
        map[key].cost += Number(row.cost || 0);
        map[key].production += Number(row.production || 0);
        map[key].totalSales += Number(row.totalSales || 0);
    });
    return Object.keys(map).map(function (key) { return map[key]; });
}

function dashboardFile() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') || document.body.getAttribute('data-report-type') || 'daily';
    const id = params.get('id');
    const files = peekAllReportFiles()[type] || [];
    if (id) return { type: type, file: files.find(function (item) { return item.id === id; }) || null };
    const period = defaultPeriodValue(type);
    const existing = files.find(function (item) { return item.period === period; });
    if (existing) return { type: type, file: existing };
    if (type === 'daily' && !autoDailyFilesEnabled()) {
        if (getReportMode() === 'sales-analysis' || getReportMode() === 'production' || getReportMode() === 'sales-entry' || getReportMode() === 'profit-expense') {
            return {
                type: type,
                file: {
                    id: '',
                    period: period,
                    label: fileDisplayLabel('daily', period),
                    salesRows: [],
                    productions: []
                }
            };
        }
        return { type: type, file: null };
    }
    return { type: type, file: ensureReportFile(type, period) };
}

function isSalesEntryView(current) {
    const mode = getReportMode();
    if (mode === 'sales-entry') return true;
    return current.type === 'daily' && !mode;
}

function isProductionView() {
    return getReportMode() === 'production';
}

function isSalesAnalysisView(current) {
    const mode = getReportMode();
    if (mode === 'sales-analysis') return true;
    if (mode === 'profit-expense' || mode === 'production' || mode === 'sales-entry') return false;
    return current.type === 'weekly' || current.type === 'monthly' || current.type === 'yearly';
}

function isoWeekDateRange(period) {
    const parts = String(period).split('-W');
    if (parts.length !== 2) return '';
    const year = Number(parts[0]);
    const week = Number(parts[1]);
    if (!year || !week) return '';
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    function shortLabel(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return date.getUTCDate() + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
    }
    return shortLabel(monday) + ' to ' + shortLabel(sunday);
}

function dashboardRangeText(type, period) {
    if (type === 'weekly') return isoWeekDateRange(period);
    if (type === 'monthly') return fileDisplayLabel('monthly', period);
    if (type === 'yearly') return String(period);
    return fileDisplayLabel('daily', period);
}

function periodSalesPrefix(type) {
    if (type === 'weekly') return 'Weekly';
    if (type === 'monthly') return 'Monthly';
    if (type === 'yearly') return 'Yearly';
    return 'Daily';
}

function salesEntryCards(totals, type) {
    const figures = totals || { cash: 0, credit: 0, total: 0 };
    const prefix = periodSalesPrefix(type);
    return [
        { label: prefix + ' total sales $', value: figures.total },
        { label: prefix + ' total cash sales $', value: figures.cash },
        { label: prefix + ' total credit sales $', value: figures.credit }
    ];
}

function cashCreditCards(type, totals, includeTotal) {
    const prefix = periodSalesPrefix(type);
    const cards = [
        { label: prefix + ' total cash sales $', value: totals.cash },
        { label: prefix + ' total credit sales $', value: totals.credit }
    ];
    if (includeTotal) {
        cards.push({ label: prefix + ' total sales $', value: totals.total });
    }
    return cards;
}

function analysisCardLabels(type, totals) {
    return cashCreditCards(type, totals, true);
}

function renderSalesCards(cards) {
    const box = document.getElementById('salesCards');
    if (!box) return;
    box.style.display = 'grid';
    box.innerHTML = (cards || []).map(function (card) {
        const value = card.plain ? escapeHtml(String(card.value)) : moneyText(card.value);
        return '<div class="sales-card"><h3>' + escapeHtml(card.label) + '</h3><p class="rate-value">' + value + '</p></div>';
    }).join('');
}

function setDashboardHead(headers) {
    const head = document.getElementById('dashboardHead');
    if (!head) return;
    head.innerHTML = '<tr>' + headers.map(function (label) {
        return '<th>' + escapeHtml(label) + '</th>';
    }).join('') + '</tr>';
}

function saleHasValue(row) {
    return String(row.item || '').trim()
        || String(row.teamLeader || '').trim()
        || String(row.customer || '').trim()
        || Number(row.unitPrice)
        || Number(row.quantity);
}

function aggregateSalesAnalysis(rows) {
    const map = {};
    (rows || []).forEach(function (row) {
        if (!saleHasValue(row)) return;
        const name = String(row.item || '').trim() || 'Untitled detergent';
        const key = name.toLowerCase();
        if (!map[key]) {
            map[key] = {
                product: name,
                cashQty: 0,
                cashSales: 0,
                creditQty: 0,
                creditSales: 0,
                totalSales: 0
            };
        }
        const qty = Number(row.quantity) || 0;
        const sales = saleLineTotal(row);
        if (normalizeSaleType(row.saleType) === 'credit') {
            map[key].creditQty += qty;
            map[key].creditSales += sales;
        } else {
            map[key].cashQty += qty;
            map[key].cashSales += sales;
        }
        map[key].totalSales += sales;
    });
    return Object.keys(map).map(function (key) { return map[key]; });
}

function currentSalesRows(file) {
    return ((file && file.salesRows) || []).map(function (row) {
        return {
            id: row.id || Date.now().toString(),
            item: row.item || '',
            teamLeader: row.teamLeader || '',
            customer: row.customer || '',
            unitPrice: row.unitPrice,
            quantity: row.quantity,
            saleType: normalizeSaleType(row.saleType),
            savedAt: Number(row.savedAt) || 0,
            updatedAt: Number(row.updatedAt) || Number(row.savedAt) || 0,
            source: row.source || '',
            creditPaymentId: row.creditPaymentId || ''
        };
    });
}

function saveDailySalesRows(fileId, rows) {
    const all = loadAllReportFiles();
    let period = '';
    all.daily = (all.daily || []).map(function (item) {
        if (item.id !== fileId) return item;
        period = item.period || '';
        item.salesRows = rows;
        return item;
    });
    saveAllReportFiles(all);
    refreshFilesSnap('daily');
    if (period) refreshSalesAnalysisSnapsForDate(period);
    notifySalesChanged();
}

function saleTypeButton(row) {
    const kind = normalizeSaleType(row.saleType);
    const label = kind === 'credit' ? 'Credit' : 'Cash';
    return '<button type="button" class="sale-kind ' + kind + '" data-sale-toggle="' + kind + '" title="Click to mark Cash or Credit">'
        + '<span class="sale-kind-radio" aria-hidden="true"></span>'
        + '<span class="sale-kind-label">' + label + '</span>'
        + '</button>';
}

function renderSalesEntryDashboard(current) {
    const body = document.getElementById('dashboardBody');
    const empty = document.getElementById('dashboardEmpty');
    const addBtn = document.getElementById('addSalesRowBtn');
    const range = document.getElementById('dashboardRange');
    const searchBox = document.getElementById('salesEntrySearch');
    if (addBtn) addBtn.style.display = '';
    if (searchBox) {
        const wrap = searchBox.closest('.app-search');
        if (wrap) wrap.style.display = '';
        if (typeof bindSearchInput === 'function') {
            bindSearchInput('salesEntrySearch', function () {
                renderSalesEntryDashboard(dashboardFile());
            });
        }
    }
    const period = current.file && current.file.period ? current.file.period : defaultPeriodValue(current.type);
    const bounds = periodDateBounds(current.type, period);
    if (range) {
        const text = dashboardRangeText(current.type, period);
        range.textContent = text;
        range.style.display = text ? 'block' : 'none';
    }
    setDashboardHead([
        'Date',
        'Sale type',
        'Detergent name',
        'Team leader',
        'Customer name',
        'Unit price',
        'Quantity of detergent sold',
        'Total sales',
        'Sync',
        ''
    ]);
    const deleteHead = document.querySelector('#dashboardHead th:last-child');
    if (deleteHead) deleteHead.className = 'row-delete-cell';
    const allRows = flattenPeriodSalesRows(current.type, period);
    const query = typeof currentSearchValue === 'function' ? currentSearchValue('salesEntrySearch') : '';
    const rows = allRows.filter(function (row) {
        if (!query) return true;
        return typeof matchesSearch === 'function' ? matchesSearch(saleRowSearchText(row), query) : true;
    });
    const totals = salesTotals(allRows);
    renderSalesCards(salesEntryCards(totals, current.type));
    const dateLocked = current.type === 'daily' ? ' readonly' : '';
    body.innerHTML = rows.map(function (row) {
        const price = row.unitPrice === '' || row.unitPrice == null ? '' : row.unitPrice;
        const qty = row.quantity === '' || row.quantity == null ? '' : row.quantity;
        return '<tr data-row-id="' + escapeHtml(row.id) + '" data-file-id="' + escapeHtml(row.fileId || '') + '" data-row-date="' + escapeHtml(row.date || '') + '">'
            + '<td><input data-sale-field="date" type="date" value="' + escapeHtml(row.date || '') + '" min="' + escapeHtml(bounds.min || '') + '" max="' + escapeHtml(bounds.max || '') + '"' + dateLocked + '></td>'
            + '<td>' + saleTypeButton(row) + '</td>'
            + '<td><input data-sale-field="item" type="text" value="' + escapeHtml(row.item) + '" placeholder="Detergent"></td>'
            + '<td><input data-sale-field="teamLeader" type="text" value="' + escapeHtml(row.teamLeader) + '" placeholder="Team leader"></td>'
            + '<td><input data-sale-field="customer" type="text" value="' + escapeHtml(row.customer) + '" placeholder="Customer"></td>'
            + '<td><input data-sale-field="unitPrice" type="number" min="0" step="0.01" value="' + escapeHtml(price) + '" placeholder="0.00"></td>'
            + '<td><input data-sale-field="quantity" type="number" min="0" step="0.01" value="' + escapeHtml(qty) + '" placeholder="0"></td>'
            + '<td data-sale-total>' + moneyText(saleLineTotal(row)) + '</td>'
            + '<td data-sale-sync class="sync-cell ' + (saleSyncLabel(row) === 'Waiting' ? 'is-waiting' : 'is-synced') + '">' + escapeHtml(saleSyncLabel(row)) + '</td>'
            + '<td class="row-delete-cell"><button type="button" class="danger-btn row-delete-btn" data-sale-delete>Delete</button></td>'
            + '</tr>';
    }).join('');
    if (empty) {
        if (query && !rows.length && allRows.length) {
            empty.textContent = 'No sales match that search.';
            empty.style.display = 'block';
        } else {
            empty.textContent = 'Click Add row to enter a sale.';
            empty.style.display = allRows.length ? 'none' : 'block';
        }
    }
    saveDashboardSnap(current.type, current.file, allRows);
    bindSalesEntryTable();
}

function renderSalesAnalysisDashboard(current) {
    const body = document.getElementById('dashboardBody');
    const empty = document.getElementById('dashboardEmpty');
    const addBtn = document.getElementById('addSalesRowBtn');
    const range = document.getElementById('dashboardRange');
    if (addBtn) addBtn.style.display = 'none';
    if (range) {
        const text = dashboardRangeText(current.type, current.file.period);
        range.textContent = text;
        range.style.display = text ? 'block' : 'none';
    }
    setDashboardHead([
        'Detergent',
        'Cash sales quantity',
        'Cash sales $',
        'Credit sales quantity',
        'Credit sales $',
        'Total sales $'
    ]);
    const source = collectSalesRows(current.type, current.file.period);
    const rows = aggregateSalesAnalysis(source);
    const totals = salesTotals(source);
    renderSalesCards(analysisCardLabels(current.type, totals));
    body.innerHTML = rows.map(function (row) {
        return '<tr>'
            + '<td>' + escapeHtml(row.product) + '</td>'
            + '<td>' + qtyText(row.cashQty) + '</td>'
            + '<td>' + moneyText(row.cashSales) + '</td>'
            + '<td>' + qtyText(row.creditQty) + '</td>'
            + '<td>' + moneyText(row.creditSales) + '</td>'
            + '<td>' + moneyText(row.totalSales) + '</td>'
            + '</tr>';
    }).join('');
    if (empty) {
        empty.textContent = 'No sales in this period yet.';
        empty.style.display = rows.length ? 'none' : 'block';
    }
    saveDashboardSnap(current.type, current.file, rows);
}

function refreshSalesAnalysisSnapsForDate(dateValue) {
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(function (type) {
        const period = type === 'daily'
            ? dateValue
            : (type === 'weekly'
                ? getISOWeekValue(new Date(dateValue + 'T00:00:00'))
                : (type === 'monthly' ? String(dateValue || '').slice(0, 7) : String(dateValue || '').slice(0, 4)));
        if (!period) return;
        const file = (peekAllReportFiles()[type] || []).find(function (item) {
            return item.period === period;
        });
        if (!file) return;
        const source = collectSalesRows(type, period);
        saveDashboardSnap(type, Object.assign({}, file, { label: displayFileLabel(type, file) }), aggregateSalesAnalysis(source));
        refreshFilesSnap(type);
    });
}

function patchSalesRow(rowId, patch) {
    const current = dashboardFile();
    if (!current.file) return;
    const period = current.file.period;
    const existing = flattenPeriodSalesRows(current.type, period).filter(function (row) {
        return row.id === rowId;
    })[0];
    if (!existing) return;
    const next = Object.assign({}, existing, patch);
    if (patch.unitPrice != null) next.unitPrice = patch.unitPrice === '' ? '' : round2(patch.unitPrice);
    if (patch.quantity != null) next.quantity = patch.quantity === '' ? '' : round2(patch.quantity);
    if (patch.date != null) next.date = clampDateToPeriod(patch.date, current.type, period);
    const destId = saveSalesEntryRow(next);
    next.fileId = destId;
    const tr = document.querySelector('tr[data-row-id="' + rowId + '"]');
    if (tr) {
        tr.setAttribute('data-file-id', destId || '');
        tr.setAttribute('data-row-date', next.date || '');
        const total = tr.querySelector('[data-sale-total]');
        if (total) total.textContent = moneyText(saleLineTotal(next));
        const dateInput = tr.querySelector('[data-sale-field="date"]');
        if (dateInput && dateInput.value !== next.date) dateInput.value = next.date || '';
        if (patch.saleType) {
            const btn = tr.querySelector('[data-sale-toggle]');
            if (btn) {
                const kind = normalizeSaleType(next.saleType);
                btn.className = 'sale-kind ' + kind;
                btn.setAttribute('data-sale-toggle', kind);
                const label = btn.querySelector('.sale-kind-label');
                if (label) label.textContent = kind === 'credit' ? 'Credit' : 'Cash';
            }
        }
    }
    renderSalesCards(salesEntryCards(salesTotals(flattenPeriodSalesRows(current.type, period)), current.type));
}

function deleteSalesEntryRow(rowId) {
    if (!rowId) return;
    const current = dashboardFile();
    if (!current.file) return;
    const existing = flattenPeriodSalesRows(current.type, current.file.period).filter(function (row) {
        return row.id === rowId;
    })[0];
    const all = loadAllReportFiles();
    let removedDate = existing && existing.date ? existing.date : '';
    let removed = false;
    all.daily = (all.daily || []).map(function (file) {
        const rows = currentSalesRows(file);
        const next = rows.filter(function (item) { return item.id !== rowId; });
        if (next.length === rows.length) return file;
        rememberRemovedSale(file, rowId);
        file.salesRows = next;
        removed = true;
        if (!removedDate) removedDate = file.period || '';
        return file;
    });
    if (!removed) return;
    saveAllReportFiles(all);
    refreshFilesSnap('daily');
    if (removedDate) refreshSalesAnalysisSnapsForDate(removedDate);
    notifySalesChanged();
    renderSalesEntryDashboard(dashboardFile());
}

function addSalesEntryRow() {
    const current = dashboardFile();
    const period = current.file && current.file.period ? current.file.period : defaultPeriodValue(current.type);
    const date = defaultEntryDate(current.type, period);
    const dest = ensureReportFile('daily', date);
    const createdAt = Date.now();
    const rows = currentSalesRows(dest).concat([{
        id: createdAt.toString() + '-' + Math.random().toString(36).slice(2, 7),
        item: '',
        teamLeader: '',
        customer: '',
        unitPrice: '',
        quantity: '',
        saleType: 'cash',
        savedAt: createdAt,
        updatedAt: createdAt
    }]);
    saveDailySalesRows(dest.id, rows);
    renderSalesEntryDashboard(dashboardFile());
    const inputs = document.querySelectorAll('#dashboardBody input[data-sale-field="item"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function bindSalesEntryTable() {
    const table = document.getElementById('dashboardTable');
    const addBtn = document.getElementById('addSalesRowBtn');
    if (addBtn && !addBtn._bound) {
        addBtn._bound = true;
        addBtn.addEventListener('click', addSalesEntryRow);
    }
    if (!table || table._salesBound) return;
    table._salesBound = true;
    table.addEventListener('click', function (event) {
        const remove = event.target.closest('[data-sale-delete]');
        if (remove) {
            const row = remove.closest('tr[data-row-id]');
            if (!row) return;
            deleteSalesEntryRow(row.getAttribute('data-row-id'));
            return;
        }
        const toggle = event.target.closest('[data-sale-toggle]');
        if (!toggle) return;
        const tr = toggle.closest('tr[data-row-id]');
        if (!tr) return;
        const current = dashboardFile();
        if (!current.file) return;
        const next = toggle.getAttribute('data-sale-toggle') === 'cash' ? 'credit' : 'cash';
        patchSalesRow(tr.getAttribute('data-row-id'), { saleType: next });
    });
    table.addEventListener('input', function (event) {
        const field = event.target.getAttribute('data-sale-field');
        const tr = event.target.closest('tr[data-row-id]');
        if (!field || !tr) return;
        const current = dashboardFile();
        if (!current.file) return;
        const patch = {};
        patch[field] = event.target.value;
        patchSalesRow(tr.getAttribute('data-row-id'), patch);
    });
    table.addEventListener('change', function (event) {
        if (event.target.getAttribute('data-sale-field') !== 'date') return;
        const tr = event.target.closest('tr[data-row-id]');
        if (!tr) return;
        patchSalesRow(tr.getAttribute('data-row-id'), { date: event.target.value });
    });
}

function renderProductionDashboard(current) {
    const body = document.getElementById('dashboardBody');
    const empty = document.getElementById('dashboardEmpty');
    const addBtn = document.getElementById('addSalesRowBtn');
    const cards = document.getElementById('salesCards');
    const range = document.getElementById('dashboardRange');
    if (addBtn) addBtn.style.display = 'none';
    if (cards) {
        cards.innerHTML = '';
        cards.style.display = 'none';
    }
    if (range) {
        const text = dashboardRangeText(current.type, current.file.period);
        range.textContent = text;
        range.style.display = text ? 'block' : 'none';
    }
    setDashboardHead(['Detergent', 'Cost of raw materials', 'Expected sales', 'Expected gross profit']);
    const rows = aggregateDashboardRows(productionsForDashboard(current.type, current.file.period));
    saveDashboardSnap(current.type, current.file, rows);
    body.innerHTML = rows.map(function (row) {
        return '<tr>'
            + '<td>' + escapeHtml(row.product || row.detergent || '') + '</td>'
            + '<td>' + moneyText(row.cost) + '</td>'
            + '<td>' + moneyText(row.production) + '</td>'
            + '<td>' + moneyText(row.totalSales) + '</td>'
            + '</tr>';
    }).join('');
    if (empty) {
        empty.textContent = 'No production in this period yet.';
        empty.style.display = rows.length ? 'none' : 'block';
    }
}

function renderProfitDashboard(current) {
    const body = document.getElementById('dashboardBody');
    const empty = document.getElementById('dashboardEmpty');
    const addBtn = document.getElementById('addSalesRowBtn');
    const range = document.getElementById('dashboardRange');
    document.body.classList.add('profit-cards-only');
    if (addBtn) addBtn.style.display = 'none';
    // Expenses card = full Expenses entry total (raw materials + wages + rent + fuel + transport + lunch + other).
    const breakdown = expenseBreakdown(current.type, current.file.period);
    renderSalesCards([
        { label: periodSalesPrefix(current.type) + ' total sales $', value: breakdown.sales },
        { label: periodSalesPrefix(current.type) + ' total expenses $', value: breakdown.expenses },
        { label: periodSalesPrefix(current.type) + ' total net profit $', value: breakdown.profit }
    ]);
    if (range) {
        const text = dashboardRangeText(current.type, current.file.period);
        range.textContent = text;
        range.style.display = text ? 'block' : 'none';
    }
    if (body) body.innerHTML = '';
    if (empty) empty.style.display = 'none';
    saveDashboardSnap(current.type, current.file, []);
}

function renderDashboard() {
    const body = document.getElementById('dashboardBody');
    const title = document.getElementById('dashboardTitle');
    const back = document.getElementById('dashboardBack');
    if (!body) return;

    const current = dashboardFile();
    const mode = getReportMode();
    if (!current.file) {
        if (!window.dbLiveReady) return;
        window.location.href = reportListHref(current.type, mode);
        return;
    }

    if (back) {
        if (mode === 'sales-entry') {
            let analysisHref = 'sales-analysis.html?type=' + encodeURIComponent(current.type);
            if (current.file && current.file.id) analysisHref += '&id=' + encodeURIComponent(current.file.id);
            back.href = analysisHref;
            back.textContent = periodSalesPrefix(current.type) + ' sales analysis';
        } else {
            back.href = reportListHref(current.type, mode);
            back.textContent = reportListLabel(current.type, mode);
        }
    }
    const produceBtn = document.getElementById('productionEntryBtn');
    if (produceBtn) {
        if (mode === 'production' && current.type === 'daily') {
            produceBtn.style.display = '';
            produceBtn.href = current.file && current.file.id
                ? 'production-entry.html?id=' + encodeURIComponent(current.file.id)
                : 'production-entry.html';
        } else {
            produceBtn.style.display = 'none';
        }
    }
    const expensesBtn = document.getElementById('expensesEntryBtn');
    if (expensesBtn) {
        if (mode === 'profit-expense' && current.file) {
            expensesBtn.style.display = '';
            expensesBtn.textContent = expensesEntryLabel(current.type);
            let expenseHref = 'expenses-entry.html?type=' + encodeURIComponent(current.type);
            if (current.file.id) expenseHref += '&id=' + encodeURIComponent(current.file.id);
            expensesBtn.href = expenseHref;
        } else {
            expensesBtn.style.display = 'none';
        }
    }
    const salesEntryBtn = document.getElementById('salesEntryBtn');
    if (salesEntryBtn) {
        if (isSalesAnalysisView(current) && current.file) {
            salesEntryBtn.style.display = '';
            salesEntryBtn.textContent = salesEntryLabel(current.type);
            let entryHref = 'sales-entry.html?type=' + encodeURIComponent(current.type);
            if (current.file.id) entryHref += '&id=' + encodeURIComponent(current.file.id);
            salesEntryBtn.href = entryHref;
        } else {
            salesEntryBtn.style.display = 'none';
        }
    }
    const label = displayFileLabel(current.type, current.file);
    const heading = mode === 'sales-entry' ? salesEntryLabel(current.type) : label;
    if (title) title.textContent = heading;
    document.title = 'Prixburg - ' + heading;
    document.body.setAttribute('data-report-type', current.type);

    const range = document.getElementById('dashboardRange');
    if (range && !isSalesAnalysisView(current) && !isProductionView() && !isSalesEntryView(current)) {
        range.textContent = '';
        range.style.display = 'none';
    }

    if (isSalesEntryView(current)) {
        renderSalesEntryDashboard(current);
        return;
    }
    if (isSalesAnalysisView(current)) {
        renderSalesAnalysisDashboard(current);
        return;
    }
    if (isProductionView()) {
        renderProductionDashboard(current);
        return;
    }
    renderProfitDashboard(current);
}

function initProductionEntry() {
    if (!document.getElementById('produceName')) return;
    const file = getDailyReportFile();
    if (!file) {
        if (!window.dbLiveReady) return;
        window.location.replace('production.html?type=daily');
        return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('id') !== file.id) {
        window.history.replaceState(null, null, 'production-entry.html?id=' + encodeURIComponent(file.id));
    }
    const back = document.getElementById('productionBack');
    if (back) {
        back.href = 'production.html?type=daily';
        back.textContent = 'Production report';
    }
}

function scheduleEnsurePeriodFiles() {
    function run() {
        ensureCurrentPeriodFiles();
        renderReportFiles();
    }
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
            setTimeout(run, 0);
        });
        return;
    }
    setTimeout(run, 0);
}

let expenseDraft = null;
let expenseSaveTimer = null;

function expensePageType() {
    const type = new URLSearchParams(window.location.search).get('type') || 'daily';
    if (type === 'weekly' || type === 'monthly' || type === 'yearly') return type;
    return 'daily';
}

function currentExpenseFile() {
    const type = expensePageType();
    const id = new URLSearchParams(window.location.search).get('id');
    const files = peekAllReportFiles()[type] || [];
    if (id) {
        const found = files.find(function (file) { return file.id === id; });
        if (found) return found;
    }
    const period = defaultPeriodValue(type);
    const existing = files.find(function (file) { return file.period === period; });
    if (existing) return existing;
    return ensureReportFile(type, period);
}

function fillExpenseMaterialsRow() {
    const input = document.getElementById('expenseMaterials');
    if (!input) return 0;
    const file = currentExpenseFile();
    const cost = file ? productionMaterialCostForPeriod(expensePageType(), file.period) : 0;
    input.value = cost.toFixed(2);
    return cost;
}

function expenseEntryGrandTotal() {
    const file = currentExpenseFile();
    if (!file) return 0;
    if (expensePageType() !== 'daily') {
        return collectExpenseLines(expensePageType(), file.period).total;
    }
    return expenseFileTotal(expenseDraft) + fillExpenseMaterialsRow();
}

function updateExpenseTotalCard() {
    const card = document.getElementById('expenseTotalCard');
    fillExpenseMaterialsRow();
    if (card) card.textContent = moneyText(expenseEntryGrandTotal());
}

function flushExpenseSave() {
    clearTimeout(expenseSaveTimer);
    expenseSaveTimer = null;
    const file = currentExpenseFile();
    if (!file || !expenseDraft || expensePageType() !== 'daily') return;
    saveDailyExpenses(file.id, expenseDraft);
}

function scheduleExpenseSave() {
    if (!currentExpenseFile() || !expenseDraft) return;
    updateExpenseTotalCard();
    if (expensePageType() !== 'daily') return;
    clearTimeout(expenseSaveTimer);
    expenseSaveTimer = setTimeout(flushExpenseSave, 200);
}

function renderWageRows() {
    const box = document.getElementById('wageRows');
    if (!box || !expenseDraft) return;
    const locked = expensePageType() !== 'daily';
    box.innerHTML = expenseDraft.wages.map(function (row) {
        const remove = !locked && expenseDraft.wages.length > 1
            ? '<button type="button" class="action-btn" data-remove-wage="' + escapeHtml(row.id) + '">Remove</button>'
            : '';
        const readOnly = locked ? ' readonly' : '';
        const amount = locked ? Number(row.amount || 0).toFixed(2) : expenseInputDisplay(row, false);
        return '<div class="wage-row" data-wage-id="' + escapeHtml(row.id) + '">'
            + '<input data-wage-field="worker" type="text" value="' + escapeHtml(row.worker) + '" placeholder="Name of worker"' + readOnly + '>'
            + '<input data-wage-field="amount" type="text" inputmode="decimal" value="' + escapeHtml(amount) + '" placeholder="Daily wage $ or formula"' + readOnly + '>'
            + remove
            + '</div>';
    }).join('');
}

function renderOtherExpenseRows() {
    const box = document.getElementById('otherExpenseRows');
    if (!box || !expenseDraft) return;
    const locked = expensePageType() !== 'daily';
    const rows = expenseDraft.other && expenseDraft.other.length
        ? expenseDraft.other
        : (locked ? [] : [emptyOtherExpenseRow()]);
    if (!expenseDraft.other || !expenseDraft.other.length) {
        if (!locked) expenseDraft.other = rows;
    }
    if (!rows.length) {
        box.innerHTML = '<p class="dashboard-range">No other expenses</p>';
        return;
    }
    box.innerHTML = rows.map(function (row) {
        const remove = !locked
            ? '<button type="button" class="action-btn" data-remove-other="' + escapeHtml(row.id) + '">Remove</button>'
            : '';
        const readOnly = locked ? ' readonly' : '';
        const amount = locked ? Number(row.amount || 0).toFixed(2) : expenseInputDisplay(row, false);
        return '<div class="wage-row" data-other-id="' + escapeHtml(row.id) + '">'
            + '<input data-other-field="item" type="text" value="' + escapeHtml(row.item || '') + '" placeholder="e.g. Water"' + readOnly + '>'
            + '<input data-other-field="amount" type="text" inputmode="decimal" value="' + escapeHtml(amount) + '" placeholder="Amount $ or formula"' + readOnly + '>'
            + remove
            + '</div>';
    }).join('');
}

function bindExpenseAmountInput(input, getLine, setLine) {
    if (!input || input._expenseBound) return;
    input._expenseBound = true;
    input.addEventListener('focus', function () {
        if (expensePageType() !== 'daily') return;
        const line = getLine();
        input.value = line.formula || '';
        input.classList.remove('expense-error');
    });
    input.addEventListener('input', function () {
        if (expensePageType() !== 'daily') return;
        const next = evaluateExpenseInput(input.value);
        setLine(next);
        if (next.error) input.classList.add('expense-error');
        else input.classList.remove('expense-error');
        scheduleExpenseSave();
    });
    input.addEventListener('blur', function () {
        if (expensePageType() !== 'daily') return;
        const line = getLine();
        input.value = expenseInputDisplay(line, false);
        if (line.error) input.classList.add('expense-error');
        else input.classList.remove('expense-error');
    });
}

function bindExpenseForm() {
    const form = document.getElementById('expenseForm');
    if (!form || form._expenseBound) return;
    form._expenseBound = true;
    const addBtn = document.getElementById('addWorkerBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function () {
            if (expensePageType() !== 'daily' || !expenseDraft) return;
            expenseDraft.wages = expenseDraft.wages.concat([emptyWageRow()]);
            renderWageRows();
            scheduleExpenseSave();
        });
    }
    const addOtherBtn = document.getElementById('addOtherExpenseBtn');
    if (addOtherBtn) {
        addOtherBtn.addEventListener('click', function () {
            if (expensePageType() !== 'daily' || !expenseDraft) return;
            expenseDraft.other = (expenseDraft.other || []).concat([emptyOtherExpenseRow()]);
            renderOtherExpenseRows();
            scheduleExpenseSave();
        });
    }
    form.addEventListener('click', function (event) {
        const wageBtn = event.target.closest('[data-remove-wage]');
        if (wageBtn && expensePageType() === 'daily' && expenseDraft) {
            const wageId = wageBtn.getAttribute('data-remove-wage');
            if (expenseDraft.wages.length < 2) return;
            expenseDraft.wages = expenseDraft.wages.filter(function (row) { return row.id !== wageId; });
            renderWageRows();
            scheduleExpenseSave();
            return;
        }
        const otherBtn = event.target.closest('[data-remove-other]');
        if (otherBtn && expensePageType() === 'daily' && expenseDraft) {
            const otherId = otherBtn.getAttribute('data-remove-other');
            expenseDraft.other = (expenseDraft.other || []).filter(function (row) { return row.id !== otherId; });
            renderOtherExpenseRows();
            scheduleExpenseSave();
        }
    });
    form.addEventListener('input', function (event) {
        if (expensePageType() !== 'daily' || !expenseDraft) return;
        const wageField = event.target.getAttribute('data-wage-field');
        const wageRow = event.target.closest('[data-wage-id]');
        if (wageField === 'worker' && wageRow) {
            const id = wageRow.getAttribute('data-wage-id');
            expenseDraft.wages = expenseDraft.wages.map(function (row) {
                if (row.id !== id) return row;
                return Object.assign({}, row, { worker: event.target.value });
            });
            scheduleExpenseSave();
            return;
        }
        const otherField = event.target.getAttribute('data-other-field');
        const otherRow = event.target.closest('[data-other-id]');
        if (otherField === 'item' && otherRow) {
            const id = otherRow.getAttribute('data-other-id');
            expenseDraft.other = (expenseDraft.other || []).map(function (row) {
                if (row.id !== id) return row;
                return Object.assign({}, row, { item: event.target.value });
            });
            scheduleExpenseSave();
        }
    });
    form.addEventListener('focusin', function (event) {
        if (expensePageType() !== 'daily' || !expenseDraft) return;
        const wageField = event.target.getAttribute('data-wage-field');
        const wageRow = event.target.closest('[data-wage-id]');
        if (wageField === 'amount' && wageRow) {
            const id = wageRow.getAttribute('data-wage-id');
            const row = expenseDraft.wages.filter(function (item) { return item.id === id; })[0];
            if (!row) return;
            event.target.value = row.formula || '';
            event.target.classList.remove('expense-error');
            return;
        }
        const otherField = event.target.getAttribute('data-other-field');
        const otherRow = event.target.closest('[data-other-id]');
        if (otherField === 'amount' && otherRow) {
            const id = otherRow.getAttribute('data-other-id');
            const row = (expenseDraft.other || []).filter(function (item) { return item.id === id; })[0];
            if (!row) return;
            event.target.value = row.formula || '';
            event.target.classList.remove('expense-error');
        }
    });
    form.addEventListener('input', function (event) {
        if (expensePageType() !== 'daily' || !expenseDraft) return;
        const wageField = event.target.getAttribute('data-wage-field');
        const wageRow = event.target.closest('[data-wage-id]');
        if (wageField === 'amount' && wageRow) {
            const id = wageRow.getAttribute('data-wage-id');
            const next = evaluateExpenseInput(event.target.value);
            expenseDraft.wages = expenseDraft.wages.map(function (row) {
                if (row.id !== id) return row;
                return Object.assign({}, row, next);
            });
            if (next.error) event.target.classList.add('expense-error');
            else event.target.classList.remove('expense-error');
            scheduleExpenseSave();
            return;
        }
        const otherField = event.target.getAttribute('data-other-field');
        const otherRow = event.target.closest('[data-other-id]');
        if (otherField === 'amount' && otherRow) {
            const id = otherRow.getAttribute('data-other-id');
            const next = evaluateExpenseInput(event.target.value);
            expenseDraft.other = (expenseDraft.other || []).map(function (row) {
                if (row.id !== id) return row;
                return Object.assign({}, row, next);
            });
            if (next.error) event.target.classList.add('expense-error');
            else event.target.classList.remove('expense-error');
            scheduleExpenseSave();
        }
    });
    form.addEventListener('focusout', function (event) {
        if (expensePageType() !== 'daily' || !expenseDraft) return;
        const wageField = event.target.getAttribute('data-wage-field');
        const wageRow = event.target.closest('[data-wage-id]');
        if (wageField === 'amount' && wageRow) {
            const id = wageRow.getAttribute('data-wage-id');
            const row = expenseDraft.wages.filter(function (item) { return item.id === id; })[0];
            if (!row) return;
            event.target.value = expenseInputDisplay(row, false);
            return;
        }
        const otherField = event.target.getAttribute('data-other-field');
        const otherRow = event.target.closest('[data-other-id]');
        if (otherField === 'amount' && otherRow) {
            const id = otherRow.getAttribute('data-other-id');
            const row = (expenseDraft.other || []).filter(function (item) { return item.id === id; })[0];
            if (!row) return;
            event.target.value = expenseInputDisplay(row, false);
        }
    });
    ['rent', 'fuel', 'transport', 'lunch'].forEach(function (field) {
        const input = form.querySelector('[data-expense-field="' + field + '"]');
        bindExpenseAmountInput(input, function () {
            return expenseDraft ? expenseDraft[field] : emptyExpenseLine();
        }, function (next) {
            if (!expenseDraft) return;
            expenseDraft[field] = next;
        });
    });
}

function initExpensesEntry() {
    if (!document.getElementById('expenseForm')) return;
    const file = currentExpenseFile();
    const type = expensePageType();
    if (!file) {
        if (!window.dbLiveReady) return;
        window.location.replace('profit-expense.html?type=' + encodeURIComponent(type));
        return;
    }
    const locked = type !== 'daily';
    const lines = collectExpenseLines(type, file.period);
    if (locked) {
        expenseDraft = {
            wages: lines.wageRows.length
                ? lines.wageRows.map(function (row, index) {
                    return {
                        id: 'rolled-' + index,
                        worker: row.worker,
                        formula: Number(row.amount || 0).toFixed(2),
                        amount: Number(row.amount) || 0
                    };
                })
                : [emptyWageRow()],
            rent: { formula: lines.rent.toFixed(2), amount: lines.rent },
            fuel: { formula: lines.fuel.toFixed(2), amount: lines.fuel },
            transport: { formula: lines.transport.toFixed(2), amount: lines.transport },
            lunch: { formula: lines.lunch.toFixed(2), amount: lines.lunch },
            other: (lines.otherRows || []).map(function (row, index) {
                return {
                    id: 'rolled-other-' + index,
                    item: row.item,
                    formula: Number(row.amount || 0).toFixed(2),
                    amount: Number(row.amount) || 0
                };
            })
        };
    } else {
        expenseDraft = effectiveDailyExpenses(file);
    }
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
        if (type === 'daily') {
            dateInput.type = 'date';
            dateInput.value = file.period || '';
        } else {
            dateInput.type = 'text';
            dateInput.value = dashboardRangeText(type, file.period) || displayFileLabel(type, file);
        }
    }
    const periodLabel = document.getElementById('expensePeriodLabel');
    if (periodLabel) {
        periodLabel.textContent = type === 'weekly' ? 'Week' : type === 'monthly' ? 'Month' : type === 'yearly' ? 'Year' : 'Date';
    }
    const wagesLabel = document.getElementById('expenseWagesLabel');
    if (wagesLabel) wagesLabel.textContent = periodSalesPrefix(type) + ' wages';
    const dateLabel = document.getElementById('expenseDateLabel');
    if (dateLabel) {
        dateLabel.textContent = locked
            ? 'Totals from daily expenses entry for this ' + periodSalesPrefix(type).toLowerCase() + ' period'
            : displayFileLabel('daily', file);
    }
    const title = document.getElementById('expenseTitle');
    if (title) title.textContent = expensesEntryLabel(type);
    const totalLabel = document.getElementById('expenseTotalLabel');
    if (totalLabel) totalLabel.textContent = periodSalesPrefix(type) + ' total expenses $';
    const back = document.getElementById('expenseBack');
    if (back) {
        let backHref = 'profit-expense.html?type=' + encodeURIComponent(type);
        if (file.id) backHref += '&id=' + encodeURIComponent(file.id);
        back.href = backHref;
        back.textContent = periodSalesPrefix(type) + ' profit and expense';
    }
    document.title = 'Prixburg - ' + expensesEntryLabel(type);
    const addBtn = document.getElementById('addWorkerBtn');
    if (addBtn) addBtn.style.display = locked ? 'none' : '';
    const addOtherBtn = document.getElementById('addOtherExpenseBtn');
    if (addOtherBtn) addOtherBtn.style.display = locked ? 'none' : '';
    renderWageRows();
    renderOtherExpenseRows();
    ['rent', 'fuel', 'transport', 'lunch'].forEach(function (field) {
        const input = document.querySelector('[data-expense-field="' + field + '"]');
        if (!input) return;
        input.readOnly = locked;
        input.value = locked
            ? Number(expenseDraft[field].amount || 0).toFixed(2)
            : expenseInputDisplay(expenseDraft[field], false);
    });
    updateExpenseTotalCard();
    bindExpenseForm();
    paintExpenseSync();
}

function daysOverdue(dateValue) {
    const sold = new Date(dateValue + 'T00:00:00');
    const today = new Date(localDateValue(new Date()) + 'T00:00:00');
    if (Number.isNaN(sold.getTime()) || Number.isNaN(today.getTime())) return 0;
    const n = Math.round((today.getTime() - sold.getTime()) / 86400000);
    return n > 0 ? n : 0;
}

const CREDIT_PAYMENTS_KEY = 'prixburgCreditPayments';

function creditCustomerKey(name) {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function loadCreditPayments() {
    const all = typeof dbPeek === 'function' ? dbPeek(CREDIT_PAYMENTS_KEY) : null;
    if (Array.isArray(all)) return all;
    if (typeof dbGet === 'function') {
        const stored = dbGet(CREDIT_PAYMENTS_KEY);
        if (Array.isArray(stored)) return stored;
    }
    return [];
}

function saveCreditPayments(list) {
    if (typeof dbSet !== 'function') return;
    dbSet(CREDIT_PAYMENTS_KEY, Array.isArray(list) ? list : []);
    notifyReportDataChanged('credit');
}

function creditDetergentLinesForCustomer(customerKey) {
    const map = {};
    (peekAllReportFiles().daily || []).forEach(function (file) {
        (file.salesRows || []).forEach(function (row) {
            if (normalizeSaleType(row.saleType) !== 'credit') return;
            if (!saleHasValue(row)) return;
            if ((row.source || '') === 'credit-payment') return;
            const key = creditCustomerKey(row.customer);
            if (key !== customerKey) return;
            const item = String(row.item || '').trim() || 'Untitled detergent';
            const itemKey = item.toLowerCase();
            if (!map[itemKey]) {
                map[itemKey] = {
                    item: item,
                    quantity: 0,
                    credit: 0,
                    teamLeader: String(row.teamLeader || '').trim()
                };
            }
            map[itemKey].quantity = round2(map[itemKey].quantity + (Number(row.quantity) || 0));
            map[itemKey].credit = round2(map[itemKey].credit + saleLineTotal(row));
            if (!map[itemKey].teamLeader && String(row.teamLeader || '').trim()) {
                map[itemKey].teamLeader = String(row.teamLeader).trim();
            }
        });
    });
    return Object.keys(map).map(function (key) { return map[key]; });
}

function postCreditPaymentCashSales(customer, paidAmount, paymentId, payDate) {
    const name = String(customer || '').trim() || 'Untitled customer';
    const key = creditCustomerKey(name);
    const lines = creditDetergentLinesForCustomer(key);
    const creditTotal = round2(lines.reduce(function (sum, line) {
        return sum + (Number(line.credit) || 0);
    }, 0));
    const paid = round2(paidAmount);
    if (!(paid > 0) || !(creditTotal > 0) || !lines.length) return;

    let allocated = 0;
    lines.forEach(function (line, index) {
        const isLast = index === lines.length - 1;
        const share = isLast
            ? round2(paid - allocated)
            : round2(paid * ((Number(line.credit) || 0) / creditTotal));
        allocated = round2(allocated + share);
        if (!(share > 0)) return;

        // qty = amount paid / whole credit owing × detergent quantity
        let qty = round2(paid * ((Number(line.quantity) || 0) / creditTotal));
        if (!(qty > 0) && share > 0) qty = round2(share);
        const unitPrice = qty > 0 ? round2(share / qty) : round2(share);
        saveSalesEntryRow({
            id: paymentId + '-sale-' + index,
            date: payDate,
            item: line.item,
            teamLeader: line.teamLeader || '',
            customer: name,
            unitPrice: unitPrice,
            quantity: qty,
            saleType: 'cash',
            source: 'credit-payment',
            creditPaymentId: paymentId
        });
    });
}

function addCreditPayment(customer, amount, formula) {
    const paid = round2(amount);
    if (!(paid > 0)) return false;
    const name = String(customer || '').trim() || 'Untitled customer';
    const key = creditCustomerKey(name);
    const balances = collectCreditCustomerBalances().filter(function (row) {
        return row.customerKey === key;
    })[0];
    const owing = balances ? round2(balances.balance) : 0;
    if (!(owing > 0)) return false;
    const apply = round2(Math.min(paid, owing));
    if (!(apply > 0)) return false;

    const paymentId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7);
    const payDate = localDateValue(new Date());
    const next = loadCreditPayments().slice();
    next.push({
        id: paymentId,
        customer: name,
        customerKey: key,
        amount: apply,
        formula: formula != null ? String(formula) : '',
        date: payDate,
        createdAt: new Date().toISOString()
    });
    saveCreditPayments(next);
    // Cash sales: qty = this payment / original credit × detergent qty (2 dp).
    postCreditPaymentCashSales(name, apply, paymentId, payDate);
    return true;
}

function creditPaidByCustomer() {
    const map = {};
    loadCreditPayments().forEach(function (row) {
        const key = row.customerKey || creditCustomerKey(row.customer);
        if (!key) return;
        map[key] = round2((Number(map[key]) || 0) + (Number(row.amount) || 0));
    });
    return map;
}

function creditPaidFormulaByCustomer() {
    const map = {};
    loadCreditPayments().forEach(function (row) {
        const key = row.customerKey || creditCustomerKey(row.customer);
        if (!key) return;
        if (row.formula != null && String(row.formula).trim()) {
            map[key] = String(row.formula).trim();
        }
    });
    return map;
}

function collectCreditCustomerBalances() {
    const map = {};
    (peekAllReportFiles().daily || []).forEach(function (file) {
        (file.salesRows || []).forEach(function (row) {
            if (normalizeSaleType(row.saleType) !== 'credit') return;
            if (!saleHasValue(row)) return;
            const customer = String(row.customer || '').trim() || 'Untitled customer';
            const key = creditCustomerKey(customer);
            if (!map[key]) {
                map[key] = {
                    customer: customer,
                    customerKey: key,
                    credit: 0,
                    paid: 0,
                    balance: 0,
                    firstDate: file.period || '',
                    lastDate: file.period || ''
                };
            }
            map[key].credit += saleLineTotal(row);
            if (String(row.customer || '').trim()) map[key].customer = String(row.customer).trim();
            if (file.period && (!map[key].firstDate || file.period < map[key].firstDate)) {
                map[key].firstDate = file.period;
            }
            if (file.period && (!map[key].lastDate || file.period > map[key].lastDate)) {
                map[key].lastDate = file.period;
            }
        });
    });
    const paidMap = creditPaidByCustomer();
    const formulaMap = creditPaidFormulaByCustomer();
    return Object.keys(map).map(function (key) {
        const row = map[key];
        row.credit = round2(row.credit);
        row.paid = round2(paidMap[key] || 0);
        row.balance = round2(Math.max(0, row.credit - row.paid));
        row.formula = formulaMap[key] || '';
        row.daysOverdue = row.balance > 0 ? daysOverdue(row.firstDate) : 0;
        row.amount = row.balance;
        row.date = row.firstDate;
        return row;
    }).sort(function (a, b) {
        if (b.balance !== a.balance) return b.balance - a.balance;
        if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
        return String(a.customer).localeCompare(String(b.customer));
    });
}

function collectCreditSales() {
    return collectCreditCustomerBalances();
}

function creditCustomerCount(rows) {
    return (rows || []).filter(function (row) {
        return (Number(row.balance != null ? row.balance : row.amount) || 0) > 0;
    }).length;
}

function creditTotals(rows) {
    const list = rows || collectCreditCustomerBalances();
    const totals = list.reduce(function (sum, row) {
        sum.credit += Number(row.credit) || 0;
        sum.paid += Number(row.paid) || 0;
        sum.balance += Number(row.balance) || 0;
        return sum;
    }, { credit: 0, paid: 0, balance: 0 });
    return {
        credit: round2(totals.credit),
        paid: round2(totals.paid),
        balance: round2(totals.balance)
    };
}

function creditSearchQuery() {
    const input = document.getElementById('creditSearch');
    return input ? String(input.value || '').trim().toLowerCase() : '';
}

function filterCreditRows(rows) {
    const q = creditSearchQuery();
    if (!q) return rows || [];
    return (rows || []).filter(function (row) {
        const hay = [
            row.customer,
            row.credit,
            row.paid,
            row.balance,
            row.firstDate,
            row.lastDate
        ].join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
    });
}

function ceoPeriods() {
    return [
        ['daily', 'Today'],
        ['weekly', 'This week'],
        ['monthly', 'This month'],
        ['yearly', 'This year']
    ];
}

function grossProfitTotals(type, period) {
    let cost = 0;
    let expectedSales = 0;
    let gross = 0;
    productionsForDashboard(type, period).forEach(function (row) {
        cost += Number(row.cost) || 0;
        expectedSales += Number(row.production) || 0;
        gross += Number(row.totalSales) || 0;
    });
    return { cost: cost, expectedSales: expectedSales, gross: gross };
}

function initCeoNetProfit() {
    const body = document.getElementById('ceoNetBody');
    if (!body) return;
    const rows = ceoPeriods().map(function (pair) {
        const totals = profitExpenseTotals(pair[0], defaultPeriodValue(pair[0]));
        return {
            label: pair[1],
            sales: totals.sales,
            expenses: totals.expenses,
            profit: totals.profit
        };
    });
    const creditTotal = creditTotals().balance;
    const today = rows[0] || { sales: 0, expenses: 0, profit: 0 };
    renderSalesCards([
        { label: 'Today total sales $', value: today.sales },
        { label: 'Today total expenses $', value: today.expenses },
        { label: 'Today net profit $', value: today.profit },
        { label: 'Outstanding credit $', value: creditTotal }
    ]);
    body.innerHTML = rows.map(function (row) {
        return '<tr>'
            + '<td>' + escapeHtml(row.label) + '</td>'
            + '<td>' + moneyText(row.sales) + '</td>'
            + '<td>' + moneyText(row.expenses) + '</td>'
            + '<td>' + moneyText(row.profit) + '</td>'
            + '</tr>';
    }).join('');
    document.title = 'Prixburg - CEO Net Profit';
}

function initCeoGrossProfit() {
    const body = document.getElementById('ceoGrossBody');
    if (!body) return;
    const rows = ceoPeriods().map(function (pair) {
        const totals = grossProfitTotals(pair[0], defaultPeriodValue(pair[0]));
        return {
            label: pair[1],
            expectedSales: totals.expectedSales,
            cost: totals.cost,
            gross: totals.gross
        };
    });
    const today = rows[0] || { expectedSales: 0, cost: 0, gross: 0 };
    renderSalesCards([
        { label: 'Today expected sales $', value: today.expectedSales },
        { label: 'Today cost of raw materials $', value: today.cost },
        { label: 'Today expected gross profit $', value: today.gross }
    ]);
    body.innerHTML = rows.map(function (row) {
        return '<tr>'
            + '<td>' + escapeHtml(row.label) + '</td>'
            + '<td>' + moneyText(row.expectedSales) + '</td>'
            + '<td>' + moneyText(row.cost) + '</td>'
            + '<td>' + moneyText(row.gross) + '</td>'
            + '</tr>';
    }).join('');
    document.title = 'Prixburg - CEO Gross Profit';
}

function initCeoAnalysis() {
    initCeoNetProfit();
    initCeoGrossProfit();
}

function finishedProductStockRows() {
    const map = {};
    (peekAllReportFiles().daily || []).forEach(function (file) {
        (file.productions || []).forEach(function (row) {
            const name = String(row.detergent || row.product || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!map[key]) {
                map[key] = {
                    name: name,
                    unit: row.unit || '',
                    produced: 0,
                    sold: 0
                };
            }
            map[key].produced += Number(row.quantity) || 0;
            if (!map[key].unit && row.unit) map[key].unit = row.unit;
        });
        (file.salesRows || []).forEach(function (row) {
            if (!saleHasValue(row)) return;
            // Credit repayments already counted when the original credit sale was entered.
            if ((row.source || '') === 'credit-payment') return;
            const name = String(row.item || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!map[key]) {
                map[key] = {
                    name: name,
                    unit: '',
                    produced: 0,
                    sold: 0
                };
            }
            map[key].sold = round2(map[key].sold + (Number(row.quantity) || 0));
        });
    });
    return Object.keys(map).map(function (key) {
        const row = map[key];
        const qty = Math.max(0, (Number(row.produced) || 0) - (Number(row.sold) || 0));
        const unitPrice = cachedSellingUnitPrice(row.name);
        return {
            name: row.name,
            unit: row.unit || '',
            produced: Number(row.produced) || 0,
            sold: Number(row.sold) || 0,
            quantity: qty,
            value: qty * (Number(unitPrice) || 0)
        };
    }).filter(function (row) {
        return row.produced > 0;
    }).sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
    });
}

function initFinishedProducts() {
    const body = document.getElementById('finishedBody');
    if (!body) return;
    const cards = document.getElementById('salesCards');
    if (cards) {
        cards.innerHTML = '';
        cards.style.display = 'none';
    }
    const rows = finishedProductStockRows();
    body.innerHTML = rows.map(function (row) {
        return '<tr>'
            + '<td>' + escapeHtml(row.name) + '</td>'
            + '<td>' + escapeHtml(row.unit || '') + '</td>'
            + '<td>' + qtyText(row.quantity) + '</td>'
            + '<td>' + moneyText(row.value) + '</td>'
            + '</tr>';
    }).join('');
    const empty = document.getElementById('finishedEmpty');
    if (empty) empty.style.display = rows.length ? 'none' : 'block';
    document.title = 'Prixburg - Finished products';
}

function renderCreditDashboardRows(rows) {
    const body = document.getElementById('creditBody');
    if (!body) return;
    const shown = filterCreditRows(rows);
    body.innerHTML = shown.map(function (row) {
        return '<tr>'
            + '<td>' + escapeHtml(row.customer) + '</td>'
            + '<td>' + moneyText(round2(row.credit)) + '</td>'
            + '<td>' + moneyText(round2(row.paid)) + '</td>'
            + '<td>' + moneyText(round2(row.balance)) + '</td>'
            + '<td>' + escapeHtml(fileDisplayLabel('daily', row.firstDate)) + '</td>'
            + '<td>' + String(row.daysOverdue) + '</td>'
            + '</tr>';
    }).join('');
    const empty = document.getElementById('creditEmpty');
    if (empty) {
        empty.style.display = shown.length ? 'none' : 'block';
        empty.textContent = rows.length && !shown.length
            ? 'No customers match that search.'
            : 'No outstanding credit yet.';
    }
}

function bindCreditSearch() {
    const input = document.getElementById('creditSearch');
    if (!input || input._creditSearchBound) return;
    input._creditSearchBound = true;
    input.addEventListener('input', function () {
        if (document.getElementById('creditEntryBody')) initOutstandingCreditEntry();
        else if (document.getElementById('creditBody')) renderCreditDashboardRows(collectCreditCustomerBalances());
    });
}

function initOutstandingCredit() {
    const body = document.getElementById('creditBody');
    if (!body) return;
    const rows = collectCreditCustomerBalances();
    const totals = creditTotals(rows);
    const customers = creditCustomerCount(rows);
    renderSalesCards([
        { label: 'Total credit sales $', value: totals.credit },
        { label: 'Paid so far $', value: totals.paid },
        { label: 'Outstanding credit $', value: totals.balance },
        { label: 'Customers with credit', value: customers, plain: true }
    ]);
    bindCreditSearch();
    renderCreditDashboardRows(rows);
    document.title = 'Prixburg - Outstanding credit report';
}

function creditPaidDisplay(paid) {
    return round2(paid).toFixed(2);
}

function renderCreditEntryRows(rows) {
    const body = document.getElementById('creditEntryBody');
    if (!body) return;
    const shown = filterCreditRows(rows);
    body.innerHTML = shown.map(function (row) {
        const canPay = round2(row.balance) > 0;
        const paidText = creditPaidDisplay(row.paid);
        const formula = String(row.formula || '').trim();
        return '<tr data-credit-customer="' + escapeHtml(row.customer) + '" data-credit-paid="' + escapeHtml(paidText) + '">'
            + '<td>' + escapeHtml(row.customer) + '</td>'
            + '<td>' + moneyText(row.credit) + '</td>'
            + '<td>'
            + (canPay
                ? '<input class="credit-pay-input" data-credit-pay type="text" inputmode="decimal" value="' + escapeHtml(paidText) + '" data-paid="' + escapeHtml(paidText) + '" data-formula="' + escapeHtml(formula) + '" aria-label="Paid so far for ' + escapeHtml(row.customer) + '">'
                : '<span class="credit-paid-bold">' + moneyText(row.paid) + '</span>')
            + '</td>'
            + '<td>' + moneyText(row.balance) + '</td>'
            + '</tr>';
    }).join('');
    const empty = document.getElementById('creditEntryEmpty');
    if (empty) {
        empty.style.display = shown.length ? 'none' : 'block';
        empty.textContent = rows.length && !shown.length
            ? 'No customers match that search.'
            : 'No credit customers yet. Credit sales from Sales entry appear here.';
    }
}

function commitCreditPaymentInput(input) {
    if (!input) return;
    const row = input.closest('[data-credit-customer]');
    if (!row) return;
    const customer = row.getAttribute('data-credit-customer') || '';
    const oldPaid = round2(input.getAttribute('data-paid') || row.getAttribute('data-credit-paid') || 0);
    const raw = String(input.value || '').trim();
    if (!raw) {
        input.value = creditPaidDisplay(oldPaid);
        input.classList.remove('expense-error');
        return;
    }
    const parsed = typeof evaluateExpenseInput === 'function'
        ? evaluateExpenseInput(raw)
        : { formula: raw, amount: Number(raw), error: !Number.isFinite(Number(raw)) };
    if (parsed && parsed.error) {
        input.classList.add('expense-error');
        return;
    }
    const newTotal = round2(parsed.amount);
    if (newTotal < 0) {
        input.classList.add('expense-error');
        return;
    }
    const delta = round2(newTotal - oldPaid);
    input.classList.remove('expense-error');
    if (delta === 0) {
        input.setAttribute('data-formula', parsed.formula || raw);
        input.value = creditPaidDisplay(oldPaid);
        return;
    }
    if (delta < 0) {
        // Do not reverse posted cash sales from here — only additions.
        input.classList.add('expense-error');
        input.value = creditPaidDisplay(oldPaid);
        return;
    }
    if (!addCreditPayment(customer, delta, parsed.formula || raw)) {
        input.classList.add('expense-error');
        input.value = creditPaidDisplay(oldPaid);
        return;
    }
    initOutstandingCreditEntry();
}

function bindCreditEntryForm() {
    const body = document.getElementById('creditEntryBody');
    if (!body || body._creditEntryBound) return;
    body._creditEntryBound = true;
    body.addEventListener('focusin', function (event) {
        const input = event.target.closest('[data-credit-pay]');
        if (!input) return;
        const formula = String(input.getAttribute('data-formula') || '').trim();
        const paid = String(input.getAttribute('data-paid') || '0');
        input.value = formula || paid;
        input.classList.remove('expense-error');
        try { input.select(); } catch (err) { /* ignore */ }
    });
    body.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        const input = event.target.closest('[data-credit-pay]');
        if (!input) return;
        event.preventDefault();
        commitCreditPaymentInput(input);
        input.blur();
    });
    body.addEventListener('focusout', function (event) {
        const input = event.target.closest('[data-credit-pay]');
        if (!input) return;
        commitCreditPaymentInput(input);
    });
}

function initOutstandingCreditEntry() {
    const body = document.getElementById('creditEntryBody');
    if (!body) return;
    const rows = collectCreditCustomerBalances();
    const totals = creditTotals(rows);
    const customers = creditCustomerCount(rows);
    renderSalesCards([
        { label: 'Total credit sales $', value: totals.credit },
        { label: 'Paid so far $', value: totals.paid },
        { label: 'Outstanding credit $', value: totals.balance },
        { label: 'Customers with credit', value: customers, plain: true }
    ]);
    bindCreditSearch();
    bindCreditEntryForm();
    renderCreditEntryRows(rows);
    document.title = 'Prixburg - Outstanding credit entry';
}

function initReports() {
    clearReportCalcMemo();
    bindCreateDailyFileModal();
    bindLiveReportRefresh();
    renderReportFiles();
    renderDashboard();
    initProductionEntry();
    initExpensesEntry();
    initOutstandingCredit();
    initOutstandingCreditEntry();
    initCeoAnalysis();
    initFinishedProducts();
    scheduleEnsurePeriodFiles();
}

whenDbReady(initReports);

window.addEventListener('pageshow', function (event) {
    if (event.persisted) initReports();
    else if (document.getElementById('dashboardBody') || document.getElementById('finishedBody')) {
        refreshLiveReportViews();
    }
});

window.addEventListener('pagehide', function () {
    flushExpenseSave();
});
window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushExpenseSave();
});
