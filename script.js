// === ВСТАВЬ СВОЙ КОНФИГ ===
const firebaseConfig = {
  apiKey: "AIzaSyCSsrbm1-MADGYCBC2il8SLct2lcZQrWCM",
  authDomain: "stchat-bf024.firebaseapp.com",
  databaseURL: "https://stchat-bf024-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stchat-bf024",
  storageBucket: "stchat-bf024.firebasestorage.app",
  messagingSenderId: "823100651256",
  appId: "1:823100651256:web:045ea463b62c4f33e9ed0d"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const $ = id => document.getElementById(id);
const debug = msg => {
  const el = $('debug');
  if (el) el.innerHTML += msg + '<br>';
  console.log('[СтЧат]', msg);
};

// === ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ===
let isCreatingProfile = false;

onAuthStateChanged(auth, async user => {
  if (user && !isCreatingProfile) {
    debug('onAuthStateChanged: Пользователь авторизован: ' + user.uid);

    const profileSnap = await get(ref(db, `users/${user.uid}`));
    if (!profileSnap.exists()) {
      isCreatingProfile = true;
      const pending = JSON.parse(localStorage.getItem('pendingProfile') || '{}');
      if (pending.username) {
        try {
          await set(ref(db, `users/${user.uid}`), {
            username: pending.username,
            email: pending.email
          });
          debug('Профиль УСПЕШНО создан');
          localStorage.removeItem('pendingProfile');
        } catch (err) {
          debug('ОШИБКА при создании профиля: ' + err.message);
        }
      }
      isCreatingProfile = false;
    }

    if (location.pathname.includes('register.html')) {
      location.href = 'chat.html';
    }
  }
});

// === РЕГИСТРАЦИЯ ===
if ($('registerForm')) {
  $('registerForm').onsubmit = async e => {
    e.preventDefault();
    debug('Кнопка "Создать" нажата');

    const username = $('regUsername').value.trim();
    const email = $('regEmail').value.trim();
    const password = $('regPassword').value;

    if (!username || !email || !password) return alert('Заполните все поля');

    try {
      // Проверка: логин/почта заняты?
      const [userSnap, emailSnap] = await Promise.all([
        get(query(ref(db, 'users'), orderByChild('username'), equalTo(username))),
        get(query(ref(db, 'users'), orderByChild('email'), equalTo(email)))
      ]);

      if (userSnap.exists()) return alert('Логин уже занят');
      if (emailSnap.exists()) return alert('Email уже используется');

      debug('Сохраняем данные временно...');
      localStorage.setItem('pendingProfile', JSON.stringify({ username, email }));

      debug('Создаём аккаунт в Auth...');
      await createUserWithEmailAndPassword(auth, `${username}@stchat.local`, password);

      debug('Аккаунт создан. Ожидаем onAuthStateChanged...');
      // Профиль создастся автоматически в onAuthStateChanged
    } catch (err) {
      debug('ОШИБКА: ' + err.message);
      localStorage.removeItem('pendingProfile');
      alert('Ошибка: ' + err.message);
    }
  };
}

// === ВХОД ===
if ($('loginForm')) {
  $('loginForm').onsubmit = async e => {
    e.preventDefault();
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;

    try {
      await signInWithEmailAndPassword(auth, `${username}@stchat.local`, password);
      debug('Вход успешен');
      location.href = 'chat.html';
    } catch (err) {
      debug('Ошибка входа: ' + err.message);
      alert('Неверный логин или пароль');
    }
  };
}
