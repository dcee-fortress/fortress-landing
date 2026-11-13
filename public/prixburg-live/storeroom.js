const STOREROOM_KEY = 'rawMaterialsData';

let selectedQtyId = '';

function loadMaterials() {
    return dbGet(STOREROOM_KEY);
}

function saveMaterials(rows) {
    dbSet(STOREROOM_KEY, rows);
}

function todayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function materialTotal(row) {
    return (parseFloat(row.quantity) || 0) * (parseFloat(row.unitCost) || 0);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function tokenizeFormula(expr) {
    const tokens = [];
    const s = String(expr || '').replace(/\s+/g, '');
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if ('+-*/(),:'.indexOf(c) !== -1) {
            tokens.push({ type: c });
            i += 1;
            continue;
        }
        if (c === '.' || (c >= '0' && c <= '9')) {
            let n = '';
            while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.')) {
                n += s[i];
                i += 1;
            }
            tokens.push({ type: 'num', value: parseFloat(n) });
            continue;
        }
        if (/[A-Za-z]/.test(c)) {
            let n = '';
            while (i < s.length && /[A-Za-z0-9]/.test(s[i])) {
                n += s[i];
                i += 1;
            }
            tokens.push({ type: 'id', value: n.toUpperCase() });
            continue;
        }
        throw new Error('#ERROR!');
    }
    tokens.push({ type: 'end' });
    return tokens;
}

function cellRefParts(id) {
    const match = /^([DE])([1-9][0-9]*)$/.exec(id);
    if (!match) return null;
    return { col: match[1], row: parseInt(match[2], 10) };
}

function readCell(col, rowIndex, rows, stack) {
    const i = rowIndex - 1;
    if (i < 0 || i >= rows.length) throw new Error('#REF!');
    const key = col + rowIndex;
    if (stack.indexOf(key) !== -1) throw new Error('#CIRC!');
    if (col === 'E') return parseFloat(rows[i].unitCost) || 0;
    const formula = rows[i].qtyFormula;
    if (formula && String(formula).trim().charAt(0) === '=') {
        stack.push(key);
        const value = evaluateFormula(formula, rows, i, stack);
        stack.pop();
        return value;
    }
    return parseFloat(rows[i].quantity) || 0;
}

function parseExpression(tokens, pos, rows, stack) {
    function peek() {
        return tokens[pos];
    }
    function eat(type) {
        if (tokens[pos].type !== type) throw new Error('#ERROR!');
        pos += 1;
    }

    function parsePrimary() {
        const tok = peek();
        if (tok.type === 'num') {
            pos += 1;
            return tok.value;
        }
        if (tok.type === '+' || tok.type === '-') {
            const sign = tok.type === '-' ? -1 : 1;
            pos += 1;
            return sign * parsePrimary();
        }
        if (tok.type === '(') {
            pos += 1;
            const value = parseAdd();
            eat(')');
            return value;
        }
        if (tok.type === 'id') {
            pos += 1;
            if (tok.value === 'SUM') {
                eat('(');
                const startTok = peek();
                if (startTok.type !== 'id') throw new Error('#ERROR!');
                pos += 1;
                eat(':');
                const endTok = peek();
                if (endTok.type !== 'id') throw new Error('#ERROR!');
                pos += 1;
                eat(')');
                const start = cellRefParts(startTok.value);
                const end = cellRefParts(endTok.value);
                if (!start || !end || start.col !== end.col) throw new Error('#REF!');
                const from = Math.min(start.row, end.row);
                const to = Math.max(start.row, end.row);
                let sum = 0;
                for (let r = from; r <= to; r += 1) sum += readCell(start.col, r, rows, stack);
                return sum;
            }
            const ref = cellRefParts(tok.value);
            if (!ref) throw new Error('#REF!');
            return readCell(ref.col, ref.row, rows, stack);
        }
        throw new Error('#ERROR!');
    }

    function parseMul() {
        let value = parsePrimary();
        while (peek().type === '*' || peek().type === '/') {
            const op = peek().type;
            pos += 1;
            const right = parsePrimary();
            value = op === '*' ? value * right : (right === 0 ? NaN : value / right);
        }
        return value;
    }

    function parseAdd() {
        let value = parseMul();
        while (peek().type === '+' || peek().type === '-') {
            const op = peek().type;
            pos += 1;
            const right = parseMul();
            value = op === '+' ? value + right : value - right;
        }
        return value;
    }

    const value = parseAdd();
    if (peek().type !== 'end' && pos < tokens.length - 1 && peek().type !== ')') {
        // leftover tokens after a full expression
    }
    return { value: value, pos: pos };
}

