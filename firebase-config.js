// Google 登入設定（Firebase 專案 lala-food）。
// 這組網頁設定本來就會公開在網頁上；安全性靠 Firebase 的授權網域（2xin15.github.io）
// 和 Firestore 規則（firestore.rules：每個人只能讀寫自己的紀錄）。
// 改成 null 就會關閉登入，「我的紀錄」改存在使用者自己的瀏覽器。
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDClFPC4MMnQ95CFTKTjEsZpoTMBk4soNs",
  authDomain: "lala-food.firebaseapp.com",
  projectId: "lala-food",
  storageBucket: "lala-food.firebasestorage.app",
  messagingSenderId: "337560397",
  appId: "1:337560397:web:d9794336a5ce2eecf52d04"
};
