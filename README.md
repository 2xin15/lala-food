# 跟拉拉熊一起吃

拉拉熊吃過的店與愛心清單，資料來自 Google 地圖清單，加上他在 Threads 上的原始評價。

網站分三個分頁：

- **美食地圖**（`#map`）：地圖找店、地區／類型複選篩選、隨機推薦；點店家會顯示 Google 地圖與拉拉熊的評價
- **美食清單**（`#list`）：卡片或列表顯示；手機上每個類型一排、左右滑
- **我的紀錄**（`#me`）：使用者標記「我吃過」「已存到地圖」的店

## 檔案

| 檔案 | 內容 |
|---|---|
| `index.html` / `style.css` / `app.js` | 網頁本體 |
| `data.js` | 由 `update.mjs` 從 Google 地圖清單產生 |
| `extra.json` | 手動補充：加進已去過、從愛心移到已去過、從已去過排除 |
| `posts.js` | 每家店對應的拉拉熊 Threads 貼文（依 Google 地點 CID） |
| `firebase-config.js` / `cloud.js` / `firestore.rules` | Google 登入與雲端紀錄 |

## 更新資料

`node update.mjs`，然後 commit 並 push `data.js`。

改了 `app.js`、`style.css` 或資料檔之後，把 `index.html` 裡的 `?v=數字` 加 1，避免訪客拿到舊的快取。

## 開啟 Google 登入

沒設定時網站照常運作，「我的紀錄」會存在使用者自己的瀏覽器裡。要讓使用者用 Google 登入、在手機和電腦之間同步：

1. 到 [Firebase 主控台](https://console.firebase.google.com/) 建立專案（不需要開 Google Analytics）。
2. **Authentication** → 開始使用 → 登入方式選 **Google** → 啟用。
3. **Authentication → 設定 → 授權網域**，加入 `2xin15.github.io`。
4. **Firestore Database** → 建立資料庫（正式版模式，地區選 `asia-east1`）。
5. Firestore 的 **規則** 分頁，貼上 `firestore.rules` 的內容並發布（每個人只能讀寫自己的紀錄）。
6. 專案設定 → 一般 → 你的應用程式 → 新增 **網頁** 應用程式，複製 `firebaseConfig`。
7. 把設定貼進 `firebase-config.js`：

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "你的專案.firebaseapp.com",
     projectId: "你的專案",
     appId: "1:...:web:..."
   };
   ```

8. 把 `index.html` 的 `?v=` 加 1，commit 並 push。

Firebase 的網頁設定（apiKey 等）本來就會公開在網頁上，安全性靠的是第 3 步的授權網域和第 5 步的資料庫規則。
