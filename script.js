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
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentChatId = null;

// === АВТОВХОД ===
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname.split('/').pop();
  if (user && (path === 'index.html' || path === '' || path === 'login.html' || path === 'register.html')) {
    window.location.href = 'chat.html';
  } else if (!user && path === 'chat.html') {
    window.location.href = 'login.html';
  }
  currentUser = user;
});

// === РЕГИСТРАЦИЯ ===
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const email = `${username}@stchat.local`;

    createUserWithEmailAndPassword(auth, email, password)
      .then((cred) => {
        set(ref(db, `users/${cred.user.uid}`), { username });
        alert('Аккаунт создан!');
        window.location.href = 'chat.html';
      })
      .catch(err => alert(err.message));
  });
}

// === ВХОД ===
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const email = `${username}@stchat.local`;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => window.location.href = 'chat.html')
      .catch(err => alert('Ошибка: ' + err.message));
  });
}

// === ЧАТ ===
if (document.getElementById('chatList')) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    currentUser = user;

    // Загрузка чатов
    onValue(ref(db, `users/${user.uid}/chats`), (snap) => {
      const list = document.getElementById('chatList');
      list.innerHTML = '';
      const chats = snap.val() || {};
      Object.keys(chats).forEach(id => {
        const chat = chats[id];
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.onclick = () => openChat(id, chat);
        div.innerHTML = `<div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div>
                         <div><h3>${chat.name}</h3><p>${chat.last || ''}</p></div>`;
        list.appendChild(div);
      });
    });

    // Кнопки
    document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => window.location.href = 'index.html');
    document.getElementById('addFriendBtn').onclick = showAddFriend;
    document.getElementById('createGroupBtn').onclick = showCreateGroup;
  });
}

// === Открытие чата ===
async function openChat(chatId, chat) {
  currentChatId = chatId;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  event.target.closest('.chat-item').classList.add('active');

  const main = document.getElementById('mainChat');
  main.innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div>
      <h2>${chat.name}</h2>
    </div>
    <div class="messages-area" id="messages"></div>
    <div class="input-area">
      <input type="text" id="msgInput" placeholder="Сообщение..." />
      <button>Send</button>
    </div>
  `;

  // Сообщения
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

  // Отправка
  document.querySelector('.input-area button').onclick = () => {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;
    push(ref(db, `chats/${chatId}/messages`), {
      text, uid: currentUser.uid, displayName: currentUser.email.split('@')[0]
    });
    update(ref(db, `users/${currentUser.uid}/chats/${chatId}`), { last: text });
    input.value = '';
  };
}

// === Добавить друга ===
function showAddFriend() {
  const modal = document.getElementById('friendModal');
  modal.style.display = 'flex';
  modal.querySelector('.cancel').onclick = () => modal.style.display = 'none';
  modal.querySelector('.confirm').onclick = async () => {
    const username = modal.querySelector('#friendUsername').value.trim();
    const snap = await get(ref(db, 'users'));
    const users = snap.val();
    const friendUid = Object.keys(users).find(uid => users[uid].username === username);
    if (friendUid && friendUid !== currentUser.uid) {
      await set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), { status: 'pending', from: currentUser.email.split('@')[0] });
      alert('Запрос отправлен!');
      modal.style.display = 'none';
    } else {
      alert('Пользователь не найден');
    }
  };
}

// === Создать группу ===
function showCreateGroup() {
  const modal = document.getElementById('groupModal');
  modal.style.display = 'flex';
  modal.querySelector('.cancel').onclick = () => modal.style.display = 'none';
  modal.querySelector('.confirm').onclick = async () => {
    const name = modal.querySelector('#groupName').value.trim();
    if (!name) return;
    const chatRef = push(ref(db, 'chats'));
    await set(chatRef, { type: 'group', name });
    await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), { type: 'group', name, last: 'Группа создана' });
    modal.style.display = 'none';
  };
}
