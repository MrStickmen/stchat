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
import { getDatabase, ref, set, push, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentChatId = null;

// Автовход
onAuthStateChanged(auth, user => {
  const path = location.pathname.split('/').pop();
  if (user && ['index.html','login.html','register.html'].includes(path)) {
    location.href = 'chat.html';
  } else if (!user && path === 'chat.html') {
    location.href = 'login.html';
  }
  currentUser = user;
});

// Регистрация
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').onsubmit = e => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    createUserWithEmailAndPassword(auth, `${username}@stchat.local`, password)
      .then(cred => {
        set(ref(db, `users/${cred.user.uid}`), { username });
        location.href = 'chat.html';
      })
      .catch(err => alert(err.message));
  };
}

// Вход
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').onsubmit = e => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    signInWithEmailAndPassword(auth, `${username}@stchat.local`, password)
      .then(() => location.href = 'chat.html')
      .catch(err => alert('Ошибка: ' + err.message));
  };
}

// Чат
if (document.getElementById('chatList')) {
  onAuthStateChanged(auth, async user => {
    if (!user) return;
    currentUser = user;

    // Список чатов
    onValue(ref(db, `users/${user.uid}/chats`), snap => {
      const list = document.getElementById('chatList');
      list.innerHTML = '';
      const chats = snap.val() || {};
      Object.entries(chats).forEach(([id, chat]) => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.onclick = () => openChat(id, chat);
        div.innerHTML = `<div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div>
                         <div><h3>${chat.name}</h3><p>${chat.last || ''}</p></div>`;
        list.appendChild(div);
      });
    });

    // Кнопки
    document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.href = 'index.html');
    document.getElementById('addFriendBtn').onclick = () => document.getElementById('friendModal').style.display = 'flex';
    document.getElementById('createGroupBtn').onclick = () => document.getElementById('groupModal').style.display = 'flex';

    // Модалки
    document.querySelectorAll('.cancel').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');
  });
}

// Открыть чат
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
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <input type="text" id="msgInput" placeholder="Сообщение..." />
      <button>Send</button>
    </div>
  `;

  onValue(ref(db, `chats/${chatId}/messages`), snap => {
    const area = document.getElementById('messages');
    area.innerHTML = '';
    const msgs = snap.val() || {};
    Object.values(msgs).forEach(m => {
      const div = document.createElement('div');
      div.className = `message ${m.uid === currentUser.uid ? 'own' : ''}`;
      div.innerHTML = `<div class="author">${m.displayName}</div>${m.text}`;
      area.appendChild(div);
    });
    area.scrollTop = area.scrollHeight;
  });

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

// Добавить друга
document.querySelector('#friendModal .send')?.addEventListener('click', async () => {
  const username = document.getElementById('friendUsername').value.trim();
  const snap = await get(ref(db, 'users'));
  const users = snap.val();
  const friendUid = Object.keys(users).find(uid => users[uid].username === username);
  if (friendUid && friendUid !== currentUser.uid) {
    await set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), { from: currentUser.email.split('@')[0] });
    alert('Запрос отправлен!');
    document.getElementById('friendModal').style.display = 'none';
  } else {
    alert('Пользователь не найден');
  }
});

// Создать группу
document.querySelector('#groupModal .create')?.addEventListener('click', async () => {
  const name = document.getElementById('groupName').value.trim();
  if (!name) return;
  const chatRef = push(ref(db, 'chats'));
  await set(chatRef, { type: 'group', name });
  await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), { type: 'group', name, last: 'Группа создана' });
  document.getElementById('groupModal').style.display = 'none';
});
