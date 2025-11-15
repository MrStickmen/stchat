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
  remove 
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
    }
  } else {
    if (path === 'chat.html') location.href = 'login.html';
  }
});

// === РЕГИСТРАЦИЯ ===
if ($('registerForm')) {
  $('registerForm').onsubmit = e => {
    e.preventDefault();
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value;
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

// === ЧАТЫ ===
async function loadChats() {
  onValue(ref(db, `users/${currentUser.uid}/chats`), snap => {
    const chats = snap.val() || {};
    $('chatList').innerHTML = '';
    Object.entries(chats).forEach(([id, chat]) => {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.onclick = () => openChat(id, chat);
      div.innerHTML = `<div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div>
                       <div><h3>${chat.name}</h3><p>${chat.last || ''}</p></div>`;
      $('chatList').appendChild(div);
    });
  });
}

function openChat(id, chat) {
  currentChatId = id;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  event.target.closest('.chat-item').classList.add('active');

  $('mainChat').innerHTML = `
    <div class="chat-header"><div class="chat-avatar">${chat.type === 'group' ? 'G' : 'U'}</div><h2>${chat.name}</h2></div>
    <div class="messages" id="messages"></div>
    <div class="input-area"><input id="msgInput" placeholder="Сообщение..." /><button>Send</button></div>
  `;

  onValue(ref(db, `chats/${id}/messages`), snap => {
    const area = $('messages');
    area.innerHTML = '';
    Object.values(snap.val() || {}).forEach(m => {
      const div = document.createElement('div');
      div.className = `message ${m.uid === currentUser.uid ? 'own' : ''}`;
      div.innerHTML = `<div class="author">${m.displayName}</div>${m.text}`;
      area.appendChild(div);
    });
    area.scrollTop = area.scrollHeight;
  });

  $('mainChat').querySelector('button').onclick = () => {
    const text = $('msgInput').value.trim();
    if (!text) return;
    push(ref(db, `chats/${id}/messages`), {
      text, uid: currentUser.uid, displayName: currentUser.email.split('@')[0]
    });
    update(ref(db, `users/${currentUser.uid}/chats/${id}`), { last: text });
    $('msgInput').value = '';
  };
}

// === МЕНЮ ===
function setupMenu() {
  $('menuBtn').onclick = e => {
    e.stopPropagation();
    $('menu').style.display = $('menu').style.display === 'block' ? 'none' : 'block';
  };
  document.addEventListener('click', () => $('menu').style.display = 'none');

  $('addFriendBtn').onclick = () => $('friendModal').style.display = 'flex';
  $('createGroupBtn').onclick = () => $('groupModal').style.display = 'flex';
  $('logoutBtn').onclick = () => signOut(auth).then(() => location.href = 'index.html');

  document.querySelectorAll('.cancel').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');
}

// === ДРУГ / ГРУППА ===
$('friendModal')?.querySelector('.send').addEventListener('click', async () => {
  const username = $('friendUsername').value.trim();
  const snap = await get(ref(db, 'users'));
  const friendUid = Object.keys(snap.val() || {}).find(uid => snap.val()[uid].username === username);
  if (friendUid) {
    set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), { from: currentUser.email.split('@')[0] });
    alert('Запрос отправлен!');
  }
  $('friendModal').style.display = 'none';
});

$('groupModal')?.querySelector('.create').addEventListener('click', async () => {
  const name = $('groupName').value.trim();
  const chatRef = push(ref(db, 'chats'));
  await set(chatRef, { type: 'group', name });
  await set(ref(db, `users/${currentUser.uid}/chats/${chatRef.key}`), { type: 'group', name });
  $('groupModal').style.display = 'none';
});
