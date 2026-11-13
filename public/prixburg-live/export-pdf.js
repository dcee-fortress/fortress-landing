function pdfEscape(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function pdfMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0.00';
    return '$' + n.toFixed(2);
}

function pdfTable(headers, rows) {
    const head = '<tr>' + headers.map(function (h) {
        return '<th>' + pdfEscape(h) + '</th>';
    }).join('') + '</tr>';
    const body = (rows || []).map(function (row) {
        return '<tr>' + row.map(function (cell) {
            return '<td>' + pdfEscape(cell) + '</td>';
        }).join('') + '</tr>';
    }).join('');
    if (!(rows || []).length) {
        return '<p>No data to export.</p>';
    }
    return '<table><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
}

function openPdfPreview(title, bodyHtml) {
    const win = window.open('', '_blank');
    if (!win) {
        window.print();
        return;
    }
    win.document.open();
    win.document.write(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
        pdfEscape(title) +
        '</title><style>' +
        'body{font-family:Calibri,Arial,sans-serif;color:#111;padding:24px;margin:0;}' +
        'h1{font-size:20px;margin:0 0 6px;}' +
        '.meta{color:#555;margin:0 0 18px;font-size:13px;}' +
        'table{width:100%;border-collapse:collapse;}' +
        'th,td{border:1px solid #d4d4d8;padding:8px;text-align:left;font-size:13px;}' +
        'th{background:#f4f4f5;}' +
        'p{font-size:14px;}' +
        '@media print{body{padding:0;}}' +
        '</style></head><body>' +
        '<h1>' + pdfEscape(title) + '</h1>' +
        '<p class="meta">Prixburg · ' + pdfEscape(new Date().toLocaleString()) + '</p>' +
        bodyHtml +
        '</body></html>'
    );
    win.document.close();
    win.focus();
    win.onafterprint = function () {
        win.close();
    };
    setTimeout(function () {
        win.print();
    }, 250);
}

function exportFormulasListPdf() {
    const files = typeof loadFormulas === 'function' ? loadFormulas() : [];
    const rows = files.map(function (file) {
        const totals = typeof formulaTotals === 'function' ? formulaTotals(file) : {};
        const rate = totals.rate == null ? '—' : pdfMoney(totals.rate);
        return [
            file.name || '',
            String(file.production || 0),
            rate,
            file.createdAt ? new Date(file.createdAt).toLocaleString() : ''
        ];
    });
    openPdfPreview('Detergent formulars', pdfTable(['Detergent', 'Amount produced', 'Rate', 'Created'], rows));
}

function exportFormulaDetailPdf() {
    const id = typeof getFormulaIdFromUrl === 'function' ? getFormulaIdFromUrl() : '';
    const file = typeof getFormula === 'function' ? getFormula(id) : null;
    if (!file) {
        openPdfPreview('Detergent formulars', '<p>No detergent file to export.</p>');
        return;
    }
    const totals = typeof formulaTotals === 'function' ? formulaTotals(file) : {};
    const rows = (file.ingredients || []).map(function (row) {
        const total = typeof ingredientTotal === 'function'
            ? ingredientTotal(row)
            : (parseFloat(row.amount) || 0) * (parseFloat(row.unitPrice) || 0);
        return [
            row.name || '',
            row.unit || '',
            String(row.amount || 0),
            pdfMoney(row.unitPrice),
            pdfMoney(total)
        ];
    });
    const extra = '<p>Amount produced: ' + pdfEscape(file.production) +
        ' · Rate: ' + pdfEscape(totals.rate == null ? '—' : pdfMoney(totals.rate)) + '</p>';
    openPdfPreview(
        'Detergent formulars · ' + (file.name || 'Detergent'),
        extra + pdfTable(['Ingredient', 'Unit', 'Quantity', 'Unit price', 'Total cost'], rows)
    );
}

function exportPricingPdf() {
    const rows = (typeof loadPricing === 'function' ? loadPricing() : []).map(function (row) {
        const unitPrice = typeof pricingUnitPrice === 'function' ? pricingUnitPrice(row) : 0;
        return [
            row.name || '',
            row.unit || '',
            String(row.quantity || 0),
            pdfMoney(row.price),
            pdfMoney(unitPrice)
        ];
    });
    openPdfPreview('Pricing files', pdfTable(['Detergent', 'Unit', 'Quantity', 'Price', 'Unit price'], rows));
}

