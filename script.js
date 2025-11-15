// === КОНФИГ FIREBASE (ВСТАВЬ СВОЙ) ===
const firebaseConfig = {
  apiKey: "AIzaSyCSsrbm1-MADGYCBC2il8SLct2lcZQrWCM",
  authDomain: "stchat-bf024.firebaseapp.com",
  databaseURL: "https://stchat-bf024-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stchat-bf024",
  storageBucket: "stchat-bf024.firebasestorage.app",
  messagingSenderId: "823100651256",
  appId: "1:823100651256:web:045ea463b62c4f33e9ed0d"
};

// === ИНИЦИАЛИЗАЦИЯ ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously,
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
  remove 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentChatId = null;

// === ГЛОБАЛЬНЫЕ ЭЛЕМЕНТЫ ===
const $ = id => document.getElementById(id);
const elements = {
  chatList: $('chatList'),
  mainChat: $('mainChat'),
  menuBtn: $('menuBtn'),
  menu: $('menu'),
  addFriendBtn: $('addFriendBtn'),
  createGroupBtn: $('createGroupBtn'),
  logoutBtn: $('logoutBtn'),
  friendModal: $('friendModal'),
  groupModal: $('groupModal')
};

// === АВТОРИЗАЦИЯ ===
onAuthStateChanged(auth, user => {
  const path = location.pathname.split('/').pop();
  if (user) {
    currentUser = user;
    // Сохраняем логин в профиле
    const username = localStorage.getItem('stchat_username');
    if (username) {
      set(ref(db, `users/${user.uid}/username`), username);
    }

    if (['index.html', 'login.html', 'register.html'].includes(path)) {
      location.href = 'chat.html';
    } else if (path === 'chat.html') {
      loadChats();
      setupMenu();
    }
  } else {
    currentUser = null;
    if (path === 'chat.html') {
      location.href = 'login.html';
    }
  }
});

