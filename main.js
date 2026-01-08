// Config is provided by ./config.js
import { SHEET_ID, GAS_URL } from './config.js';

// IndexedDB helpers are provided by ./idb.js
import { openDB, addEntry, deleteEntries, getAllEntries } from './idb.js';

// Persist last synced id so we remember progress across browser restarts
function setLastSyncedId(id) {
  try { localStorage.setItem('lastSyncedId', String(id)); } catch (e) { console.warn(e); }
}

function getLastSyncedId() {
  try { const v = localStorage.getItem('lastSyncedId'); return v ? Number(v) : 0; } catch (e) { console.warn(e); return 0; }
}

function renderEntries(listEl, entries) {
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!entries || !entries.length) return;
  // show newest first
  entries.slice().reverse().forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'collection-item';
    // show date only (no time)
    const dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';
    const weight = entry.weight != null ? entry.weight : '';
    const waist = entry.waist != null ? entry.waist : '';
    const height = entry.height != null ? entry.height : '';
    const ratio = entry.ratio != null ? Number(entry.ratio).toFixed(2) : '';
    li.innerHTML = `<div><strong>#${entry.id}</strong> — ${dateStr}</div>
                      <div>Weight: ${weight} kg · Waist: ${waist} cm · Height: ${height} cm · W/H: ${ratio}</div>`;
    listEl.appendChild(li);
  });
}

// Send rows to Google Sheets via a Google Apps Script webapp URL.
// Use 'text/plain' JSON body to avoid preflight while still sending structured data.
// The server will parse the raw POST body as JSON.
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

document.addEventListener('DOMContentLoaded', function () {
  const savedEl = document.getElementById('saved');
  const listEl = document.getElementById('entries');

  getAllEntries().then((entries) => {
    if (entries && entries.length) {
      if (savedEl) savedEl.textContent = 'Total saved: ' + entries.length;
      renderEntries(listEl, entries);
    } else {
      if (savedEl) savedEl.textContent = 'No saved date yet.';
    }
  }).catch((err) => {
    console.error('IDB read error', err);
    if (savedEl) savedEl.textContent = 'No saved date yet.';
  });

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
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
        renderEntries(listEl, entries);
        // clear inputs after successful save
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

  const syncBtnEl = document.getElementById('syncBtn');
  if (syncBtnEl) {
    syncBtnEl.addEventListener('click', function () {
      const syncBtn = syncBtnEl;
      syncBtn.disabled = true;
      const prev = getLastSyncedId();
      if (window.M && M.toast) M.toast({ html: 'Starting sync...' });
      getAllEntries().then((entries) => {
        // sort ascending by id, only sync those with id > prev
        const sorted = (entries || []).slice().sort((a,b)=>a.id-b.id);
        const toSync = sorted.filter(e => e.id > prev);
        if (!toSync.length) {
          if (window.M && M.toast) M.toast({ html: 'Nothing to sync' });
          syncBtn.disabled = false;
          return Promise.resolve();
        }
        // convert to rows; send id, date, weight, waist, height, ratio
        const rows = toSync.map(e => [e.id, e.date, e.weight, e.waist, e.height, e.ratio]);
        return sendToSheets(rows).then((res) => {
          // on success delete synced entries
          const ids = toSync.map(e => e.id);
          return deleteEntries(ids).then(() => {
            // update lastSyncedId to highest synced id
            const maxId = Math.max.apply(null, ids);
            setLastSyncedId(maxId);
            return getAllEntries();
          });
        });
      }).then((entriesAfter) => {
        if (entriesAfter) {
          if (savedEl) savedEl.textContent = 'Total saved: ' + entriesAfter.length;
          renderEntries(listEl, entriesAfter);
        }
        if (window.M && M.toast) M.toast({ html: 'Sync complete' });
      }).catch((err) => {
        console.error('Sync error', err);
        if (window.M && M.toast) M.toast({ html: 'Sync failed' });
      }).finally(() => { syncBtn.disabled = false; });
    });
  }
});