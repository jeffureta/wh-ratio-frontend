// Button-related behavior extracted from main.js
import { SHEET_ID, GAS_URL } from './config.js';
import { addEntry, deleteEntries, getAllEntries } from './idb.js';

function setLastSyncedId(id) {
  try { localStorage.setItem('lastSyncedId', String(id)); } catch (e) { console.warn(e); }
}

function getLastSyncedId() {
  try { const v = localStorage.getItem('lastSyncedId'); return v ? Number(v) : 0; } catch (e) { console.warn(e); return 0; }
}

function sendToSheets(rows) {
  if (!GAS_URL || GAS_URL.includes('REPLACE_WITH')) {
    return Promise.reject(new Error('GAS_URL not configured. Deploy an Apps Script web app and set GAS_URL.'));
  }
  const payload = { sheetId: SHEET_ID, rows };
  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  }).then((res) => {
    if (!res.ok) throw new Error('Sheets sync failed: ' + res.statusText);
    return res.json();
  });
}

export function setupButtons(saveBtnEl, syncBtnEl, savedEl, listEl, renderEntries) {
  if (saveBtnEl) {
    saveBtnEl.addEventListener('click', function () {
      const weightInput = document.getElementById('weightInput');
      const waistInput = document.getElementById('waistInput');
      const weightVal = parseFloat(weightInput && weightInput.value);
      const waistVal = parseFloat(waistInput && waistInput.value);
      if (Number.isNaN(weightVal) || Number.isNaN(waistVal)) {
        if (window.M && M.toast) M.toast({ html: 'Please enter weight and waist values' });
        return;
      }
      const heightVal = 170; // fixed
      const ratio = waistVal / heightVal;
      const entry = {
        date: new Date().toISOString(),
        weight: weightVal,
        waist: waistVal,
        height: heightVal,
        ratio: ratio
      };
      addEntry(entry).then(() => {
        if (window.M && M.toast) M.toast({ html: 'Saved: ' + new Date(entry.date).toLocaleString() });
        return getAllEntries();
      }).then((entries) => {
        if (savedEl) savedEl.textContent = 'Total saved: ' + entries.length;
        if (typeof renderEntries === 'function') renderEntries(listEl, entries);
        try {
          if (weightInput) weightInput.value = '';
          if (waistInput) waistInput.value = '';
          const lw = document.querySelector('label[for="weightInput"]');
          const lwa = document.querySelector('label[for="waistInput"]');
          if (lw) lw.classList.remove('active');
          if (lwa) lwa.classList.remove('active');
        } catch (e) { console.warn('clear inputs failed', e); }
      }).catch((err) => {
        console.error('IDB write error', err);
        if (window.M && M.toast) M.toast({ html: 'Save failed' });
      });
    });
  }

  if (syncBtnEl) {
    syncBtnEl.addEventListener('click', function () {
      const syncBtn = syncBtnEl;
      syncBtn.disabled = true;
      const prev = getLastSyncedId();
      if (window.M && M.toast) M.toast({ html: 'Starting sync...' });
      getAllEntries().then((entries) => {
        const sorted = (entries || []).slice().sort((a,b)=>a.id-b.id);
        const toSync = sorted.filter(e => e.id > prev);
        if (!toSync.length) {
          if (window.M && M.toast) M.toast({ html: 'Nothing to sync' });
          syncBtn.disabled = false;
          return Promise.resolve();
        }
        const rows = toSync.map(e => [e.id, e.date, e.weight, e.waist, e.height, e.ratio]);
        return sendToSheets(rows).then((res) => {
          const ids = toSync.map(e => e.id);
          return deleteEntries(ids).then(() => {
            const maxId = Math.max.apply(null, ids);
            setLastSyncedId(maxId);
            return getAllEntries();
          });
        });
      }).then((entriesAfter) => {
        if (entriesAfter) {
          if (savedEl) savedEl.textContent = 'Total saved: ' + entriesAfter.length;
          if (typeof renderEntries === 'function') renderEntries(listEl, entriesAfter);
        }
        if (window.M && M.toast) M.toast({ html: 'Sync complete' });
      }).catch((err) => {
        console.error('Sync error', err);
        if (window.M && M.toast) M.toast({ html: 'Sync failed' });
      }).finally(() => { syncBtn.disabled = false; });
    });
  }
}
