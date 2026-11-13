(function () {
    const allowed = ['daily', 'weekly', 'monthly', 'yearly'];
    let type = new URLSearchParams(window.location.search).get('type') || 'daily';
    if (allowed.indexOf(type) === -1) type = 'daily';
    document.body.setAttribute('data-report-type', type);

    const mode = document.body.getAttribute('data-report-mode') || '';
    const period = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[type];
    const suffix = mode === 'profit-expense' ? 'profit and expense'
        : mode === 'production' ? 'production report'
        : mode === 'sales-entry' ? 'sales entry'
        : 'sales analysis';
    const label = period + ' ' + suffix;
    document.title = 'Prixburg - ' + label;
    const title = document.getElementById('filesTitle');
    if (title) title.textContent = label;
    const empty = document.getElementById('reportEmpty');
    if (empty) empty.textContent = 'No ' + type + ' files yet.';
}());
