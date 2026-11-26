// Google 登入與雲端紀錄（Firebase Auth + Firestore）
// firebase-config.js 填好設定後才會載入；沒填時網站照常運作，紀錄存在瀏覽器裡。
// 每位使用者的資料存在 users/{uid}：{ eaten: {cid: 時間}, saved: {cid: 時間} }
const cfg = window.FIREBASE_CONFIG;
const V = '10.12.2';

if (cfg && cfg.apiKey) {
  try {
    const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } =
      await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
    const { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } =
      await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

    const app = initializeApp(cfg);
    const auth = getAuth(app);
    auth.languageCode = 'zh-TW';
    const db = getFirestore(app);
    let unsub = null;

    window.LalaCloud = {
      async signIn() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          await signInWithPopup(auth, provider);
        } catch (e) {
          // 手機瀏覽器擋彈出視窗時，改用整頁跳轉
          if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(auth, provider);
          } else throw e;
        }
      },
      signOut: () => signOut(auth),
      save(marks) {
        const u = auth.currentUser;
        if (!u) return Promise.resolve();
        return setDoc(doc(db, 'users', u.uid), { eaten: marks.eaten || {}, saved: marks.saved || {}, updatedAt: serverTimestamp() });
      },
    };

    onAuthStateChanged(auth, user => {
      if (unsub) { unsub(); unsub = null; }
      const u = user && { uid: user.uid, name: user.displayName, photo: user.photoURL, email: user.email };
      window.dispatchEvent(new CustomEvent('lala-user', { detail: { user: u } }));
      if (user) {
        unsub = onSnapshot(doc(db, 'users', user.uid),
          snap => window.dispatchEvent(new CustomEvent('lala-marks', { detail: { marks: snap.exists() ? snap.data() : null } })),
          err => { console.error(err); window.dispatchEvent(new CustomEvent('lala-cloud-error', { detail: String(err) })); });
      }
    });
  } catch (e) {
    console.error(e);
    window.dispatchEvent(new CustomEvent('lala-cloud-error', { detail: String(e) }));
  }
}
