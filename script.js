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

// === ГЛОБАЛЬНЫЙ ОБРАБОТЧИК АВТОРИЗАЦИИ ===
onAuthStateChanged(auth, async user => {
  if (user) {
    debug('Пользователь авторизован: ' + user.uid);

    // Проверяем: профиль уже есть?
    const profileSnap = await get(ref(db, `users/${user.uid}`));
    if (!profileSnap.exists()) {
      // ЕСЛИ НЕТ — СОЗДАЁМ СЕЙЧАС (разрешение есть!)
      const pending = JSON.parse(localStorage.getItem('pendingProfile') || '{}');
      if (pending.username) {
        await set(ref(db, `users/${user.uid}`), {
          username: pending.username,
          email: pending.email
        });
        debug('Профиль создан из pending');
        localStorage.removeItem('pendingProfile');
      }
    }

    // Переход
    if (location.pathname.includes('register.html') || location.pathname.includes('login.html')) {
      location.href = 'chat.html';
    }
  } else {
    if (location.pathname.includes('chat.html')) {
      location.href = 'login.html';
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
      // 1. Проверяем логин и email
      const [userSnap, emailSnap] = await Promise.all([
        get(query(ref(db, 'users'), orderByChild('username'), equalTo(username))),
        get(query(ref(db, 'users'), orderByChild('email'), equalTo(email)))
      ]);

      if (userSnap.exists()) return alert('Логин занят');
      if (emailSnap.exists()) return alert('Email используется');

      debug('Создаём пользователя...');

      // 2. Сохраняем данные временно
      localStorage.setItem('pendingProfile', JSON.stringify({ username, email }));

      // 3. Создаём аккаунт
      await createUserWithEmailAndPassword(auth, `${username}@stchat.local`, password);
      debug('Аккаунт создан, профиль будет записан в onAuthStateChanged');

      // Профиль создастся автоматически выше
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
    } catch (err) {
      debug('Ошибка входа: ' + err.message);
      alert('Неверный логин или пароль');
    }
  };
}
