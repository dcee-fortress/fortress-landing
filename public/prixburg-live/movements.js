const MOVEMENTS_KEY = 'prixburgStockMovements';

function loadMovements() {
    return dbGet(MOVEMENTS_KEY);
}

function saveMovements(rows) {
    dbSet(MOVEMENTS_KEY, rows);
}

function storeRows() {
    return dbGet('rawMaterialsData');
}

function roundQty(value) {
    return Math.round((parseFloat(value) || 0) * 1000000) / 1000000;
}

function formatBatchQty(value) {
    const n = roundQty(value);
    if (!Number.isFinite(n)) return '0';
    return String(parseFloat(n.toFixed(4)));
}

function remainingStockText(rows) {
    const list = (rows || storeRows()).filter(function (row) {
        return String(row.name || '').trim();
    });
    if (!list.length) return 'No raw materials in store';
    return list.map(function (row) {
        return formatBatchQty(row.quantity) + ' ' + (row.unit || '') + ' ' + row.name;
    }).join(', ');
}

function usedMaterialsText(used) {
    if (!used || !used.length) return 'None';
    return used.map(function (item) {
        return (item.name || '') + ' ' + formatBatchQty(item.amount) + ' ' + (item.unit || '');
    }).join(' | ');
}

function remainingUsedStockText(rows, used) {
    return (used || []).map(function (item) {
        const key = normalizeName(item.storeName || item.name);
        const matches = (rows || []).filter(function (row) {
            return normalizeName(row.name) === key;
        });
        const qty = matches.reduce(function (sum, row) {
            let q = parseFloat(row.quantity) || 0;
            if (typeof evaluateQtyMath === 'function' && row.qtyFormula) {
                try {
                    const n = evaluateQtyMath(row.qtyFormula);
                    if (Number.isFinite(n)) q = n;
                } catch (err) { /* keep quantity */ }
            }
            return sum + q;
        }, 0);
        const name = (matches[0] && matches[0].name) || item.storeName || item.name;
        const unit = (matches[0] && matches[0].unit) || item.storeUnit || item.unit || '';
        return name + ' ' + formatBatchQty(qty) + ' ' + unit + ' left';
    }).filter(Boolean).join(' | ');
}

function addMovement(entry) {
    const rows = loadMovements();
    rows.push(entry);
    saveMovements(rows);
    return entry;
}

function toBaseUnit(amount, unit) {
    const value = parseFloat(amount) || 0;
    const u = String(unit || '').trim();
    if (u === 'g') return { amount: value / 1000, unit: 'kg' };
    if (u === 'ml') return { amount: value / 1000, unit: 'L' };
    return { amount: value, unit: u || 'kg' };
}

function fromBaseUnit(baseAmount, originalUnit) {
    const u = String(originalUnit || '').trim();
    if (u === 'g') return baseAmount * 1000;
    if (u === 'ml') return baseAmount * 1000;
    return baseAmount;
}

function unitsCompatible(a, b) {
    return toBaseUnit(1, a).unit === toBaseUnit(1, b).unit;
}

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function logPurchaseMovement(material, unit, quantity, remainingMaterial) {
    if (!(quantity > 0)) return;
    addMovement({
        id: Date.now().toString() + '-buy',
        type: 'purchase',
        at: new Date().toISOString(),
        material: material || 'Unnamed material',
        unit: unit || '',
        quantity: quantity,
        remainingMaterial: remainingMaterial,
        remainingStock: remainingStockText()
    });
}

function logProductionMovement(product, productQty, productUnit, used, remainingStock) {
    addMovement({
        id: Date.now().toString() + '-prod',
        type: 'production',
        at: new Date().toISOString(),
        product: product,
        productQty: productQty,
        productUnit: productUnit,
        used: used || [],
        remainingStock: remainingStock
    });
}

function findStoreMaterial(rows, name) {
    const named = (rows || []).filter(function (row) {
        return String(row.name || '').trim();
    });
    if (typeof bestNameMatch === 'function') {
        return bestNameMatch(name, named, function (row) { return row.name; });
    }
    return named.find(function (row) {
        return normalizeName(row.name) === normalizeName(name);
    }) || null;
}

