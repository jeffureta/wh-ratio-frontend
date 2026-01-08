Save weight & waist entries to IndexedDB and optionally sync to Google Sheets

Open `index.html` in a browser. Use the inputs and click `Save Now` to store a measurement in the browser's IndexedDB database `ctos-db`, object store `entries`.

Each saved entry has this shape (no `id` until written by IndexedDB):

```
{
	date: '<ISO date string>',
	weight: <number, kg>,
	waist: <number, cm>,
	height: <number, cm> (fixed 170 in the UI),
	ratio: <number> (waist / height)
}
```

IndexedDB automatically assigns an `id` to each saved object (autoIncrement key).

Inspect stored values in Chrome DevTools: Application → IndexedDB → `ctos-db` → `entries`.

Files overview

- `index.html` — UI and module loader.
- `main.js` — UI wiring and sync orchestration (loads as an ES module).
- `idb.js` — IndexedDB helper functions: `openDB`, `addEntry`, `getAllEntries`, `deleteEntries`.
- `config.js` — runtime constants: `SHEET_ID`, `GAS_URL`.

Google Sheets sync (how it works)

1. Capture: `index.html` reads the two inputs (`weightInput`, `waistInput`) and `main.js` constructs an entry with `date`, `weight`, `waist`, `height` (170), and `ratio`.
2. Persist: the entry is saved to IndexedDB via `addEntry()` exported from `idb.js`.
3. Trigger sync: when you click `Sync Now`, `main.js` reads all entries with `getAllEntries()` and selects those with `id > lastSyncedId` (where `lastSyncedId` is stored in `localStorage` under the key `lastSyncedId`).
4. Format rows: the client maps selected entries into row arrays of the form:

```
[ id, date, weight, waist, height, ratio ]
```

5. Send to Sheets: the client POSTs a payload to `GAS_URL`:

```
{ "sheetId": "<sheet id>", "rows": [ [id, date, weight, waist, height, ratio], ... ] }
```

`main.js` uses `fetch()` to POST the payload. The code sends a plain/text JSON body (`Content-Type: text/plain;charset=utf-8`) in the example to reduce preflight issues in some environments; alternatively you may send `application/x-www-form-urlencoded` (form-encoded `sheetId` + `rows` JSON string) to avoid preflight entirely — the sample `Code.gs` provided below supports form-encoded fields.

6. On success: the Apps Script should return a JSON response like `{ status: 'ok' }`. `main.js` then deletes the synced entries from IndexedDB with `deleteEntries()` and sets `localStorage.lastSyncedId` to the highest synced `id` so future syncs skip already-synced items.

Example Apps Script (Code.gs)

```javascript
function doPost(e) {
	try {
		var sheetId = e.parameter && e.parameter.sheetId;
		var rows = [];
		if (e.parameter && e.parameter.rows) rows = JSON.parse(e.parameter.rows);

		if (rows.length && sheetId) {
			var ss = SpreadsheetApp.openById(sheetId);
			var sheet = ss.getSheets()[0];
			sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
		}

		return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
	} catch (err) {
		return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
	}
}
```

Deployment notes

- Deploy the Apps Script as a Web App (Execute as: Me, Who has access: Anyone, even anonymous) and copy the deployed URL into `config.js` as `GAS_URL`.
- If you prefer minimal CORS complexity: send `application/x-www-form-urlencoded` from the browser (form fields `sheetId` and `rows` where `rows` is a JSON string). That avoids OPTIONS preflight.

Developer notes

- `config.js` centralizes `SHEET_ID` / `GAS_URL` so you can override them per environment.
- `idb.js` contains the persistence primitives; `main.js` focuses on UI wiring and orchestration (saving, rendering, and syncing).


