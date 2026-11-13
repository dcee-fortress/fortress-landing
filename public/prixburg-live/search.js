function editDistance(a, b) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const grid = [];
    let r;
    let c;
    for (r = 0; r < rows; r += 1) {
        grid[r] = [r];
    }
    for (c = 0; c < cols; c += 1) {
        grid[0][c] = c;
    }
    for (r = 1; r < rows; r += 1) {
        for (c = 1; c < cols; c += 1) {
            const cost = a[r - 1] === b[c - 1] ? 0 : 1;
            grid[r][c] = Math.min(
                grid[r - 1][c] + 1,
                grid[r][c - 1] + 1,
                grid[r - 1][c - 1] + cost
            );
        }
    }
    return grid[a.length][b.length];
}

function similarWord(token, word) {
    if (token === word) return true;
    if (!token || !word) return false;
    if (token.indexOf(word) !== -1 || word.indexOf(token) !== -1) return true;
    if (token.length < 3 || word.length < 3) return false;
    const max = Math.min(token.length, word.length) >= 6 ? 2 : 1;
    if (Math.abs(token.length - word.length) > max) return false;
    return editDistance(token, word) <= max;
}

function normalizeMatchName(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function similarNameToken(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length < 3 || b.length < 3) return false;
    const max = Math.min(a.length, b.length) >= 6 ? 2 : 1;
    if (Math.abs(a.length - b.length) > max) return false;
    return editDistance(a, b) <= max;
}

function containsWholeName(hay, needle) {
    return (' ' + hay + ' ').indexOf(' ' + needle + ' ') !== -1;
}

function nameSimilarity(a, b) {
    const left = normalizeMatchName(a);
    const right = normalizeMatchName(b);
    if (!left || !right) return 0;
    if (left === right) return 100;
    const shorterLen = Math.min(left.length, right.length);
    if (shorterLen >= 5 && (containsWholeName(left, right) || containsWholeName(right, left))) {
        const longer = Math.max(left.length, right.length);
        return 70 + 20 * (shorterLen / longer);
    }

    const leftTokens = left.split(/[^a-z0-9]+/).filter(Boolean);
    const rightTokens = right.split(/[^a-z0-9]+/).filter(Boolean);
    if (leftTokens.length && rightTokens.length) {
        const shorterTokens = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
        const longerTokens = leftTokens.length <= rightTokens.length ? rightTokens : leftTokens;
        const hits = shorterTokens.filter(function (token) {
            return longerTokens.some(function (other) { return similarNameToken(token, other); });
        }).length;
        const distinctive = shorterTokens.some(function (token) { return token.length >= 5; });
        if (hits === shorterTokens.length && hits > 0 && (distinctive || shorterTokens.length >= 2)) {
            return 55 + 25 * (hits / longerTokens.length);
        }
    }

    const compactLeft = left.replace(/\s+/g, '');
    const compactRight = right.replace(/\s+/g, '');
    const maxTypo = Math.min(left.length, right.length) >= 8 ? 2 : 1;
    if (Math.abs(compactLeft.length - compactRight.length) <= maxTypo) {
        const dist = editDistance(compactLeft, compactRight);
        if (dist > 0 && dist <= maxTypo) return 80 - dist * 10;
    }
    return 0;
}

function namesMatch(a, b) {
    return nameSimilarity(a, b) >= 50;
}

function bestNameMatch(needle, items, getName) {
    let best = null;
    let bestScore = 0;
    (items || []).forEach(function (item) {
        const name = typeof getName === 'function' ? getName(item) : item;
        const score = nameSimilarity(needle, name);
        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    });
    return bestScore >= 50 ? best : null;
}

function matchesSearch(text, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const hay = String(text || '').toLowerCase();
    if (hay.indexOf(q) !== -1) return true;
    const words = q.split(/\s+/).filter(Boolean);
    const tokens = hay.split(/[^a-z0-9]+/).filter(Boolean);
    return words.every(function (word) {
        if (hay.indexOf(word) !== -1) return true;
        return tokens.some(function (token) {
            return similarWord(token, word);
        });
    });
}

function currentSearchValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function bindSearchInput(id, onChange) {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === 'true') return;
    el.dataset.bound = 'true';
    el.addEventListener('input', onChange);
}
