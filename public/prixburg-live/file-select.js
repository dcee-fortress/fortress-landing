(function () {
    const IGNORE = 'button, input, select, textarea, a.choice-btn, .app-file-bin, label';
    const states = [];

    function checkDeleteCredentials(username, password) {
        if (typeof checkSettingsCredentials === 'function') {
            return checkSettingsCredentials(username, password);
        }
        if (typeof checkGateCredentials === 'function') {
            return checkGateCredentials(username, password);
        }
        return String(username || '').trim() === 'PRIXBURG CHEMICALS' && String(password || '') === 'Prixburg';
    }

    function ensureUi() {
        if (document.getElementById('deleteGuardOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'deleteGuardOverlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <form class="modal-card" id="deleteGuardLogin" autocomplete="off" hidden>
                <h3>Settings access</h3>
                <p>Enter the Prixburg Chemicals credentials to continue.</p>
                <div class="field">
                    <label for="deleteGuardUsername">Username</label>
                    <input id="deleteGuardUsername" type="text" name="username" autocomplete="off" required>
                </div>
                <div class="field">
                    <label for="deleteGuardPassword">Password</label>
                    <input id="deleteGuardPassword" type="password" name="password" autocomplete="off" required>
                </div>
                <p class="gate-error" id="deleteGuardError">Invalid username or password.</p>
                <div class="modal-actions">
                    <button type="button" class="action-btn" id="deleteGuardLoginCancel">Cancel</button>
                    <button type="submit" class="primary-btn">Login</button>
                </div>
            </form>
            <div class="modal-card" id="deleteGuardConfirm" hidden>
                <h3 id="deleteGuardConfirmTitle">Delete file</h3>
                <p id="deleteGuardMessage">Are you sure you want to delete this file?</p>
                <div class="modal-actions">
                    <button type="button" class="action-btn" id="deleteGuardNo">No</button>
                    <button type="button" class="danger-btn" id="deleteGuardYes">Yes</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const menu = document.createElement('div');
        menu.id = 'fileSelectMenu';
        menu.className = 'file-select-menu';
        menu.hidden = true;
        menu.innerHTML = '<button type="button" id="fileSelectMenuDelete">Delete</button>';
        document.body.appendChild(menu);

        const bar = document.createElement('div');
        bar.id = 'fileSelectBar';
        bar.className = 'file-select-bar';
        bar.innerHTML = '<button type="button" class="danger-btn" id="fileSelectBarDelete">Delete</button>';
        document.body.appendChild(bar);
    }

    function hideMenus() {
        const menu = document.getElementById('fileSelectMenu');
        if (menu) menu.hidden = true;
    }

    function closeGuard() {
        const overlay = document.getElementById('deleteGuardOverlay');
        const login = document.getElementById('deleteGuardLogin');
        const confirm = document.getElementById('deleteGuardConfirm');
        if (overlay) overlay.classList.remove('show');
        if (login) login.hidden = true;
        if (confirm) confirm.hidden = true;
        closeGuard.loginOk = null;
        closeGuard.confirmOk = null;
    }

    function showLogin(onOk) {
        ensureUi();
        closeGuard();
        const overlay = document.getElementById('deleteGuardOverlay');
        const login = document.getElementById('deleteGuardLogin');
        const error = document.getElementById('deleteGuardError');
        const user = document.getElementById('deleteGuardUsername');
        const pass = document.getElementById('deleteGuardPassword');
        closeGuard.loginOk = onOk;
        if (error) error.style.display = 'none';
        if (user) user.value = '';
        if (pass) pass.value = '';
        login.hidden = false;
        overlay.classList.add('show');
        setTimeout(function () { if (user) user.focus(); }, 0);
    }

    function showConfirm(title, message, onYes, onNo) {
        ensureUi();
        const overlay = document.getElementById('deleteGuardOverlay');
        const login = document.getElementById('deleteGuardLogin');
        const confirm = document.getElementById('deleteGuardConfirm');
        const titleEl = document.getElementById('deleteGuardConfirmTitle');
        const msg = document.getElementById('deleteGuardMessage');
        if (login) login.hidden = true;
        if (titleEl) titleEl.textContent = title;
        if (msg) msg.textContent = message;
        closeGuard.confirmOk = onYes;
        closeGuard.confirmNo = onNo;
        confirm.hidden = false;
        overlay.classList.add('show');
    }

    function bindGuardUi() {
        if (bindGuardUi.bound) return;
        bindGuardUi.bound = true;
        ensureUi();
        const overlay = document.getElementById('deleteGuardOverlay');
        const login = document.getElementById('deleteGuardLogin');
        const error = document.getElementById('deleteGuardError');

        login.addEventListener('submit', function (event) {
            event.preventDefault();
            const username = document.getElementById('deleteGuardUsername').value;
            const password = document.getElementById('deleteGuardPassword').value;
            if (!checkDeleteCredentials(username, password)) {
                if (error) error.style.display = 'block';
                return;
            }
            const ok = closeGuard.loginOk;
            closeGuard();
            if (ok) ok();
        });
        document.getElementById('deleteGuardLoginCancel').addEventListener('click', closeGuard);
        document.getElementById('deleteGuardNo').addEventListener('click', function () {
            const no = closeGuard.confirmNo;
            closeGuard();
            if (no) no();
        });
        document.getElementById('deleteGuardYes').addEventListener('click', function () {
            const ok = closeGuard.confirmOk;
            closeGuard();
            if (ok) ok();
        });
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeGuard();
        });
        ['deleteGuardUsername', 'deleteGuardPassword'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', function () {
                if (error) error.style.display = 'none';
            });
        });
        document.getElementById('fileSelectMenuDelete').addEventListener('click', function (event) {
            event.preventDefault();
            hideMenus();
            const state = activeMenuState;
            if (state) state.requestBulkDelete();
        });
        document.getElementById('fileSelectBarDelete').addEventListener('click', function (event) {
            event.preventDefault();
            const state = states.filter(function (item) { return item.selectedCount(); })[0];
            if (state) state.requestBulkDelete();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeGuard();
                hideMenus();
                states.forEach(function (state) { state.clear(); });
            }
        });
    }

    function fileLabel(count) {
        return count === 1 ? 'this file' : ('these ' + count + ' files');
    }

    window.protectDeleteFile = function (onDelete) {
        bindGuardUi();
        showLogin(function () {
            showConfirm('Delete file', 'Are you sure you want to delete this file?', function () {
                if (onDelete) onDelete();
            });
        });
    };

    window.protectDeleteFiles = function (count, onDelete) {
        bindGuardUi();
        const n = Number(count) || 0;
        if (!(n > 0)) return;
        const label = fileLabel(n);
        showConfirm('Delete files', 'Delete ' + label + '?', function () {
            showLogin(function () {
                showConfirm('Delete files', 'Are you sure you want to delete ' + label + '?', function () {
                    if (onDelete) onDelete();
                });
            });
        });
    };

    let activeMenuState = null;

    function ignored(event) {
        return !!(event.target && event.target.closest && event.target.closest(IGNORE));
    }

    function bindFileSelect(options) {
        const container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;
        if (!container) return;
        if (container.dataset.fileSelectBound === 'true') {
            container._fileSelectOptions = options;
            paint(container);
            return;
        }
        container.dataset.fileSelectBound = 'true';
        container._fileSelectOptions = options;
        container._fileSelected = {};
        bindGuardUi();

        const itemSel = options.item || '[data-file-id]';
        const state = {
            container: container,
            itemSel: itemSel,
            selected: container._fileSelected,
            armed: false,
            dragging: false,
            startItem: null,
            longPress: null,
            lastTapAt: 0,
            lastTapItem: null,
            suppressClick: false,
            selectedCount: function () {
                return Object.keys(state.selected).filter(function (id) { return state.selected[id]; }).length;
            },
            selectedIds: function () {
                return Object.keys(state.selected).filter(function (id) { return state.selected[id]; });
            },
            clear: function () {
                state.selected = container._fileSelected = {};
                state.armed = false;
                state.dragging = false;
                state.startItem = null;
                paint(container);
                hideMenus();
                updateBar();
            },
            requestBulkDelete: function () {
                const ids = state.selectedIds();
                if (!ids.length) return;
                window.protectDeleteFiles(ids.length, function () {
                    const opts = container._fileSelectOptions || options;
                    if (opts.onDelete) opts.onDelete(ids);
                    state.clear();
                });
            }
        };
        states.push(state);
        container._fileSelectState = state;

        function items() {
            return Array.prototype.slice.call(container.querySelectorAll(itemSel));
        }

        function idOf(item) {
            return item ? String(item.getAttribute('data-file-id') || '') : '';
        }

        function itemFromPoint(x, y) {
            const el = document.elementFromPoint(x, y);
            if (!el) return null;
            const item = el.closest(itemSel);
            if (!item || !container.contains(item)) return null;
            return item;
        }

        function selectRange(fromItem, toItem) {
            const list = items();
            const a = list.indexOf(fromItem);
            const b = list.indexOf(toItem);
            if (a < 0 || b < 0) return;
            const start = Math.min(a, b);
            const end = Math.max(a, b);
            state.selected = container._fileSelected = {};
            for (let i = start; i <= end; i++) {
                const id = idOf(list[i]);
                if (id) state.selected[id] = true;
            }
            paint(container);
            updateBar();
        }

        function selectOnly(item) {
            state.selected = container._fileSelected = {};
            const id = idOf(item);
            if (id) state.selected[id] = true;
            paint(container);
            updateBar();
        }

        function armSelect(item) {
            if (state.openTimer) {
                clearTimeout(state.openTimer);
                state.openTimer = null;
            }
            state.armed = true;
            state.dragging = true;
            state.startItem = item;
            state.suppressClick = true;
            selectOnly(item);
        }

        function extendSelect(event) {
            if (!state.armed && !state.dragging) return;
            const item = itemFromPoint(event.clientX, event.clientY);
            if (item && state.startItem) selectRange(state.startItem, item);
        }

        container.addEventListener('pointerdown', function (event) {
            if (event.button !== 0 && event.pointerType !== 'touch') return;
            const item = event.target.closest(itemSel);
            if (!item || !container.contains(item) || ignored(event)) {
                if (state.longPress) {
                    clearTimeout(state.longPress);
                    state.longPress = null;
                }
                return;
            }
            hideMenus();
            if (event.pointerType === 'touch') {
                const startX = event.clientX;
                const startY = event.clientY;
                state.longPress = setTimeout(function () {
                    state.longPress = null;
                    try { container.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
                    armSelect(item);
                }, 420);
                container._fileSelectTouch = { x: startX, y: startY, pointerId: event.pointerId };
                return;
            }
            const now = Date.now();
            const isDouble = event.detail >= 2 || (state.lastTapItem === item && (now - state.lastTapAt) < 500);
            state.lastTapAt = now;
            state.lastTapItem = item;
            if (isDouble || state.armed) {
                event.preventDefault();
                try { container.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
                if (!state.armed) armSelect(item);
                else {
                    state.dragging = true;
                    extendSelect(event);
                }
            }
        });

        document.addEventListener('pointermove', function (event) {
            if (state.longPress && container._fileSelectTouch) {
                const dx = event.clientX - container._fileSelectTouch.x;
                const dy = event.clientY - container._fileSelectTouch.y;
                if ((dx * dx + dy * dy) > 100) {
                    clearTimeout(state.longPress);
                    state.longPress = null;
                }
            }
            if (!state.armed && !state.dragging) return;
            if (event.buttons) event.preventDefault();
            extendSelect(event);
        });

        function endPointer(event) {
            if (state.longPress) {
                clearTimeout(state.longPress);
                state.longPress = null;
            }
            state.dragging = false;
            try { container.releasePointerCapture(event.pointerId); } catch (err) { /* ignore */ }
            setTimeout(function () { state.suppressClick = false; }, 0);
        }

        container.addEventListener('pointerup', endPointer);
        container.addEventListener('pointercancel', endPointer);

        container.addEventListener('click', function (event) {
            if (event.target.closest('button, .app-file-bin, a.choice-btn, input, select, textarea')) return;
            const item = event.target.closest(itemSel);
            if (!item || !container.contains(item)) return;
            const link = event.target.closest('a[href]');
            if (state.suppressClick || state.selectedCount() || state.dragging || state.armed) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            if (!link || event.target.closest('a.choice-btn')) return;
            event.preventDefault();
            event.stopPropagation();
            const href = link.getAttribute('href');
            if (state.openTimer) {
                clearTimeout(state.openTimer);
                state.openTimer = null;
                return;
            }
            state.openTimer = setTimeout(function () {
                state.openTimer = null;
                if (href) window.location.href = href;
            }, 280);
        }, true);

        container.addEventListener('dblclick', function (event) {
            if (ignored(event)) return;
            const item = event.target.closest(itemSel);
            if (!item || !container.contains(item)) return;
            event.preventDefault();
            if (state.openTimer) {
                clearTimeout(state.openTimer);
                state.openTimer = null;
            }
            armSelect(item);
        });

        container.addEventListener('contextmenu', function (event) {
            const item = event.target.closest(itemSel);
            if (!item || !container.contains(item) || ignored(event)) return;
            event.preventDefault();
            const id = idOf(item);
            if (!state.selected[id]) selectOnly(item);
            const menu = document.getElementById('fileSelectMenu');
            if (!menu) return;
            activeMenuState = state;
            menu.hidden = false;
            const x = Math.min(event.clientX, window.innerWidth - 160);
            const y = Math.min(event.clientY, window.innerHeight - 56);
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        });

        document.addEventListener('click', function (event) {
            if (event.target.closest('#fileSelectMenu') || event.target.closest('#fileSelectBar')) return;
            if (event.target.closest('#deleteGuardOverlay')) return;
            if (container.contains(event.target)) return;
            hideMenus();
            if (state.selectedCount()) state.clear();
        });
    }

    function paint(container) {
        const state = container && container._fileSelectState;
        if (!state) return;
        const selected = container._fileSelected || {};
        container.querySelectorAll(state.itemSel).forEach(function (item) {
            const id = item.getAttribute('data-file-id');
            if (selected[id]) item.classList.add('file-selected');
            else item.classList.remove('file-selected');
        });
        updateBar();
    }

    function updateBar() {
        const bar = document.getElementById('fileSelectBar');
        const btn = document.getElementById('fileSelectBarDelete');
        if (!bar) return;
        let count = 0;
        states.forEach(function (state) {
            const n = state.selectedCount();
            if (n) count = n;
        });
        if (count) {
            bar.classList.add('show');
            if (btn) btn.textContent = count === 1 ? 'Delete this file' : ('Delete ' + count + ' files');
        } else {
            bar.classList.remove('show');
        }
    }

    window.bindFileSelect = bindFileSelect;
    window.syncFileSelect = function (container) {
        if (!container) return;
        paint(container);
    };
})();
