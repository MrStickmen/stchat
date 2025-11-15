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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentChatId = null;

// === Рендер приложения ===
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar">
      <div class="header">
        <h1>СтЧат</h1>
        <button class="btn-icon" id="addBtn">➕</button>
      </div>
      <div class="chat-list" id="chatList"></div>
    </div>
    <div class="main-chat" id="mainChat">
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">
        Выберите чат
      </div>
    </div>

    <!-- Модальные окна -->
    <div class="modal" id="addModal" style="display:none;">
      <div class="modal-content">
        <h3>Добавить</h3>
        <button class="modal-btn" data-action="friend">➕ Друга</button>
        <button class="modal-btn" data-action="group">📋 Группу</button>
        <button class="modal-btn" data-action="requests">📥 Запросы</button>
        <div style="margin-top:20px;">
          <button class="cancel" id="closeAdd">Закрыть</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('addBtn').onclick = () => showModal('addModal');
  document.getElementById('closeAdd').onclick = () => hideModal('addModal');

  // Обработка кнопок
  document.querySelectorAll('.modal-btn').forEach(btn => {
    btn.onclick = () => handleAddAction(btn.dataset.action);
  });
}

// === Модальные окна ===
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }

// === Добавление ===
function handleAddAction(action) {
  hideModal('addModal');
  if (action === 'friend') showAddFriend();
  if (action === 'group') showCreateGroup();
  if (action === 'requests') showFriendRequests();
}

// === Авторизация ===
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const username = user.email.split('@')[0];
    renderApp();
    loadChats();
  } else {
    showAuth();
  }
});

// === Авторизация (встроенная) ===
function showAuth() {
  document.getElementById('app').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#667eea;color:white;">
      <h1 style="font-size:3rem;margin-bottom:30px;">СтЧат</h1>
      <div style="background:white;color:#333;padding:30px;border-radius:16px;width:320px;">
        <h2 id="authTitle">Вход</h2>
        <input type="text" id="username" placeholder="Логин" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:12px;" />
        <input type="password" id="password" placeholder="Пароль" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:12px;" />
        <button id="authBtn" style="width:100%;padding:12px;margin:10px 0;background:#667eea;color:white;border:none;border-radius:12px;cursor:pointer;">Войти</button>
        <p style="text-align:center;"><a href="#" id="toggleAuth" style="color:#667eea;">Регистрация</a></p>
      </div>
    </div>
  `;

  document.getElementById('authBtn').onclick = handleAuth;
  document.getElementById('toggleAuth').onclick = (e) => {
    e.preventDefault();
    const isLogin = document.getElementById('authTitle').textContent === 'Вход';
    document.getElementById('authTitle').textContent = isLogin ? 'Регистрация' : 'Вход';
    document.getElementById('authBtn').textContent = isLogin ? 'Создать' : 'Войти';
    document.getElementById('toggleAuth').textContent = isLogin ? 'Вход' : 'Регистрация';
  };
}

function handleAuth() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const isLogin = document.getElementById('authTitle').textContent === 'Вход';
  const email = `${username}@stchat.local`;

  if (isLogin) {
    signInWithEmailAndPassword(auth, email, password).catch(() => alert('Ошибка входа'));
  } else {
    createUserWithEmailAndPassword(auth, email, password).then(() => {
      set(ref(db, `users/${currentUser.uid}`), { username });
    }).catch(() => alert('Ошибка'));
  }
}

// === Загрузка чатов ===
function loadChats() {
  const chatList = document.getElementById('chatList');
  onValue(ref(db, `users/${currentUser.uid}/chats`), (snap) => {
    chatList.innerHTML = '';
    const chats = snap.val() || {};
    Object.keys(chats).forEach(id => {
      const chat = chats[id];
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.onclick = () => openChat(id, chat);
      div.innerHTML = `
        <div class="chat-avatar">${chat.type === 'group' ? '📋' : '👤'}</div>
        <div class="chat-info">
          <h3>${chat.name}</h3>
          <p>${chat.lastMessage || 'Нет сообщений'}</p>
        </div>
      `;
      chatList.appendChild(div);
    });
  });
}

// === Открытие чата ===
function openChat(chatId, chat) {
  currentChatId = chatId;
  document.getElementById('mainChat').innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar">${chat.type === 'group' ? '📋' : '👤'}</div>
      <h2>${chat.name}</h2>
    </div>
    <div class="messages-area" id="messages"></div>
    <div class="input-area">
      <input type="text" id="msgInput" placeholder="Сообщение..." />
      <button id="sendBtn">→</button>
    </div>
  `;

  // Загрузка сообщений
  onValue(ref(db, `chats/${chatId}/messages`), (snap) => {
    const area = document.getElementById('messages');
    area.innerHTML = '';
    const msgs = snap.val() || {};
    Object.keys(msgs).forEach(id => {
      const m = msgs[id];
      const div = document.createElement('div');
      div.className = `message ${m.uid === currentUser.uid ? 'own' : ''}`;
      div.innerHTML = `<div class="author">${m.displayName}</div>${m.text}`;
      area.appendChild(div);
    });
    area.scrollTop = area.scrollHeight;
  });

  document.getElementById('sendBtn').onclick = () => {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;
    push(ref(db, `chats/${chatId}/messages`), {
      text,
      uid: currentUser.uid,
      displayName: currentUser.email.split('@')[0],
      timestamp: Date.now()
    });
    update(ref(db, `users/${currentUser.uid}/chats/${chatId}`), { lastMessage: text });
    input.value = '';
  };
}

// === Друзья, группы и т.д. ===
function showAddFriend() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Добавить друга</h3>
      <input type="text" id="friendUsername" placeholder="Логин друга" />
      <div class="modal-buttons">
        <button class="cancel">Отмена</button>
        <button class="confirm">Отправить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.cancel').onclick = () => modal.remove();
  modal.querySelector('.confirm').onclick = () => {
    const username = modal.querySelector('#friendUsername').value.trim();
    // Поиск пользователя по логину
    onValue(ref(db, 'users'), (snap) => {
      const users = snap.val();
      const friendUid = Object.keys(users).find(uid => users[uid].username === username);
      if (friendUid && friendUid !== currentUser.uid) {
        set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), {
          username: currentUser.email.split('@')[0],
          status: 'pending'
        });
        alert('Запрос отправлен!');
        modal.remove();
      } else {
        alert('Пользователь не найден');
      }
    }, { onlyOnce: true });
  });
}

// === Остальные функции (группы, запросы) — добавлю по запросу ===

renderApp(); // начальная загрузка