// === РЕГИСТРАЦИЯ ===
if ($('registerForm')) {
  $('registerForm').onsubmit = async e => {
    e.preventDefault();
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value;

    if (username.length < 3) return alert('Логин ≥3 символа');
    if (password.length < 6) return alert('Пароль ≥6 символов');

    // Проверка: логин занят?
    const snap = await get(ref(db, 'users'));
    const users = snap.val() || {};
    const exists = Object.values(users).some(u => u.username === username);
    if (exists) return alert('Логин уже занят');

    try {
      const cred = await signInAnonymously(auth);
      await set(ref(db, `users/${cred.user.uid}`), { username });
      localStorage.setItem('stchat_username', username);
      alert('Аккаунт создан!');
    } catch (err) {
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

    if (username.length < 3 || password.length < 6) {
      return alert('Проверь логин и пароль');
    }

    // Ищем пользователя по логину
    const snap = await get(ref(db, 'users'));
    const users = snap.val() || {};
    const uid = Object.keys(users).find(id => users[id].username === username);

    if (!uid) return alert('Неверный логин или пароль');

    // Сохраняем логин
    localStorage.setItem('stchat_username', username);

    try {
      // Входим анонимно, но привязываем к UID
      const cred = await signInAnonymously(auth);
      // Перезаписываем UID (хак для привязки)
      await set(ref(db, `userMap/${cred.user.uid}`), uid);
      location.href = 'chat.html';
    } catch (err) {
      alert('Ошибка входа: ' + err.message);
    }
  };
}

// === ЗАГРУЗКА ЧАТОВ ===
async function loadChats() {
  if (!currentUser) return;

  // Получаем настоящий UID
  const mapSnap = await get(ref(db, `userMap/${currentUser.uid}`));
  const realUid = mapSnap.val() || currentUser.uid;

  onValue(ref(db, `users/${realUid}/chats`), async snap => {
    const chats = snap.val() || {};
    elements.chatList.innerHTML = '';

    for (const [id, chat] of Object.entries(chats)) {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.dataset.chatId = id;
      div.onclick = () => openChat(id, chat, realUid);

      const avatar = chat.type === 'group' ? 'G' : 'U';
      const lastMsg = chat.last ? `<p>${chat.last}</p>` : '<p>Нет сообщений</p>';

      div.innerHTML = `
        <div class="chat-avatar">${avatar}</div>
        <div>
          <h3>${chat.name}</h3>
          ${lastMsg}
        </div>
      `;
      elements.chatList.appendChild(div);
    }
  });
}

// === ОТКРЫТЬ ЧАТ ===
async function openChat(chatId, chat, realUid) {
  currentChatId = chatId;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('active');

  elements.mainChat.innerHTML = `
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

  const messagesArea = $('messages');
  const sendBtn = elements.mainChat.querySelector('button');
  const input = $('msgInput');

  onValue(ref(db, `chats/${chatId}/messages`), snap => {
    messagesArea.innerHTML = '';
    const msgs = snap.val() || {};
    Object.values(msgs).forEach(m => {
      const div = document.createElement('div');
      div.className = `message ${m.uid === realUid ? 'own' : ''}`;
      div.innerHTML = `<div class="author">${m.displayName}</div><div>${m.text}</div>`;
      messagesArea.appendChild(div);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    push(ref(db, `chats/${chatId}/messages`), {
      text,
      uid: realUid,
      displayName: localStorage.getItem('stchat_username'),
      timestamp: Date.now()
    });
    update(ref(db, `users/${realUid}/chats/${chatId}`), { last: text });
    input.value = '';
  };
  sendBtn.onclick = send;
  input.onkeydown = e => e.key === 'Enter' && send();
}

// === МЕНЮ ===
function setupMenu() {
  elements.menuBtn.onclick = e => {
    e.stopPropagation();
    elements.menu.style.display = elements.menu.style.display === 'block' ? 'none' : 'block';
  };

  document.addEventListener('click', () => {
    elements.menu.style.display = 'none';
  });

  elements.addFriendBtn.onclick = () => {
    elements.friendModal.style.display = 'flex';
    elements.menu.style.display = 'none';
  };

  elements.createGroupBtn.onclick = () => {
    elements.groupModal.style.display = 'flex';
    elements.menu.style.display = 'none';
  };

  elements.logoutBtn.onclick = () => {
    localStorage.removeItem('stchat_username');
    signOut(auth).then(() => location.href = 'index.html');
  };

  document.querySelectorAll('.cancel').forEach(b => {
    b.onclick = () => b.closest('.modal').style.display = 'none';
  });
}

// === ДОБАВИТЬ ДРУГА ===
document.querySelector('#friendModal .send')?.addEventListener('click', async () => {
  const username = $('friendUsername').value.trim();
  if (!username) return;

  const snap = await get(ref(db, 'users'));
  const users = snap.val() || {};
  const friendUid = Object.keys(users).find(id => users[id].username === username);

  if (!friendUid || friendUid === (await get(ref(db, `userMap/${currentUser.uid}`)).val() || currentUser.uid)) {
    alert('Пользователь не найден');
    return;
  }

  await set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), {
    from: localStorage.getItem('stchat_username'),
    timestamp: Date.now()
  });

  alert('Запрос отправлен!');
  elements.friendModal.style.display = 'none';
  $('friendUsername').value = '';
});

// === СОЗДАТЬ ГРУППУ ===
document.querySelector('#groupModal .create')?.addEventListener('click', async () => {
  const name = $('groupName').value.trim();
  if (!name) return;

  const realUid = (await get(ref(db, `userMap/${currentUser.uid}`))).val() || currentUser.uid;
  const chatRef = push(ref(db, 'chats'));
  await set(chatRef, { type: 'group', name, creator: realUid });

  await set(ref(db, `users/${realUid}/chats/${chatRef.key}`), {
    type: 'group',
    name,
    last: 'Группа создана'
  });

  elements.groupModal.style.display = 'none';
  $('groupName').value = '';
});

// === ЗАПРОСЫ В ДРУЗЬЯ ===
elements.menu.innerHTML += `<button id="requestsBtn">Запросы в друзья</button>`;
$('requestsBtn')?.addEventListener('click', async () => {
  elements.menu.style.display = 'none';
  const realUid = (await get(ref(db, `userMap/${currentUser.uid}`))).val() || currentUser.uid;
  const requests = await get(ref(db, `friendRequests/${realUid}`));
  if (!requests.exists()) return alert('Нет запросов');

  const reqs = requests.val();
  for (const [uid, req] of Object.entries(reqs)) {
    if (confirm(`${req.from} хочет добавить вас в друзья. Принять?`)) {
      await set(ref(db, `users/${realUid}/friends/${uid}`), true);
      await set(ref(db, `users/${uid}/friends/${realUid}`), true);

      const chatRef = push(ref(db, 'chats'));
      await set(chatRef, { type: 'private', users: [realUid, uid] });
      await set(ref(db, `users/${realUid}/chats/${chatRef.key}`), { type: 'private', name: req.from });
      await set(ref(db, `users/${uid}/chats/${chatRef.key}`), { type: 'private', name: localStorage.getItem('stchat_username') });

      await remove(ref(db, `friendRequests/${realUid}/${uid}`));
    } else {
      await remove(ref(db, `friendRequests/${realUid}/${uid}`));
    }
  }
});
