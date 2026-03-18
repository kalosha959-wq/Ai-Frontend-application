(function () {
    // Project history: repository abstraction so we can swap localStorage for backend later
    const HISTORY_KEY = 'aiStoryStudioProjectHistory';

    // Helper: generate a stable-ish id if caller didn't provide one
    function generateId() {
        return `proj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    }

    function hasLocalStorage() {
        try {
            return typeof localStorage !== 'undefined' && localStorage !== null;
        } catch (err) {
            return false;
        }
    }

    const ProjectHistoryRepo = {
        async list() {
            try {
                if (!hasLocalStorage()) return [];
                const raw = localStorage.getItem(HISTORY_KEY);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                console.error('Failed to read history from localStorage', err);
                return [];
            }
        },

        async save(newItem) {
            try {
                if (!newItem) throw new Error('No item provided to save');

                const itemToSave = {
                    ...newItem,
                    id: newItem.id || generateId(),
                    createdAt: newItem.createdAt || new Date().toISOString()
                };

                const existing = await ProjectHistoryRepo.list();
                const withoutDup = existing.filter(item => item && item.id !== itemToSave.id);
                const updated = [itemToSave, ...withoutDup].slice(0, 20);

                if (hasLocalStorage()) {
                    try {
                        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
                    } catch (err) {
                        console.error('Failed to write history to localStorage', err);
                    }
                }

                return updated;
            } catch (err) {
                console.error('Failed to save history to localStorage', err);
                return [];
            }
        }
    };

    // Safe DOM rendering for project history (used by frontend)
    function renderProjectHistory(items) {
        try {
            if (!Array.isArray(items)) items = [];
            const listEl = (typeof document !== 'undefined') && document.getElementById('project-history-list');
            const emptyEl = (typeof document !== 'undefined') && document.getElementById('project-history-empty');
            if (!listEl) {
                console.debug('renderProjectHistory (no DOM):', items);
                return;
            }

            listEl.innerHTML = '';

            if (!items.length) {
                if (emptyEl) emptyEl.classList.remove('hidden');
                listEl.innerHTML = '';
                return;
            }

            if (emptyEl) emptyEl.classList.add('hidden');

            items.forEach(it => {
                const li = document.createElement('li');
                li.className = 'project-history-entry p-2 rounded hover:bg-gray-800 cursor-pointer';
                li.dataset.id = it.id || '';

                const title = document.createElement('div');
                title.className = 'history-title font-semibold';
                title.textContent = it && it.prompt ? it.prompt : (it && it.title ? it.title : 'Untitled');

                const meta = document.createElement('div');
                meta.className = 'history-meta text-xs text-gray-400';
                const when = it && it.completedAt ? it.completedAt : it && it.createdAt ? it.createdAt : null;
                meta.textContent = when ? new Date(when).toLocaleString() : '';

                li.appendChild(title);
                li.appendChild(meta);

                li.addEventListener('click', () => {
                    // When user clicks a history item, dispatch a custom event so the page can react
                    const ev = new CustomEvent('projectHistory:selected', { detail: it });
                    window.dispatchEvent(ev);
                });

                listEl.appendChild(li);
            });
        } catch (err) {
            console.error('Failed to render project history', err);
        }
    }

    async function loadProjectHistory() {
        const historyItems = await ProjectHistoryRepo.list();
        renderProjectHistory(historyItems);
    }

    async function saveProjectToHistory(projectMeta) {
        const updatedItems = await ProjectHistoryRepo.save(projectMeta);
        renderProjectHistory(updatedItems);
    }

    async function getHistoryItems() {
        return await ProjectHistoryRepo.list();
    }

    // Expose API on window for legacy inline scripts
    if (typeof window !== 'undefined') {
        window.ProjectHistoryRepo = ProjectHistoryRepo;
        window.loadProjectHistory = loadProjectHistory;
        window.saveProjectToHistory = saveProjectToHistory;
        window.getHistoryItems = getHistoryItems;
        window.renderProjectHistory = renderProjectHistory;
        window.HISTORY_KEY = HISTORY_KEY;
    }
})();
