// IndexedDB helpers for an `entries` object store with autoIncrement ids
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ctos-db', 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function addEntry(entry) {
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      const r = store.add(entry);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    })
  );
}

export function deleteEntries(ids) {
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      let pending = ids.length;
      if (!pending) return resolve();
      ids.forEach((id) => {
        const r = store.delete(id);
        r.onsuccess = () => {
          pending -= 1;
          if (pending === 0) resolve();
        };
        r.onerror = () => reject(r.error);
      });
    })
  );
}

export function getAllEntries() {
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readonly');
      const store = tx.objectStore('entries');
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    })
  );
}
