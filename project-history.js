(function () {
  'use strict';

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

  // Safe renderer for project history. If element not present, logs instead.
  function renderProjectHistory(items) {
    try {
      const el = typeof document !== 'undefined' ? document.getElementById('project-history-list') : null;
      if (!el) {
        // Not running in browser context or missing element
        console.debug('renderProjectHistory (no DOM):', items);
        return;
      }

      el.innerHTML = '';

      if (!Array.isArray(items) || items.length === 0) {
        const empty = document.getElementById('project-history-empty');
        if (empty) empty.style.display = '';
        const p = document.createElement('li');
        p.className = 'text-gray-500 text-sm';
        p.textContent = 'No projects yet.';
        el.appendChild(p);
        return;
      }

      const empty = document.getElementById('project-history-empty');
      if (empty) empty.style.display = 'none';

      items.forEach(it => {
        const itemEl = document.createElement('li');
        itemEl.className = 'history-item p-2 rounded-md bg-gray-800 flex items-start justify-between';
        if (it && it.id) itemEl.dataset.id = it.id;

        const left = document.createElement('div');
        left.className = 'flex-1';

        const title = document.createElement('div');
        title.className = 'history-title font-semibold text-sm text-white';
        title.textContent = (it && it.prompt) ? it.prompt : (it && it.title) ? it.title : 'Untitled';

        const meta = document.createElement('div');
        meta.className = 'history-meta text-xs text-gray-400';
        meta.textContent = it && it.createdAt ? new Date(it.createdAt).toLocaleString() : '';

        left.appendChild(title);
        left.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'ml-3 flex items-center gap-2';

        if (it && it.videoUrl) {
          const play = document.createElement('button');
          play.type = 'button';
          play.className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded';
          play.textContent = 'Play';
          play.addEventListener('click', () => {
            const preview = document.getElementById('video-preview-container');
            if (!preview) return;
            preview.innerHTML = `<video id="video-preview" class="w-full h-full rounded-lg" controls autoplay><source src="${it.videoUrl}" type="video/mp4"></video>`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          actions.appendChild(play);
        }

        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'flex items-center justify-between w-full';
        itemWrapper.appendChild(left);
        itemWrapper.appendChild(actions);

        itemEl.appendChild(itemWrapper);
        el.appendChild(itemEl);
      });
    } catch (err) {
      console.error('renderProjectHistory failed', err);
    }
  }

  // Attach to window for global access
  try {
    if (typeof window !== 'undefined') {
      window.ProjectHistoryRepo = ProjectHistoryRepo;
      window.renderProjectHistory = renderProjectHistory;
      window.HISTORY_KEY = HISTORY_KEY;
    }
  } catch (e) {
    // ignore in non-browser contexts
  }
})();
