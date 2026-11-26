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
| `data.js` | 由 `update.mjs` 從 Google 地圖清單和 lala-food-feed 產生 |
| `extra.json` | 手動補充：加進已去過、從愛心移到已去過、從已去過排除 |
| `posts.js` | 每家店對應的拉拉熊 Threads 貼文（依 Google 地點 CID），手動整理 |
| `feed-posts.js` | 由 `update.mjs` 產生：lala-food-feed 找到、`posts.js` 還沒有的貼文，接在手動的後面顯示 |
| `feed/` | 由 `update.mjs` 產生：上次成功讀到的 lala-food-feed 快照（feed 讀不到時用它） |
| `firebase-config.js` / `cloud.js` / `firestore.rules` | Google 登入與雲端紀錄 |

## 更新資料

**自動**：GitHub Actions（`.github/workflows/update-data.yml`）每天台灣時間 04:17 抓兩份 Google 地圖清單和 lala-food-feed，有變動才 commit，GitHub Pages 會自動重新部署。

- 執行紀錄與每次新增／移除的店：repo 的 **Actions** 分頁 →「每日更新清單資料」
- 想馬上更新：同一頁按 **Run workflow**
- 改了 `update.mjs`、`extra.json`、`notes.json` 推上去，也會自動重算
- 安全檢查：任一清單一次少超過三成會判定抓取失敗、不更新（GitHub 會寄信通知）。確定是真的刪減，Run workflow 時勾「略過安全檢查」
- 公開 repo 連續 60 天沒有 commit 會停用排程；工作流程超過 50 天會自動寫一筆 `.github/keepalive` 保持運作

**手動**：`node update.mjs`，然後 commit 並 push `data.js`、`feed-posts.js`、`feed/`。

### lala-food-feed（Threads 自動整理）

[lala-food-feed](https://poterpan.github.io/lala-food-feed/) 每天 4 次讀拉拉熊在 Threads 上的貼文與回覆，整理出他吃過的店和提到這些店的貼文。`update.mjs` 會把它合併進來：

- **已去過**：拉拉熊自己說吃過、或照片拍到的店。只有網友推薦、他本人沒說過的店不會加進來。在愛心清單裡的會移到已去過，不在清單裡的直接加入。
- **貼文**：拉拉熊自己提到這家店的貼文和回覆，寫進 `feed-posts.js`，顯示在 `posts.js` 的手動貼文後面。
- **手動設定優先**：`extra.json` 的 `visited_remove` 裡的店不會被 feed 加回來；分類用 `update.mjs` 自己的規則（規則判成「其他美食」時才參考 feed 的分類）。發現 feed 加錯的店，放進 `visited_remove` 就好。
- **讀不到時**：用 `feed/` 裡上次成功的快照，網站不會因為 feed 暫時壞掉而少掉店。每次 commit 的 `feed/` 差異，就是 feed 這次改了什麼。
- **安全**：feed 是外部資料，每一筆都會檢查（CID 必須是數字、貼文網址必須是 threads.com 的貼文、座標必須是數字），不合格的直接略過。
- **停用**：把 `update.mjs` 裡的 `FEED` 改成 `''`。

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
