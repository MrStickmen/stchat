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
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
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

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
const elements = {
  chatList: document.getElementById('chatList'),
  mainChat: document.getElementById('mainChat'),
  menuBtn: document.getElementById('menuBtn'),
  menu: document.getElementById('menu'),
  addFriendBtn: document.getElementById('addFriendBtn'),
  createGroupBtn: document.getElementById('createGroupBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  friendModal: document.getElementById('friendModal'),
  groupModal: document.getElementById('groupModal')
};

// === АВТОРИЗАЦИЯ ===
onAuthStateChanged(auth, user => {
  const path = location.pathname.split('/').pop();
  if (user) {
    currentUser = user;
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
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    if (username.length < 3 || password.length < 6) return alert('Логин ≥3, пароль ≥6');

    try {
      const cred = await createUserWithEmailAndPassword(auth, `${username}@stchat.local`, password);
      await set(ref(db, `users/${cred.user.uid}`), { username });
      alert('Аккаунт создан!');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
}

// === ВХОД ===
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      await signInWithEmailAndPassword(auth, `${username}@stchat.local`, password);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
}

// === ЗАГРУЗКА ЧАТОВ ===
async function loadChats() {
  if (!currentUser) return;

  onValue(ref(db, `users/${currentUser.uid}/chats`), async snap => {
    const chats = snap.val() || {};
    elements.chatList.innerHTML = '';

    for (const [id, chat] of Object.entries(chats)) {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.dataset.chatId = id;
      div.onclick = () => openChat(id, chat);

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
async function openChat(chatId, chat) {
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

  const messagesArea = document.getElementById('messages');
  const sendBtn = elements.mainChat.querySelector('button');
  const input = document.getElementById('msgInput');

  // Загрузка сообщений
  onValue(ref(db, `chats/${chatId}/messages`), snap => {
    messagesArea.innerHTML = '';
    const msgs = snap.val() || {};
    Object.values(msgs).forEach(m => {
      const div = document.createElement('div');
      div.className = `message ${m.uid === currentUser.uid ? 'own' : ''}`;
      div.innerHTML = `<div class="author">${m.displayName}</div><div>${m.text}</div>`;
      messagesArea.appendChild(div);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });

  // Отправка
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    push(ref(db, `chats/${chatId}/messages`), {
      text,
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email.split('@')[0],
      timestamp: Date.now()
    });
    update(ref(db, `users/${currentUser.uid}/chats/${chatId}`), { last: text });
    input.value = '';
  };
  sendBtn.onclick = send;
  input.onkeydown = e => e.key === 'Enter' && send();
}

// === МЕНЮ (три точки) ===
function setupMenu() {
  elements.menuBtn.onclick = e => {
    e.stopPropagation();
    elements.menu.style.display = elements.menu.style.display === 'block' ? 'none' : 'block';
  };

  document.addEventListener('click', () => {
    elements.menu.style.display = 'none';
  });

  // Кнопки
  elements.addFriendBtn.onclick = () => {
    elements.friendModal.style.display = 'flex';
    elements.menu.style.display = 'none';
  };

  elements.createGroupBtn.onclick = () => {
    elements.groupModal.style.display = 'flex';
    elements.menu.style.display = 'none';
  };

  elements.logoutBtn.onclick = () => {
    signOut(auth).then(() => location.href = 'index.html');
  };

  // Закрытие модалок
  document.querySelectorAll('.cancel').forEach(b => {
    b.onclick = () => b.closest('.modal').style.display = 'none';
  });
}

// === ДОБАВИТЬ ДРУГА ===
document.querySelector('#friendModal .send')?.addEventListener('click', async () => {
  const username = document.getElementById('friendUsername').value.trim();
  if (!username) return;

  const snap = await get(ref(db, 'users'));
  const users = snap.val() || {};
  const friendUid = Object.keys(users).find(uid => users[uid].username === username);

  if (!friendUid || friendUid === currentUser.uid) {
    alert('Пользователь не найден или это вы');
    return;
  }

  // Проверка: уже друзья?
  const friendSnap = await get(ref(db, `users/${currentUser.uid}/friends/${friendUid}`));
  if (friendSnap.exists()) {
    alert('Уже в друзьях');
    return;
  }

  // Отправить запрос
  await set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), {
    from: currentUser.displayName || currentUser.email.split('@')[0],
    timestamp: Date.now()
  });

  alert('Запрос отправлен!');
  elements.friendModal.style.display = 'none';
  document.getElementById('friendUsername').value = '';
});

// === СОЗДАТЬ ГРУППУ ===
document.querySelector('#groupModal .create')?.addEventListener('click', async () => {
  const name = document.getElementById('groupName').value.trim();
  if (!name) return;

  const chatRef = push(ref(db, 'chats'));
  await set(chatRef, { type: 'group', name, creator: currentUser.uid });

  await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), {
    type: 'group',
    name,
    last: 'Группа создана'
  });

  alert('Группа создана!');
  elements.groupModal.style.display = 'none';
  document.getElementById('groupName').value = '';
});

// === ЗАПРОСЫ В ДРУЗЬЯ (в меню) ===
elements.menu.innerHTML += `<button id="requestsBtn">Запросы в друзья</button>`;
document.getElementById('requestsBtn')?.addEventListener('click', async () => {
  elements.menu.style.display = 'none';
  const requests = await get(ref(db, `friendRequests/${currentUser.uid}`));
  if (!requests.exists()) {
    alert('Нет запросов');
    return;
  }

  const reqs = requests.val();
  let message = 'Запросы в друзья:\n';
  for (const [uid, req] of Object.entries(reqs)) {
    message += `\n${req.from} — принять? (да/нет)`;
    const result = prompt(message);
    if (result?.toLowerCase() === 'да') {
      // Принять
      await set(ref(db, `users/${currentUser.uid}/friends/${uid}`), true);
      await set(ref(db, `users/${uid}/friends/${currentUser.uid}`), true);

      // Создать личный чат
      const chatRef = push(ref(db, 'chats'));
      await set(chatRef, { type: 'private', users: [currentUser.uid, uid] });
      await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), { type: 'private', name: req.from });
      await set(ref(db, `users/${uid}/chats/${chatRef.key}`), { type: 'private', name: currentUser.displayName || currentUser.email.split('@')[0] });

      await remove(ref(db, `friendRequests/${currentUser.uid}/${uid}`));
      alert('Друг добавлен!');
    } else {
      await remove(ref(db, `friendRequests/${currentUser.uid}/${uid}`));
    }
  }
});
