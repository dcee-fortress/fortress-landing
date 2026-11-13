const PRICING_KEY = 'prixburgPricing';

function loadPricing() {
    return dbGet(PRICING_KEY);
}

function savePricing(rows) {
    dbSet(PRICING_KEY, rows);
}

function pricingUnitPrice(row) {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.price) || 0;
    return qty > 0 ? price / qty : 0;
}

function sellingUnitPriceFor(name) {
    const rows = loadPricing();
    const row = typeof bestNameMatch === 'function'
        ? bestNameMatch(name, rows, function (item) { return item.name; })
        : rows.find(function (item) {
            return String(item.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase();
        });
    return row ? pricingUnitPrice(row) : 0;
}

function addPricingRow() {
    const rows = loadPricing();
    rows.push({
        id: Date.now().toString(),
        name: '',
        unit: 'L',
        quantity: 0,
        price: 0
    });
    savePricing(rows);
    renderPricing();
}

function deletePricingRowsNow(ids) {
    const remove = {};
    (ids || []).forEach(function (id) {
        remove[String(id)] = true;
    });
    if (!Object.keys(remove).length) return;
    const rows = loadPricing();
    const removed = rows.filter(function (row) {
        return remove[String(row.id)];
    });
    if (typeof moveFilesToRecycleBin === 'function') moveFilesToRecycleBin('pricing', removed);
    savePricing(rows.filter(function (row) {
        return !remove[String(row.id)];
    }));
    renderPricing();
}

function deletePricingRow(id) {
    if (typeof protectDeleteFile === 'function') {
        protectDeleteFile(function () {
            deletePricingRowsNow([id]);
        });
        return;
    }
    deletePricingRowsNow([id]);
}

function updatePricing(id, field, value) {
    const rows = loadPricing();
    const row = rows.find(function (item) { return item.id === id; });
    if (!row) return;
    if (field === 'quantity' || field === 'price') {
        row[field] = parseFloat(value) || 0;
    } else {
        row[field] = value;
    }
    savePricing(rows);
    const cell = document.querySelector('[data-unit-price="' + id + '"]');
    if (cell) cell.textContent = '$' + pricingUnitPrice(row).toFixed(2);
}

function renderPricing() {
    const body = document.getElementById('pricingBody');
    const empty = document.getElementById('pricingEmpty');
    if (!body) return;
    const rows = loadPricing();
    body.innerHTML = '';
    rows.forEach(function (row) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-file-id', row.id);
        tr.innerHTML = `
            <td><input type="text" value="${String(row.name || '').replace(/"/g, '&quot;')}" placeholder="Detergent" onchange="updatePricing('${row.id}', 'name', this.value)"></td>
            <td>
                <select onchange="updatePricing('${row.id}', 'unit', this.value)">
                    <option value="L"${row.unit === 'L' ? ' selected' : ''}>L</option>
                    <option value="kg"${row.unit === 'kg' ? ' selected' : ''}>kg</option>
                    <option value="pcs"${row.unit === 'pcs' ? ' selected' : ''}>pcs</option>
                </select>
            </td>
            <td><input type="number" min="0" step="0.01" value="${Number(row.quantity || 0)}" oninput="updatePricing('${row.id}', 'quantity', this.value)"></td>
            <td><input type="number" min="0" step="0.01" value="${Number(row.price || 0)}" oninput="updatePricing('${row.id}', 'price', this.value)"></td>
            <td data-unit-price="${row.id}">$${pricingUnitPrice(row).toFixed(2)}</td>
            <td><button type="button" class="danger-btn" onclick="deletePricingRow('${row.id}')">Delete</button></td>
        `;
        body.appendChild(tr);
    });
    if (empty) empty.style.display = rows.length ? 'none' : 'block';
    if (typeof bindFileSelect === 'function') {
        bindFileSelect({
            container: document.getElementById('pricingTable') || body,
            item: 'tbody tr',
            onDelete: deletePricingRowsNow
        });
    }
    if (typeof syncFileSelect === 'function') syncFileSelect(document.getElementById('pricingTable') || body);
}

whenDbReady(renderPricing);