function subtractIngredientsFromStore(ingredients) {
    const rows = JSON.parse(JSON.stringify(storeRows()));
    const used = [];
    let cost = 0;

    for (let i = 0; i < ingredients.length; i += 1) {
        const ing = ingredients[i];
        const name = String(ing.name || '').trim();
        if (!name || !(parseFloat(ing.amount) > 0)) continue;

        const best = findStoreMaterial(rows, name);
        if (!best) {
            return {
                ok: false,
                message: 'No ' + name + ' in the storeroom. Add it under Raw materials storeroom first.'
            };
        }

        const useStoreUnit = !ing.unit || !unitsCompatible(best.unit, ing.unit);
        const takeUnit = useStoreUnit ? best.unit : ing.unit;
        const needBase = toBaseUnit(ing.amount, takeUnit);

        const matches = rows.filter(function (row) {
            return normalizeName(row.name) === normalizeName(best.name)
                && (useStoreUnit || unitsCompatible(row.unit, takeUnit));
        });
        const available = matches.reduce(function (sum, row) {
            return sum + toBaseUnit(row.quantity, row.unit).amount;
        }, 0);

        if (available + 0.0000001 < needBase.amount) {
            return {
                ok: false,
                message: 'Not enough ' + best.name + ' in the storeroom. Need ' + formatBatchQty(ing.amount) + ' ' + (takeUnit || '') + '.'
            };
        }

        let need = needBase.amount;
        matches.forEach(function (row) {
            if (need <= 0) return;
            const rowBase = toBaseUnit(row.quantity, row.unit);
            const take = Math.min(rowBase.amount, need);
            const takeStoreQty = roundQty(fromBaseUnit(take, row.unit));
            if (typeof applyStoreDeduction === 'function') {
                const next = applyStoreDeduction(row, takeStoreQty);
                row.quantity = roundQty(next.quantity);
                row.qtyFormula = next.qtyFormula;
                row.qtyError = '';
            } else {
                row.quantity = roundQty(fromBaseUnit(rowBase.amount - take, row.unit));
                row.qtyFormula = String(row.quantity);
            }
            cost += takeStoreQty * (parseFloat(row.unitCost) || 0);
            need -= take;
        });

        used.push({
            name: best.name,
            storeName: best.name,
            storeUnit: best.unit,
            unit: ing.unit || '',
            amount: roundQty(ing.amount)
        });
    }

    return {
        ok: true,
        rows: rows,
        used: used,
        cost: roundQty(cost),
        remainingStock: remainingUsedStockText(rows, used)
    };
}

function batchSearchText(batch) {
    const usedNames = (batch.used || []).map(function (item) {
        return item.name;
    }).join(' ');
    return [
        batch.type,
        batch.material,
        batch.product,
        usedNames,
        batch.remainingStock,
        batch.at,
        batch.unit,
        batch.productUnit
    ].join(' ');
}

function deleteBatchesNow(ids) {
    const remove = {};
    (ids || []).forEach(function (id) {
        remove[String(id)] = true;
    });
    if (!Object.keys(remove).length) return;
    const rows = loadMovements();
    const removed = rows.filter(function (row) {
        return remove[String(row.id)];
    });
    if (typeof moveFilesToRecycleBin === 'function') moveFilesToRecycleBin('batch', removed);
    saveMovements(rows.filter(function (row) {
        return !remove[String(row.id)];
    }));
    renderMovementsHistory();
}

function deleteBatches(ids) {
    if (typeof protectDeleteFile === 'function') {
        protectDeleteFile(function () {
            deleteBatchesNow(ids);
        });
        return;
    }
    deleteBatchesNow(ids);
}

function renderMovementsHistory() {
    const list = document.getElementById('movementsList');
    const empty = document.getElementById('movementsEmpty');
    if (!list) return;

    bindSearchInput('batchSearch', renderMovementsHistory);
    const query = currentSearchValue('batchSearch');
    const all = loadMovements().slice().reverse();
    const rows = all.filter(function (batch) {
        return matchesSearch(batchSearchText(batch), query);
    });
    list.innerHTML = '';

    rows.forEach(function (batch) {
        const card = document.createElement('article');
        card.className = 'batch-card';
        card.setAttribute('data-file-id', batch.id);
        const when = new Date(batch.at).toLocaleString();
        const deleteBtn = '<div class="batch-card-actions"><button type="button" class="danger-btn batch-delete-btn">Delete</button></div>';

        if (batch.type === 'purchase') {
            card.innerHTML = `
                <div class="batch-label">Purchase</div>
                <p class="batch-time">${escapeHtml(when)}</p>
                <p><strong>Amount added/purchased:</strong> +${Number(batch.quantity || 0).toFixed(2)} ${escapeHtml(batch.unit || '')} ${escapeHtml(batch.material || '')}</p>
                <p><strong>Current available ${escapeHtml(batch.material || '')}:</strong> ${Number(batch.remainingMaterial || 0).toFixed(2)} ${escapeHtml(batch.unit || '')}</p>
                ${deleteBtn}
            `;
        } else {
            const usedLines = usedMaterialsText(batch.used);
            const producedQty = typeof formatBatchQty === 'function'
                ? formatBatchQty(batch.productQty)
                : Number(batch.productQty || 0).toFixed(2);
            card.innerHTML = `
                <div class="batch-label">Production</div>
                <p class="batch-time">${escapeHtml(when)}</p>
                <p><strong>Quantity of raw material used:</strong> ${escapeHtml(usedLines)}</p>
                <p><strong>Quantity of detergent produced:</strong> ${escapeHtml(producedQty)} ${escapeHtml(batch.productUnit || '')} ${escapeHtml(batch.product || '')}</p>
                <p><strong>Remaining stock:</strong> ${escapeHtml(batch.remainingStock || '')}</p>
                ${deleteBtn}
            `;
        }

        const button = card.querySelector('.batch-delete-btn');
        if (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                deleteBatches([batch.id]);
            });
        }

        list.appendChild(card);
    });

    if (empty) {
        if (!all.length) {
            empty.textContent = 'No movements yet. Purchases in the storeroom and Produce on a daily file will appear here.';
            empty.style.display = 'block';
        } else if (!rows.length) {
            empty.textContent = 'No batches match that search.';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
        }
    }
    if (typeof bindFileSelect === 'function') {
        bindFileSelect({
            container: list,
            item: '.batch-card',
            onDelete: deleteBatchesNow
        });
    }
    if (typeof syncFileSelect === 'function') syncFileSelect(list);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

whenDbReady(renderMovementsHistory);