function evaluateFormula(text, rows, originIndex, stack) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw.startsWith('=')) {
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : 0;
    }
    const tokens = tokenizeFormula(raw.slice(1));
    const parsed = parseExpression(tokens, 0, rows, stack || ['D' + (originIndex + 1)]);
    if (!Number.isFinite(parsed.value)) throw new Error('#ERROR!');
    return parsed.value;
}

function recomputeQuantities(rows) {
    return rows.map(function (row, index) {
        const next = Object.assign({}, row);
        if (next.qtyFormula && String(next.qtyFormula).trim().charAt(0) === '=') {
            try {
                next.quantity = evaluateFormula(next.qtyFormula, rows, index, []);
            } catch (err) {
                next.quantity = 0;
                next.qtyError = String(err.message || '#ERROR!');
                return next;
            }
        } else if (next.qtyFormula && String(next.qtyFormula).trim() !== '') {
            const n = parseFloat(next.qtyFormula);
            next.quantity = Number.isFinite(n) ? n : (parseFloat(next.quantity) || 0);
        }
        next.qtyError = '';
        return next;
    });
}

function formulaBarEls() {
    return {
        ref: document.getElementById('formulaRef'),
        input: document.getElementById('formulaBarInput')
    };
}

function qtyDisplay(row) {
    if (row.qtyError) return row.qtyError;
    return Number(row.quantity || 0);
}

function selectQtyCell(input, id, rowNumber) {
    selectedQtyId = id;
    const rows = loadMaterials();
    const row = rows.find(function (item) { return item.id === id; });
    const bar = formulaBarEls();
    const formula = row && row.qtyFormula ? row.qtyFormula : String(row ? (row.quantity || 0) : '');
    if (bar.ref) bar.ref.textContent = 'D' + rowNumber;
    if (bar.input) bar.input.value = formula;
    input.value = formula;
}

function syncFormulaBar(input) {
    const bar = formulaBarEls();
    if (bar.input) bar.input.value = input.value;
}

function applyFormulaBar() {
    if (!selectedQtyId) return;
    const bar = formulaBarEls();
    if (!bar.input) return;
    commitQtyFormula(selectedQtyId, bar.input.value);
}

function commitQtyFromInput(input, id) {
    commitQtyFormula(id, input.value);
}

function commitQtyFormula(id, text) {
    const rows = loadMaterials();
    const row = rows.find(function (item) { return item.id === id; });
    if (!row) return;
    const previousQty = parseFloat(row.quantity) || 0;
    let raw = String(text == null ? '' : text).trim();
    if (typeof isRelativeQtyInput === 'function' && isRelativeQtyInput(raw)) {
        raw = joinQtyFormula(row.qtyFormula, row.quantity, raw);
    }
    row.qtyFormula = raw;
    if (!raw.startsWith('=')) {
        row.quantity = parseFloat(raw) || 0;
    }
    const computed = recomputeQuantities(rows);
    const next = computed.find(function (item) { return item.id === id; });
    if (next && typeof collapseQtyFormula === 'function') {
        next.qtyFormula = collapseQtyFormula(next.qtyFormula, next.quantity);
        if (!String(next.qtyFormula || '').startsWith('=')) {
            next.quantity = parseFloat(next.qtyFormula) || next.quantity;
        }
    }
    saveMaterials(computed);
    const nextQty = parseFloat(next && next.quantity) || 0;
    if (typeof logPurchaseMovement === 'function' && nextQty > previousQty) {
        logPurchaseMovement(next.name, next.unit, nextQty - previousQty, nextQty);
    }
    renderStoreroom();
}