function exportDashboardPdf() {
    const titleEl = document.getElementById('dashboardTitle');
    const title = (titleEl && titleEl.textContent ? titleEl.textContent : 'Report') + ' dashboard';
    const current = typeof dashboardFile === 'function' ? dashboardFile() : null;
    const type = (current && current.type) || document.body.getAttribute('data-report-type') || 'daily';
    const period = current && current.file ? current.file.period : '';
    const cards = document.getElementById('salesCards');
    const cardHtml = cards && cards.style.display !== 'none'
        ? '<div class="meta">' + Array.prototype.map.call(cards.querySelectorAll('.sales-card'), function (card) {
            const label = card.querySelector('h3');
            const value = card.querySelector('.rate-value');
            return pdfEscape((label && label.textContent) || '') + ': ' + pdfEscape((value && value.textContent) || '');
        }).join(' · ') + '</div>'
        : '';

    if (typeof isSalesEntryView === 'function' && current && isSalesEntryView(current)) {
        const rows = (current.file.salesRows || []).map(function (row) {
            const kind = row.saleType === 'credit' ? 'Credit' : 'Cash';
            return [
                kind,
                row.item || '',
                row.teamLeader || '',
                row.customer || '',
                pdfMoney(row.unitPrice),
                String(row.quantity || 0),
                pdfMoney(typeof saleLineTotal === 'function' ? saleLineTotal(row) : 0)
            ];
        });
        openPdfPreview(
            title,
            cardHtml + pdfTable(
                ['Sale type', 'Detergent name', 'Team leader', 'Customer name', 'Unit price', 'Quantity of detergent sold', 'Total sales'],
                rows
            )
        );
        return;
    }

    if (typeof getReportMode === 'function' && getReportMode() === 'profit-expense'
        && current && current.file) {
        openPdfPreview(title, cardHtml || '<p>No data to export.</p>');
        return;
    }

    if (typeof isSalesAnalysisView === 'function' && current && isSalesAnalysisView(current)
        && typeof collectSalesRows === 'function' && typeof aggregateSalesAnalysis === 'function') {
        const rows = aggregateSalesAnalysis(collectSalesRows(type, period)).map(function (row) {
            return [
                row.product || '',
                String(row.cashQty || 0),
                pdfMoney(row.cashSales),
                String(row.creditQty || 0),
                pdfMoney(row.creditSales),
                pdfMoney(row.totalSales)
            ];
        });
        openPdfPreview(
            title,
            cardHtml + pdfTable(
                ['Detergent', 'Cash sales quantity', 'Cash sales $', 'Credit sales quantity', 'Credit sales $', 'Total sales $'],
                rows
            )
        );
        return;
    }

    const rows = (typeof aggregateDashboardRows === 'function' && typeof productionsForDashboard === 'function')
        ? aggregateDashboardRows(productionsForDashboard(type, period))
        : [];
    const tableRows = rows.map(function (row) {
        return [
            row.product || '',
            pdfMoney(row.cost),
            pdfMoney(row.production),
            pdfMoney(row.totalSales)
        ];
    });
    openPdfPreview(
        title,
        pdfTable(['Detergent', 'Cost of raw materials', 'Expected sales', 'Expected gross profit'], tableRows)
    );
}

function exportReportFilesPdf() {
    const type = typeof getReportType === 'function' ? getReportType() : 'daily';
    const files = (typeof loadAllReportFiles === 'function' ? loadAllReportFiles()[type] : []) || [];
    const rows = files.slice().reverse().map(function (file) {
        const label = typeof fileDisplayLabel === 'function' ? fileDisplayLabel(type, file.period) : (file.label || file.period);
        const status = typeof fileStatusCostLine === 'function' ? fileStatusCostLine(type, file) : '';
        return [label, file.period || '', status];
    });
    const names = { daily: 'Daily report', weekly: 'Weekly report', monthly: 'Monthly report', yearly: 'Yearly report' };
    openPdfPreview(names[type] || 'Report files', pdfTable(['File', 'Period', 'Status'], rows));
}

function exportStoreroomPdf() {
    let materials = typeof loadMaterials === 'function' ? loadMaterials() : [];
    if (typeof recomputeQuantities === 'function') materials = recomputeQuantities(materials);
    const rows = materials.map(function (row) {
        const qty = Number(row.quantity || 0);
        const unitCost = Number(row.unitCost || 0);
        return [
            row.date || '',
            row.name || '',
            row.unit || '',
            String(qty),
            pdfMoney(unitCost),
            pdfMoney(qty * unitCost)
        ];
    });
    const total = materials.reduce(function (sum, row) {
        return sum + (Number(row.quantity || 0) * Number(row.unitCost || 0));
    }, 0);
    openPdfPreview(
        'Raw materials storeroom',
        '<p>Storeroom total: ' + pdfEscape(pdfMoney(total)) + '</p>' +
        pdfTable(['Date', 'Material', 'Unit', 'Quantity', 'Unit Price', 'Total Cost'], rows)
    );
}

