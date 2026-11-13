(function () {
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

    function readSnap(key) {
        try {
            const raw = sessionStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    function paintDashboard() {
        const body = document.getElementById('dashboardBody');
        if (!body || body.rows.length) return;
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) return;
        const snap = readSnap('prixburgDash:' + id);
        if (!snap) return;
        const title = document.getElementById('dashboardTitle');
        if (title && snap.label) title.textContent = snap.label;
        const rows = snap.rows || [];
        if (!rows.length) return;
        if (rows[0] && (rows[0].saleType || (rows[0].item != null && rows[0].customer != null))) return;
        if (rows[0] && rows[0].item != null && rows[0].amount != null && rows[0].totalExpenses == null && rows[0].cashSales == null && rows[0].cost == null) {
            const head = document.getElementById('dashboardHead');
            if (head) {
                head.innerHTML = '<tr><th>Item</th><th>Amount</th></tr>';
            }
            body.innerHTML = rows.map(function (row) {
                return '<tr>'
                    + '<td>' + escapeHtml(row.item || '') + '</td>'
                    + '<td>$' + Number(row.amount || 0).toFixed(2) + '</td>'
                    + '</tr>';
            }).join('');
        } else if (rows[0] && rows[0].totalExpenses != null) {
            const head = document.getElementById('dashboardHead');
            if (head) {
                head.innerHTML = '<tr><th>Total sales</th><th>Total Expenses</th><th>Total net profit</th></tr>';
            }
            body.innerHTML = rows.map(function (row) {
                return '<tr>'
                    + '<td>$' + Number(row.totalSales || 0).toFixed(2) + '</td>'
                    + '<td>$' + Number(row.totalExpenses || 0).toFixed(2) + '</td>'
                    + '<td>$' + Number(row.netProfit || 0).toFixed(2) + '</td>'
                    + '</tr>';
            }).join('');
        } else if (rows[0] && rows[0].cashSales != null) {
            const head = document.getElementById('dashboardHead');
            if (head) {
                head.innerHTML = '<tr><th>Detergent</th><th>Cash sales quantity</th><th>Cash sales $</th><th>Credit sales quantity</th><th>Credit sales $</th><th>Total sales $</th></tr>';
            }
            body.innerHTML = rows.map(function (row) {
                return '<tr>'
                    + '<td>' + escapeHtml(row.product || row.detergent || '') + '</td>'
                    + '<td>' + Number(row.cashQty || 0) + '</td>'
                    + '<td>$' + Number(row.cashSales || 0).toFixed(2) + '</td>'
                    + '<td>' + Number(row.creditQty || 0) + '</td>'
                    + '<td>$' + Number(row.creditSales || 0).toFixed(2) + '</td>'
                    + '<td>$' + Number(row.totalSales || 0).toFixed(2) + '</td>'
                    + '</tr>';
            }).join('');
        } else {
            body.innerHTML = rows.map(function (row) {
                return '<tr>'
                    + '<td>' + escapeHtml(row.product || row.detergent || '') + '</td>'
                    + '<td>$' + Number(row.cost || 0).toFixed(2) + '</td>'
                    + '<td>$' + Number(row.production || 0).toFixed(2) + '</td>'
                    + '<td>$' + Number(row.totalSales || 0).toFixed(2) + '</td>'
                    + '</tr>';
            }).join('');
        }
        const empty = document.getElementById('dashboardEmpty');
        if (empty) empty.style.display = 'none';
        if (snap.label) document.title = 'Prixburg - ' + snap.label;
    }

    function paintFiles() {
        const list = document.getElementById('reportFiles');
        if (!list || list.children.length) return;
        const type = document.body.getAttribute('data-report-type') || 'daily';
        const mode = document.body.getAttribute('data-report-mode') || '';
        const files = readSnap('prixburgFiles:' + type);
        if (!files || !files.length) return;
        list.innerHTML = files.map(function (file) {
            let href = file.href || ('report-dashboard.html?type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(file.id));
            if (mode && href.indexOf('mode=') === -1) href += '&mode=' + encodeURIComponent(mode);
            const deleteBtn = mode
                ? ''
                : '<button type="button" class="app-file-bin" title="Delete" onclick="deleteSavedFile(\'' + type + '\',\'' + String(file.id || '').replace(/'/g, '') + '\')">' + binIcon() + '</button>';
            return '<div class="app-file-row" data-file-id="' + escapeHtml(file.id) + '">'
                + '<a class="app-file-icon" href="' + href + '" aria-hidden="true">' + fileRowIcon() + '</a>'
                + '<a class="app-file-name-block" href="' + href + '">'
                + '<span class="app-file-label">' + escapeHtml(file.label) + '</span>'
                + '<span class="app-file-sub">' + escapeHtml(file.sub) + '</span>'
                + '</a>'
                + '<span class="app-file-pill">' + escapeHtml(file.status) + '</span>'
                + deleteBtn
                + '</div>';
        }).join('');
        const empty = document.getElementById('reportEmpty');
        if (empty) empty.style.display = 'none';
    }

    paintDashboard();
    paintFiles();
})();
