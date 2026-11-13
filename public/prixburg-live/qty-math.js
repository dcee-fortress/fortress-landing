const QTY_OP_LIMIT = 20;

function countAddSubOps(text) {
    const s = String(text || '').replace(/^\s*=/, '').replace(/\s+/g, '');
    let n = 0;
    let i;
    for (i = 0; i < s.length; i += 1) {
        if (s[i] !== '+' && s[i] !== '-') continue;
        if (i === 0) continue;
        const prev = s[i - 1];
        if (prev === '+' || prev === '-' || prev === '*' || prev === '/' || prev === '(') continue;
        n += 1;
    }
    return n;
}

function isRelativeQtyInput(text) {
    const raw = String(text || '').trim();
    if (!raw || raw.charAt(0) === '=') return false;
    return raw.charAt(0) === '+' || (raw.charAt(0) === '-' && raw.length > 1);
}

function joinQtyFormula(prevFormula, prevQty, suffix) {
    const prevF = String(prevFormula || '').trim();
    const extra = String(suffix || '').trim();
    if (!extra) return prevF || String(prevQty || 0);
    if (prevF.charAt(0) === '=' || countAddSubOps(prevF) > 0) {
        return (prevF.charAt(0) === '=' ? prevF : '=' + prevF) + extra;
    }
    const base = Number.isFinite(parseFloat(prevF)) ? String(parseFloat(prevF)) : String(parseFloat(prevQty) || 0);
    return '=' + base + extra;
}

function collapseQtyFormula(qtyFormula, quantity) {
    if (countAddSubOps(qtyFormula) >= QTY_OP_LIMIT) return String(quantity);
    return qtyFormula;
}

function applyStoreDeduction(row, takeQty) {
    const take = parseFloat(takeQty) || 0;
    const previousQty = parseFloat(row && row.quantity) || 0;
    if (!(take > 0)) {
        return {
            quantity: previousQty,
            qtyFormula: (row && row.qtyFormula) || String(previousQty),
            qtyError: ''
        };
    }
    const next = applyQtyInput(previousQty, row && row.qtyFormula, '-' + String(take));
    return {
        quantity: next.quantity,
        qtyFormula: next.qtyFormula,
        qtyError: ''
    };
}

function evaluateQtyMath(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) return 0;
    const expr = (raw.charAt(0) === '=' ? raw.slice(1) : raw).replace(/\s+/g, '');
    if (!expr) return 0;
    if (!/^[0-9+\-*/().]+$/.test(expr)) throw new Error('#ERROR!');

    const tokens = [];
    let i = 0;
    while (i < expr.length) {
        const c = expr[i];
        if ('+-*/()'.indexOf(c) !== -1) {
            tokens.push({ type: c });
            i += 1;
            continue;
        }
        if (c === '.' || (c >= '0' && c <= '9')) {
            let n = '';
            while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
                n += expr[i];
                i += 1;
            }
            tokens.push({ type: 'num', value: parseFloat(n) });
            continue;
        }
        throw new Error('#ERROR!');
    }
    tokens.push({ type: 'end' });

    let pos = 0;
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
    if (peek().type !== 'end') throw new Error('#ERROR!');
    if (!Number.isFinite(value)) throw new Error('#ERROR!');
    return value;
}

function applyQtyInput(previousQty, previousFormula, text) {
    const raw = String(text == null ? '' : text).trim();
    let expr;
    if (!raw) {
        expr = '0';
    } else if (raw.charAt(0) === '=') {
        expr = raw;
    } else if (isRelativeQtyInput(raw)) {
        expr = joinQtyFormula(previousFormula, previousQty, raw);
    } else {
        expr = raw;
    }
    if (expr.charAt(0) !== '=' && /[+\-*/()]/.test(expr)) {
        expr = '=' + expr;
    }

    const quantity = evaluateQtyMath(expr.charAt(0) === '=' ? expr : '=' + expr);
    return {
        quantity: quantity,
        qtyFormula: collapseQtyFormula(expr, quantity),
        qtyError: ''
    };
}