function exportMovementsPdf() {
    const batches = typeof loadMovements === 'function' ? loadMovements().slice().reverse() : [];
    const rows = batches.map(function (batch) {
        const when = batch.at ? new Date(batch.at).toLocaleString() : '';
        if (batch.type === 'purchase') {
            return [
                'Purchase',
                when,
                '+' + Number(batch.quantity || 0).toFixed(2) + ' ' + (batch.unit || '') + ' ' + (batch.material || ''),
                Number(batch.remainingMaterial || 0).toFixed(2) + ' ' + (batch.unit || '') + ' left'
            ];
        }
        const used = typeof usedMaterialsText === 'function' ? usedMaterialsText(batch.used) : '';
        return [
            'Production',
            when,
            (batch.product || '') + ' ' + String(batch.productQty || '') + ' ' + (batch.productUnit || '') + ' · used ' + used,
            batch.remainingStock || ''
        ];
    });
    openPdfPreview(
        'Raw material movements history',
        pdfTable(['Type', 'Time', 'Details', 'Remaining'], rows)
    );
}

function exportExpensesPdf() {
    const dateInput = document.getElementById('expenseDate');
    const period = dateInput ? dateInput.value : '';
    const wages = [];
    Array.prototype.forEach.call(document.querySelectorAll('#wageRows .wage-row'), function (row) {
        const worker = row.querySelector('[data-wage-field="worker"]');
        const amount = row.querySelector('[data-wage-field="amount"]');
        wages.push([
            (worker && worker.value) || '',
            (amount && amount.value) || ''
        ]);
    });
    const lines = [
        ['Cost of raw materials', (document.getElementById('expenseMaterials') && document.getElementById('expenseMaterials').value) || ''],
        ['Rent', (document.getElementById('expenseRent') && document.getElementById('expenseRent').value) || ''],
        ['Fuel delivery', (document.getElementById('expenseFuel') && document.getElementById('expenseFuel').value) || ''],
        ['Transport allowance', (document.getElementById('expenseTransport') && document.getElementById('expenseTransport').value) || ''],
        ['Lunch cash', (document.getElementById('expenseLunch') && document.getElementById('expenseLunch').value) || '']
    ];
    const total = document.getElementById('expenseTotalCard');
    openPdfPreview(
        'Expenses entry' + (period ? ' · ' + period : ''),
        '<p>Total expenses: ' + pdfEscape((total && total.textContent) || '$0.00') + '</p>' +
        pdfTable(['Worker', 'Daily wage $'], wages) +
        pdfTable(['Expense', 'Amount $'], lines)
    );
}

function exportOutstandingCreditPdf() {
    const rows = typeof collectCreditCustomerBalances === 'function'
        ? collectCreditCustomerBalances()
        : (typeof collectCreditSales === 'function' ? collectCreditSales() : []);
    const tableRows = rows.map(function (row) {
        return [
            row.customer || '',
            pdfMoney(row.credit != null ? row.credit : row.amount),
            pdfMoney(row.paid || 0),
            pdfMoney(row.balance != null ? row.balance : row.amount),
            row.firstDate || row.date || '',
            String(row.daysOverdue || 0)
        ];
    });
    const cards = document.getElementById('salesCards');
    const cardHtml = cards && cards.style.display !== 'none'
        ? '<div class="meta">' + Array.prototype.map.call(cards.querySelectorAll('.sales-card'), function (card) {
            const label = card.querySelector('h3');
            const value = card.querySelector('.rate-value');
            return pdfEscape((label && label.textContent) || '') + ': ' + pdfEscape((value && value.textContent) || '');
        }).join(' · ') + '</div>'
        : '';
    const title = document.getElementById('creditEntryBody')
        ? 'Outstanding credit entry'
        : 'Outstanding credit report';
    openPdfPreview(
        title,
        cardHtml + pdfTable(
            ['Customer', 'Credit sales $', 'Paid so far $', 'Balance owed $', 'First credit date', 'Days overdue'],
            tableRows
        )
    );
}

function exportPagePdf() {
    if (document.getElementById('expenseForm')) {
        exportExpensesPdf();
        return;
    }
    if (document.getElementById('creditTable') || document.getElementById('creditEntryTable')) {
        exportOutstandingCreditPdf();
        return;
    }
    if (document.getElementById('formulaTable')) {
        exportFormulaDetailPdf();
        return;
    }
    if (document.getElementById('formulasList')) {
        exportFormulasListPdf();
        return;
    }
    if (document.getElementById('pricingTable')) {
        exportPricingPdf();
        return;
    }
    if (document.getElementById('dashboardTable')) {
        exportDashboardPdf();
        return;
    }
    if (document.getElementById('storeroomTable')) {
        exportStoreroomPdf();
        return;
    }
    if (document.getElementById('movementsList')) {
        exportMovementsPdf();
        return;
    }
    if (document.getElementById('reportFiles')) {
        exportReportFilesPdf();
        return;
    }
    window.print();
}
