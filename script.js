// === ВСТАВЬ СВОЙ firebaseConfig ===
const firebaseConfig = {
  apiKey: "AIzaSyCSsrbm1-MADGYCBC2il8SLct2lcZQrWCM",
  authDomain: "stchat-bf024.firebaseapp.com",
  databaseURL: "https://stchat-bf024-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stchat-bf024",
  storageBucket: "stchat-bf024.firebasestorage.app",
  messagingSenderId: "823100651256",
  appId: "1:823100651256:web:045ea463b62c4f33e9ed0d"
};
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// === ГЛОБАЛЬНЫЙ АВТОВХОД (НА ВСЕХ СТРАНИЦАХ) ===
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname.split('/').pop();

  // Если пользователь авторизован → сразу в чат
  if (user && (path === 'index.html' || path === '' || path === 'login.html' || path === 'register.html')) {
    window.location.href = 'chat.html';
  }
  // Если не авторизован и на чате → на логин
  else if (!user && path === 'chat.html') {
    window.location.href = 'login.html';
  }
});

// === РЕГИСТРАЦИЯ ПО ЛОГИНУ ===
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;

    if (username.length < 3) return alert('Логин должен быть минимум 3 символа');

    const email = `${username}@stchat.local`;

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert('Аккаунт создан: ' + username);
        window.location.href = 'chat.html';
      })
      .catch(err => alert('Ошибка: ' + err.message));
  });
}

// === ВХОД ПО ЛОГИНУ ===
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    const email = `${username}@stchat.local`;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        window.location.href = 'chat.html';
      })
      .catch(err => {
        if (err.code === 'auth/user-not-found') {
          alert('Логин не найден');
        } else if (err.code === 'auth/wrong-password') {
          alert('Неверный пароль');
        } else {
          alert('Ошибка: ' + err.message);
        }
      });
  });
}

// === ВЫХОД ===
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    });
  });
}

// === ЧАТ ===
if (document.getElementById('messages')) {
  onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const displayName = user.email.split('@')[0];

    const messagesRef = ref(db, 'messages');
    const messagesDiv = document.getElementById('messages');

    onValue(messagesRef, (snapshot) => {
      messagesDiv.innerHTML = '';
      const messages = snapshot.val() || {};
      Object.keys(messages).forEach(id => {
        const msg = messages[id];
        const div = document.createElement('div');
        div.className = `message ${msg.uid === user.uid ? 'own' : ''}`;
        div.innerHTML = `
          <div class="author">${msg.displayName}</div>
          ${msg.text}
        `;
        messagesDiv.appendChild(div);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    document.getElementById('messageForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text) return;

      push(messagesRef, {
        text,
        uid: user.uid,
        displayName: displayName,
        timestamp: serverTimestamp()
      });

      input.value = '';
    });
  });
}
