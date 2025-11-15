// === ВСТАВЬ СВОЙ КОНФИГ (ОБЯЗАТЕЛЬНО!) ===
const firebaseConfig = {
  apiKey: "AIzaSyCSsrbm1-MADGYCBC2il8SLct2lcZQrWCM",
  authDomain: "stchat-bf024.firebaseapp.com",
  databaseURL: "https://stchat-bf024-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stchat-bf024",
  storageBucket: "stchat-bf024.firebasestorage.app",
  messagingSenderId: "823100651256",
  appId: "1:823100651256:web:045ea463b62c4f33e9ed0d"
};

// === ОТЛАДКА ===
const debug = msg => {
  const el = document.getElementById('debug');
  if (el) el.innerHTML += msg + '<br>';
  console.log('[СтЧат]', msg);
};

debug('Скрипт загружен');

// === ИМПОРТЫ ===
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

debug('Firebase импортирован');

// === ИНИЦИАЛИЗАЦИЯ ===
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  debug('Firebase инициализирован');
} catch (err) {
  debug('ОШИБКА: ' + err.message);
}

// === РЕГИСТРАЦИЯ ===
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  debug('Форма регистрации найдена');

  registerForm.onsubmit = async e => {
    e.preventDefault();
    debug('Кнопка нажата');

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    debug(`Данные: ${username}, ${email}, ${password.substring(0,3)}...`);

    if (!username || !email || !password) {
      debug('Пустые поля');
      return alert('Заполните все поля');
    }

    try {
      // Проверка: логин занят?
      const userSnap = await get(query(ref(db, 'users'), orderByChild('username'), equalTo(username)));
      if (userSnap.exists()) {
        debug('Логин занят');
        return alert('Логин уже занят');
      }

      // Проверка: email занят?
      const emailSnap = await get(query(ref(db, 'users'), orderByChild('email'), equalTo(email)));
      if (emailSnap.exists()) {
        debug('Email занят');
        return alert('Email уже используется');
      }

      debug('Создаём аккаунт...');
      const cred = await createUserWithEmailAndPassword(auth, `${username}@stchat.local`, password);
      debug(`UID: ${cred.user.uid}`);

      await set(ref(db, `users/${cred.user.uid}`), { username, email });
      debug('Аккаунт создан в БД');

      alert('Аккаунт создан! Вход...');
      location.href = 'chat.html';
    } catch (err) {
      debug('ОШИБКА: ' + err.message);
      alert('Ошибка: ' + err.message);
    }
  };
} else {
  debug('Форма НЕ найдена');
}
