const FORMULAS_KEY = 'prixburgDetergentFormulas';

function loadFormulas() {
    return dbGet(FORMULAS_KEY);
}

function saveFormulas(files) {
    dbSet(FORMULAS_KEY, files);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getFormulaIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

function getFormula(id) {
    return loadFormulas().find((file) => file.id === id) || null;
}

function ingredientTotal(row) {
    return (parseFloat(row.amount) || 0) * (parseFloat(row.unitPrice) || 0);
}

function formulaTotals(file) {
    const totalCost = (file.ingredients || []).reduce((sum, row) => sum + ingredientTotal(row), 0);
    const production = parseFloat(file.production) || 0;
    const rate = production > 0 ? totalCost / production : null;
    return { totalCost: totalCost, rate: rate, production: production };
}

function formatMoney(value) {
    return '$' + Number(value || 0).toFixed(2);
}

function openCreateFormulaModal() {
    const overlay = document.getElementById('createFormulaModal');
    if (!overlay) return;
    overlay.classList.add('show');
    const name = document.getElementById('formulaName');
    if (name) name.focus();
}

function closeCreateFormulaModal() {
    const overlay = document.getElementById('createFormulaModal');
    if (!overlay) return;
    overlay.classList.remove('show');
    const form = document.getElementById('createFormulaForm');
    if (form) form.reset();
}

function refreshFormulasListPage() {
    if (!document.getElementById('formulasList')) return;
    closeCreateFormulaModal();
    renderFormulasList();
}

function createFormulaFile(name, production) {
    const files = loadFormulas();
    const file = {
        id: Date.now().toString(),
        name: name,
        production: parseFloat(production) || 0,
        ingredients: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    files.push(file);
    saveFormulas(files);
    return file;
}

function renameFormulaFile(id, name) {
    const nextName = String(name || '').trim();
    const files = loadFormulas();
    const file = files.find(function (item) { return item.id === id; });
    if (!file) return;

    const nameInput = document.getElementById('formulaNameEdit');
    if (!nextName) {
        if (document.getElementById('formulasList')) renderFormulasList();
        if (nameInput) nameInput.value = file.name;
        return;
    }
    if (file.name === nextName) return;

    file.name = nextName;
    file.updatedAt = new Date().toISOString();
    saveFormulas(files);

    document.title = 'Prixburg - ' + nextName;
    if (nameInput && document.activeElement !== nameInput) nameInput.value = nextName;
    updateRateCard(file);
}

function deleteFormulaFilesNow(ids) {
    const remove = {};
    (ids || []).forEach(function (id) {
        remove[String(id)] = true;
    });
    if (!Object.keys(remove).length) return;
    const files = loadFormulas();
    const removed = files.filter(function (file) {
        return remove[String(file.id)];
    });
    if (typeof moveFilesToRecycleBin === 'function') moveFilesToRecycleBin('formula', removed);
    saveFormulas(files.filter(function (file) {
        return !remove[String(file.id)];
    }));
    renderFormulasList();
}

function deleteFormulaFile(id) {
    if (typeof protectDeleteFile === 'function') {
        protectDeleteFile(function () {
            deleteFormulaFilesNow([id]);
        });
        return;
    }
    deleteFormulaFilesNow([id]);
}

function addIngredient() {
    const id = getFormulaIdFromUrl();
    const files = loadFormulas();
    const file = files.find((item) => item.id === id);
    if (!file) return;

    file.ingredients = file.ingredients || [];
    file.ingredients.push({
        id: Date.now().toString(),
        name: '',
        unit: 'kg',
        amount: 0,
        qtyFormula: '0',
        unitPrice: 0
    });
    saveFormulas(files);
    renderFormulaDetail();
}

function deleteIngredient(ingredientId) {
    const id = getFormulaIdFromUrl();
    const files = loadFormulas();
    const file = files.find((item) => item.id === id);
    if (!file) return;

    file.ingredients = (file.ingredients || []).filter((row) => row.id !== ingredientId);
    saveFormulas(files);
    renderFormulaDetail();
}

function updateIngredient(ingredientId, field, value) {
    const id = getFormulaIdFromUrl();
    const files = loadFormulas();
    const file = files.find((item) => item.id === id);
    if (!file) return;
    const row = (file.ingredients || []).find((item) => item.id === ingredientId);
    if (!row) return;

    if (field === 'unitPrice') {
        row[field] = parseFloat(value) || 0;
    } else if (field === 'amount') {
        commitIngredientQty(ingredientId, value);
        return;
    } else {
        row[field] = value;
    }

    saveFormulas(files);

    const totalCell = document.querySelector('[data-total="' + ingredientId + '"]');
    if (totalCell) totalCell.textContent = formatMoney(ingredientTotal(row));
    updateRateCard(file);
}

function selectIngredientQty(input, ingredientId) {
    const file = getFormula(getFormulaIdFromUrl());
    const row = file && (file.ingredients || []).find(function (item) { return item.id === ingredientId; });
    if (!row || !input) return;
    input.value = row.qtyFormula ? row.qtyFormula : String(row.amount || 0);
}

function commitIngredientQty(ingredientId, text) {
    const id = getFormulaIdFromUrl();
    const files = loadFormulas();
    const file = files.find(function (item) { return item.id === id; });
    if (!file) return;
    const row = (file.ingredients || []).find(function (item) { return item.id === ingredientId; });
    if (!row) return;

    let result;
    try {
        result = applyQtyInput(row.amount, row.qtyFormula, text);
    } catch (err) {
        const input = document.querySelector('[data-qty="' + ingredientId + '"]');
        if (input) input.value = String(row.amount || 0);
        return;
    }

    if (result.quantity < 0) {
        row.amount = 0;
        row.qtyFormula = '0';
    } else {
        row.amount = result.quantity;
        row.qtyFormula = result.qtyFormula;
    }
    file.updatedAt = new Date().toISOString();
    saveFormulas(files);

    const input = document.querySelector('[data-qty="' + ingredientId + '"]');
    if (input && document.activeElement !== input) {
        input.value = String(row.amount);
    }
    const totalCell = document.querySelector('[data-total="' + ingredientId + '"]');
    if (totalCell) totalCell.textContent = formatMoney(ingredientTotal(row));
    updateRateCard(file);
}

function setFormulaSaveStatus(message) {
    const status = document.getElementById('formulaSaveStatus');
    if (status) status.textContent = message || '';
}

function commitOpenFormulaFields() {
    if (!document.getElementById('formulaTable')) return false;
    const id = getFormulaIdFromUrl();
    const files = loadFormulas();
    const file = files.find(function (item) { return item.id === id; });
    if (!file) return false;

    const nameInput = document.getElementById('formulaNameEdit');
    if (nameInput && String(nameInput.value || '').trim()) {
        file.name = String(nameInput.value).trim();
    }

    const productionInput = document.getElementById('formulaProductionEdit');
    if (productionInput) file.production = parseFloat(productionInput.value) || 0;

    file.ingredients = file.ingredients || [];
    document.querySelectorAll('#formulaBody tr[data-ingredient]').forEach(function (tr) {
        const rowId = tr.getAttribute('data-ingredient');
        const row = file.ingredients.find(function (item) { return item.id === rowId; });
        if (!row) return;
        const nameEl = tr.querySelector('[data-field="name"]');
        const unitEl = tr.querySelector('[data-field="unit"]');
        const priceEl = tr.querySelector('[data-field="unitPrice"]');
        const qtyEl = tr.querySelector('[data-qty]');
        if (nameEl) row.name = nameEl.value;
        if (unitEl) row.unit = unitEl.value;
        if (priceEl) row.unitPrice = parseFloat(priceEl.value) || 0;
        if (qtyEl) {
            try {
                const result = applyQtyInput(row.amount, row.qtyFormula, qtyEl.value);
                if (result.quantity < 0) {
                    row.amount = 0;
                    row.qtyFormula = '0';
                } else {
                    row.amount = result.quantity;
                    row.qtyFormula = result.qtyFormula;
                }
            } catch (err) {
                row.amount = parseFloat(qtyEl.value) || row.amount || 0;
            }
        }
    });

    file.updatedAt = new Date().toISOString();
    saveFormulas(files);
    return true;
}

function saveFormulaFile() {
    if (!commitOpenFormulaFields()) return;
    renderFormulaDetail();
    setFormulaSaveStatus('Saved. This file stays in Available files until you delete it.');
}

function updateProduction(value) {
    const id = getFormulaIdFromUrl();
    const files = loadFormulas();
    const file = files.find((item) => item.id === id);
    if (!file) return;
    file.production = parseFloat(value) || 0;
    saveFormulas(files);
    updateRateCard(file);
}

function updateRateCard(file) {
    const totals = formulaTotals(file);
    const title = document.getElementById('rateTitle');
    const value = document.getElementById('rateValue');
    if (title) title.textContent = 'Rate for ' + (file.name || 'detergent');
    if (value) value.textContent = totals.rate === null ? '—' : formatMoney(totals.rate);
}

function renderFormulasList() {
    const list = document.getElementById('formulasList');
    const empty = document.getElementById('formulasEmpty');
    if (!list) return;

    const files = loadFormulas();
    list.innerHTML = '';

    files.slice().reverse().forEach((file) => {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.setAttribute('data-file-id', file.id);
        row.innerHTML = `
            <div class="formula-file-copy">
                <label class="formula-file-label" for="formula-name-${escapeHtml(file.id)}">Detergent file name</label>
                <input id="formula-name-${escapeHtml(file.id)}" class="file-name-input" type="text" value="${escapeHtml(file.name)}" aria-label="Detergent file name" onchange="renameFormulaFile('${file.id}', this.value)">
                <div class="file-meta">Produced ${escapeHtml(file.production)} · Created ${new Date(file.createdAt).toLocaleString()}</div>
            </div>
            <div class="file-actions">
                <a class="choice-btn" href="detergent-formula.html?id=${encodeURIComponent(file.id)}">Open</a>
                <button type="button" class="danger-btn" onclick="deleteFormulaFile('${file.id}')">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });

    if (empty) empty.style.display = files.length ? 'none' : 'block';
    if (typeof bindFileSelect === 'function') {
        bindFileSelect({
            container: list,
            item: '.file-row',
            onDelete: deleteFormulaFilesNow
        });
    }
    if (typeof syncFileSelect === 'function') syncFileSelect(list);
}

function renderFormulaDetail() {
    const id = getFormulaIdFromUrl();
    const file = getFormula(id);
    if (!file) {
        window.location.href = 'detergent-formulas.html';
        return;
    }

    document.title = 'Prixburg - ' + file.name;
    const nameInput = document.getElementById('formulaNameEdit');
    if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = file.name;
        nameInput.onchange = function () {
            renameFormulaFile(file.id, this.value);
        };
    }

    const heading = document.getElementById('formulaHeading');
    if (heading) heading.textContent = file.name;

    const productionInput = document.getElementById('formulaProductionEdit');
    if (productionInput && document.activeElement !== productionInput) {
        productionInput.value = file.production;
        productionInput.onchange = function () {
            updateProduction(this.value);
        };
    }

    const body = document.getElementById('formulaBody');
    const empty = document.getElementById('formulaEmpty');
    if (!body) return;

    body.innerHTML = '';
    (file.ingredients || []).forEach((row) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-ingredient', row.id);
        tr.innerHTML = `
            <td><input type="text" data-field="name" value="${escapeHtml(row.name || '')}" placeholder="Ingredient" onchange="updateIngredient('${row.id}', 'name', this.value)"></td>
            <td>
                <select data-field="unit" onchange="updateIngredient('${row.id}', 'unit', this.value)">
                    <option value="kg"${row.unit === 'kg' ? ' selected' : ''}>kg</option>
                    <option value="L"${row.unit === 'L' ? ' selected' : ''}>L</option>
                    <option value="g"${row.unit === 'g' ? ' selected' : ''}>g</option>
                    <option value="ml"${row.unit === 'ml' ? ' selected' : ''}>ml</option>
                    <option value="pcs"${row.unit === 'pcs' ? ' selected' : ''}>pcs</option>
                </select>
            </td>
            <td><input type="text" class="qty-input" inputmode="decimal" data-qty="${row.id}" value="${escapeHtml(row.qtyError ? row.qtyError : String(row.amount || 0))}" placeholder="=10+5 or +2" onfocus="selectIngredientQty(this, '${row.id}')" onchange="commitIngredientQty('${row.id}', this.value)"></td>
            <td><input type="number" min="0" step="0.01" data-field="unitPrice" value="${Number(row.unitPrice || 0)}" oninput="updateIngredient('${row.id}', 'unitPrice', this.value)"></td>
            <td data-total="${row.id}">${formatMoney(ingredientTotal(row))}</td>
            <td><button type="button" class="danger-btn" onclick="deleteIngredient('${row.id}')">Delete</button></td>
        `;
        body.appendChild(tr);
    });

    if (empty) empty.style.display = (file.ingredients || []).length ? 'none' : 'block';
    updateRateCard(file);
}

whenDbReady(function () {
    refreshFormulasListPage();

    if (document.getElementById('formulaTable')) {
        renderFormulaDetail();
    }

    const form = document.getElementById('createFormulaForm');
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            const name = document.getElementById('formulaName').value.trim();
            const production = document.getElementById('formulaProduction').value;
            if (!name) return;
            const file = createFormulaFile(name, production);
            closeCreateFormulaModal();
            renderFormulasList();
            window.history.replaceState(null, '', 'detergent-formulas.html');
            window.location.assign('detergent-formula.html?id=' + encodeURIComponent(file.id));
        });
    }

    const overlay = document.getElementById('createFormulaModal');
    if (overlay) {
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeCreateFormulaModal();
        });
    }
});

window.addEventListener('pageshow', function () {
    refreshFormulasListPage();
});

window.addEventListener('pagehide', function () {
    commitOpenFormulaFields();
});

window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') commitOpenFormulaFields();
});