function addMaterial() {
    const rows = loadMaterials();
    rows.push({
        id: Date.now().toString(),
        date: todayDate(),
        name: '',
        unit: 'kg',
        quantity: 0,
        qtyFormula: '',
        unitCost: 0
    });
    saveMaterials(rows);
    renderStoreroom();
    const nameInput = document.querySelector('#storeroomBody tr:last-child input[type="text"]');
    if (nameInput) nameInput.focus();
}

function deleteMaterial(id) {
    if (selectedQtyId === id) selectedQtyId = '';
    saveMaterials(loadMaterials().filter(function (row) { return row.id !== id; }));
    renderStoreroom();
}

function updateGrandTotal() {
    const total = loadMaterials().reduce(function (sum, row) { return sum + materialTotal(row); }, 0);
    const totalEl = document.getElementById('storeroomTotal');
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
}

function updateMaterial(id, field, value) {
    const rows = loadMaterials();
    const row = rows.find(function (item) { return item.id === id; });
    if (!row) return;
    if (field === 'unitCost') {
        row[field] = parseFloat(value) || 0;
        const computed = recomputeQuantities(rows);
        saveMaterials(computed);
        renderStoreroom();
        return;
    }
    row[field] = value;
    saveMaterials(rows);
    const totalCell = document.querySelector('[data-total="' + id + '"]');
    if (totalCell) totalCell.textContent = '$' + materialTotal(row).toFixed(2);
    updateGrandTotal();
}

function renderStoreroom() {
    const rows = typeof recomputeQuantities === 'function'
        ? recomputeQuantities(loadMaterials())
        : loadMaterials();
    const body = document.getElementById('storeroomBody');
    const empty = document.getElementById('storeroomEmpty');
    const totalEl = document.getElementById('storeroomTotal');
    if (!body) return;

    body.innerHTML = '';
    let total = 0;

    rows.forEach(function (row, index) {
        const lineTotal = materialTotal(row);
        total += lineTotal;
        const rowNumber = index + 1;
        const display = row.qtyError ? row.qtyError : Number(row.quantity || 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="date" value="${escapeHtml(row.date || todayDate())}" onchange="updateMaterial('${row.id}', 'date', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.name || '')}" placeholder="Material name" onchange="updateMaterial('${row.id}', 'name', this.value)"></td>
            <td>
                <select onchange="updateMaterial('${row.id}', 'unit', this.value)">
                    <option value="kg"${row.unit === 'kg' ? ' selected' : ''}>kg</option>
                    <option value="L"${row.unit === 'L' ? ' selected' : ''}>L</option>
                    <option value="pcs"${row.unit === 'pcs' ? ' selected' : ''}>pcs</option>
                    <option value="box"${row.unit === 'box' ? ' selected' : ''}>box</option>
                </select>
            </td>
            <td><input type="text" class="qty-input" inputmode="decimal" value="${escapeHtml(display)}" onfocus="selectQtyCell(this, '${row.id}', ${rowNumber})" oninput="syncFormulaBar(this)" onchange="commitQtyFromInput(this, '${row.id}')"></td>
            <td><input type="number" min="0" step="0.01" value="${Number(row.unitCost || 0)}" onchange="updateMaterial('${row.id}', 'unitCost', this.value)"></td>
            <td data-total="${row.id}">$${lineTotal.toFixed(2)}</td>
            <td><button type="button" class="danger-btn" onclick="deleteMaterial('${row.id}')">Delete</button></td>
        `;
        body.appendChild(tr);
    });

    if (empty) empty.style.display = rows.length ? 'none' : 'block';
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

    const bar = formulaBarEls();
    if (!selectedQtyId && bar.ref) bar.ref.textContent = '';
}

whenDbReady(function () {
    const bar = formulaBarEls();
    if (bar.input) {
        bar.input.addEventListener('change', applyFormulaBar);
        bar.input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyFormulaBar();
            }
        });
    }
    renderStoreroom();
});
