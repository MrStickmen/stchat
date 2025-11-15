// === ВСТАВЬ СВОЙ firebaseConfig СЮДА ===
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

// === РЕГИСТРАЦИЯ ===
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert('Аккаунт успешно создан!');
        window.location.href = 'chat.html';
      })
      .catch(err => {
        alert('Ошибка: ' + err.message);
      });
  });
}

// === ВХОД ===
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        window.location.href = 'chat.html';
      })
      .catch(err => {
        alert('Ошибка входа: ' + err.message);
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
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const messagesRef = ref(db, 'messages');
    const messagesDiv = document.getElementById('messages');

    // Загрузка сообщений
    onValue(messagesRef, (snapshot) => {
      messagesDiv.innerHTML = '';
      const messages = snapshot.val() || {};
      Object.keys(messages).forEach(id => {
        const msg = messages[id];
        const div = document.createElement('div');
        div.className = `message ${msg.uid === user.uid ? 'own' : ''}`;
        div.innerHTML = `
          <div class="author">${msg.displayName || 'Аноним'}</div>
          ${msg.text}
        `;
        messagesDiv.appendChild(div);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Отправка сообщения
    document.getElementById('messageForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text) return;

      push(messagesRef, {
        text,
        uid: user.uid,
        displayName: user.email.split('@')[0],
        timestamp: serverTimestamp()
      });

      input.value = '';
    });
  });
}