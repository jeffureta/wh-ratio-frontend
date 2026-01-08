## Product Requirements Document (PRD): V-Shape Tracker

**Project Owner:** [Your Name]

**Status:** Draft / Development

**Last Updated:** January 8, 2026

---

### 1. Product Summary

The **V-Shape Tracker** is a specialized fitness utility designed to monitor the **Waist-to-Height Ratio (WtHR)** in relation to body weight. Unlike traditional weight trackers, this focuses on "V-taper" progress by tracking waist reduction against a fixed height and fluctuating weight.

### 2. Target Audience

* Individuals focused on aesthetic body recomposition (fat loss at the midsection).
* Users aiming for a V-shape physique.
* Self-trackers who prefer simple, custom-built tools over bloated fitness apps.

### 3. Core Features

* **Hybrid Storage:** * **Offline:** Data is stored locally using **IndexedDB** for immediate access and persistence without internet.
* **Online:** Data is synced to **Google Sheets** via **Google Apps Script** for long-term tracking and visualization.


* **Algorithm Integration:** Height is "baked-in" to the logic to automatically calculate the Waist-to-Height ratio upon entry.
* **Sync Logic:** Manual trigger to push local records to the cloud.

---

### 4. UI & Styling

**Styling Philosophy:** Minimalist and clean, utilizing **Materialize CSS** for a responsive, mobile-first design.

* **Inputs:** * `Weight (kg)`: Number input.
* `Waist (cm)`: Number input.


* **Action Buttons:**
* `Save`: Commits data to IndexedDB.
* `Sync`: Initiates the POST request to Google Apps Script.


* **Display:**
* **Offline Panel:** A table or list view showing data currently held in IndexedDB that hasn't been synced or was recently added.


* **Feedback System:**
* **Toasts/Modals:** "Data Saved Locally" or "Sync Successful" pop-ups.
* **Error Handling:** Visual alerts if the Google Sheets API is unreachable.



---

### 5. Navigation & Accessibility

* **Single Page Application (SPA):** All interactions occur on one screen to minimize friction.
* **Keyboard Support:** * Full **Tab** index support for navigating between inputs and buttons.
* **Enter** key triggers the "Save" action when the waist input is focused.



### 6. Technical Specifications

* **Frontend:** HTML5, Vanilla JavaScript.
* **Framework:** Materialize CSS (CDN).
* **Local Database:** IndexedDB (for robust offline storage).
* **Cloud Database:** Google Sheets.
* **Middleware:** Google Apps Script (`doPost` web app).

### 7. Data Structure (Sample)

Each entry is stored as an object:

```json
{
  "key": 1,
  "date": "2026-01-08T23:00:00Z",
  "weight": 71,
  "waist": 85,
  "height": 170,
  "wh_ratio": 0.50
}

```

---

### 8. Use Cases

1. **Offline Recording:** User is at the gym with no signal. They input weight/waist. Data saves to IndexedDB.
2. **Cloud Sync:** User returns home to Wi-Fi. They press "Sync." Data is sent to Google Sheets.
3. **Visualization:** User opens Google Sheets to see their progress chart (Dashboard) generated from the synced rows.

### 9. Out of Scope

* **Multi-user Support:** No login system; built for a single local user.
* **Social Features:** No sharing or community feeds.
* **Automatic Sync:** Manual button click is required for this version.

---

**Would you like me to generate the HTML boilerplate using Materialize CSS that fits this PRD?**