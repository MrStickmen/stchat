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
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  update, 
  get, 
  remove,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentChatId = null;

const $ = id => document.getElementById(id);

// === АВТОВХОД ===
onAuthStateChanged(auth, user => {
  const path = location.pathname.split('/').pop();
  if (user) {
    currentUser = user;
    if (['index.html','login.html','register.html'].includes(path)) {
      location.href = 'chat.html';
    } else if (path === 'chat.html') {
      loadChats();
      setupMenu();
      loadFriendRequests(); // ← НОВОЕ: запросы в друзья
    }
  } else {
    if (path === 'chat.html') location.href = 'login.html';
  }
});

// === РЕГИСТРАЦИЯ ===
if ($('registerForm')) {
  $('registerForm').onsubmit = async e => {
    e.preventDefault();
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value;

    // Проверка: логин занят?
    const snap = await get(query(ref(db, 'users'), orderByChild('username'), equalTo(username)));
    if (snap.exists()) return alert('Логин уже занят!');

    createUserWithEmailAndPassword(auth, `${username}@stchat.local`, password)
      .then(cred => {
        set(ref(db, `users/${cred.user.uid}`), { username });
        alert('Аккаунт создан!');
      })
      .catch(err => alert('Ошибка: ' + err.message));
  };
}

// === ВХОД ===
if ($('loginForm')) {
  $('loginForm').onsubmit = e => {
    e.preventDefault();
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;
    signInWithEmailAndPassword(auth, `${username}@stchat.local`, password)
      .then(() => location.href = 'chat.html')
      .catch(err => alert('Неверный логин или пароль'));
  };
}

// === ЗАГРУЗКА ЧАТОВ ===
function loadChats() {
  onValue(ref(db, `users/${currentUser.uid}/chats`), snap => {
    const chats = snap.val() || {};
    $('chatList').innerHTML = '';
    Object.entries(chats).forEach(([id, chat]) => {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.dataset.id = id;
      div.onclick = () => openChat(id, chat);
      div.innerHTML = `
        <div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div>
        <div><h3>${chat.name}</h3><p>${chat.last || 'Нет сообщений'}</p></div>
      `;
      $('chatList').appendChild(div);
    });
  }, { onlyOnce: false });
}

// === ОТКРЫТЬ ЧАТ ===
function openChat(id, chat) {
  currentChatId = id;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-id="${id}"]`).classList.add('active');

  $('mainChat').innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div>
      <h2>${chat.name}</h2>
    </div>
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <input id="msgInput" placeholder="Сообщение..." />
      <button>Send</button>
    </div>
  `;

  const messagesArea = $('messages');
  onValue(ref(db, `chats/${id}/messages`), snap => {
    messagesArea.innerHTML = '';
    const msgs = snap.val() || {};
    Object.values(msgs).sort((a,b) => a.timestamp - b.timestamp).forEach(m => {
      const div = document.createElement('div');
      div.className = `message ${m.uid === currentUser.uid ? 'own' : ''}`;
      div.innerHTML = `<div class="author">${m.displayName}</div><div>${m.text}</div>`;
      messagesArea.appendChild(div);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });

  $('mainChat').querySelector('button').onclick = () => {
    const text = $('msgInput').value.trim();
    if (!text) return;
    push(ref(db, `chats/${id}/messages`), {
      text,
      uid: currentUser.uid,
      displayName: currentUser.email.split('@')[0],
      timestamp: Date.now()
    });
    update(ref(db, `users/${currentUser.uid}/chats/${id}`), { last: text });
    $('msgInput').value = '';
  };
}

// === МЕНЮ ===
function setupMenu() {
  $('menuBtn').onclick = e => {
    e.stopPropagation();
    const menu = $('menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  };
  document.addEventListener('click', () => $('menu').style.display = 'none');

  $('addFriendBtn').onclick = () => $('friendModal').style.display = 'flex';
  $('createGroupBtn').onclick = () => $('groupModal').style.display = 'flex';
  $('logoutBtn').onclick = () => signOut(auth).then(() => location.href = 'index.html');

  document.querySelectorAll('.cancel').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');
}

// === ДОБАВИТЬ ДРУГА (ИСПРАВЛЕНО) ===
document.querySelector('#friendModal .send')?.addEventListener('click', async () => {
  const username = $('friendUsername').value.trim();
  if (!username) return;

  // Поиск пользователя
  const snap = await get(query(ref(db, 'users'), orderByChild('username'), equalTo(username)));
  const users = snap.val() || {};
  const friendUid = Object.keys(users)[0];

  if (!friendUid) return alert('Пользователь не найден');
  if (friendUid === currentUser.uid) return alert('Это вы!');

  // Проверка: уже друзья?
  const friendCheck = await get(ref(db, `users/${currentUser.uid}/friends/${friendUid}`));
  if (friendCheck.exists()) return alert('Уже в друзьях');

  // Отправка запроса
  await set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), {
    from: currentUser.email.split('@')[0],
    timestamp: Date.now()
  });

  alert('Запрос отправлен!');
  $('friendModal').style.display = 'none';
  $('friendUsername').value = '';
});

// === СОЗДАТЬ ГРУППУ (БЕЗ ДУБЛЕЙ) ===
document.querySelector('#groupModal .create')?.addEventListener('click', async () => {
  const name = $('groupName').value.trim();
  if (!name) return;

  // Проверка: группа с таким именем уже есть?
  const snap = await get(ref(db, `users/${currentUser.uid}/chats`));
  const chats = snap.val() || {};
  const exists = Object.values(chats).some(c => c.type === 'group' && c.name === name);
  if (exists) return alert('Группа с таким названием уже есть!');

  const chatRef = push(ref(db, 'chats'));
  await set(chatRef, { type: 'group', name, creator: currentUser.uid });
  await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), {
    type: 'group',
    name,
    last: 'Группа создана'
  });

  alert('Группа создана!');
  $('groupModal').style.display = 'none';
  $('groupName').value = '';
});

// === ЗАПРОСЫ В ДРУЗЬЯ (НОВОЕ) ===
async function loadFriendRequests() {
  onValue(ref(db, `friendRequests/${currentUser.uid}`), async snap => {
    const requests = snap.val();
    if (!requests) return;

    // Добавляем кнопку "Запросы" в меню
    if (!$('requestsBtn')) {
      const btn = document.createElement('button');
      btn.id = 'requestsBtn';
      btn.textContent = 'Запросы в друзья';
      $('menu').appendChild(btn);

      btn.onclick = async () => {
        $('menu').style.display = 'none';
        for (const [uid, req] of Object.entries(requests)) {
          if (confirm(`${req.from} хочет дружить. Принять?`)) {
            // Добавляем в друзья
            await set(ref(db, `users/${currentUser.uid}/friends/${uid}`), true);
            await set(ref(db, `users/${uid}/friends/${currentUser.uid}`), true);

            // Создаём личный чат
            const chatRef = push(ref(db, 'chats'));
            await set(chatRef, { type: 'private' });
            await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), { type: 'private', name: req.from });
            await set(ref(db, `users/${uid}/chats/${chatRef.key}`), { type: 'private', name: currentUser.email.split('@')[0] });

            await remove(ref(db, `friendRequests/${currentUser.uid}/${uid}`));
          } else {
            await remove(ref(db, `friendRequests/${currentUser.uid}/${uid}`));
          }
        }
      };
    }
  });
}
