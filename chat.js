import { auth, database } from './firebase-config.js';
import {
  ref,
  set,
  push,
  update,
  onChildAdded,
  onValue,
  onDisconnect
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import {
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const chatHeader = document.querySelector(".chat-header");
const chatSubheader = document.querySelector(".chat-subheader");
const chatMessages = document.querySelector(".chat-messages");
const chatInputForm = document.querySelector(".chat-input-form");
const chatInput = document.querySelector(".chat-input");
const clearChatBtn = document.querySelector(".clear-chat-button");
const typingIndicator = document.querySelector(".typing-indicator");
const logoutBtn = document.getElementById("logout-btn");
const userProfileDisplay = document.getElementById("user-profile");
const userListContainer = document.querySelector(".user-list");

let messageSender = "";
let chatID = "";
let typingRef = null;

const setUserOnline = (uid, email) => {
  const userRef = ref(database, `users/${uid}`);
  set(userRef, {
    email: email,
    online: true
  });
  onDisconnect(userRef).update({
    online: false,
    lastSeen: new Date().toLocaleString()
  });
};

const startChatWith = (currentUserId, targetUid, targetEmail) => {
  chatID = [currentUserId, targetUid].sort().join("_");
  const allowedRef = ref(database, `chats/${chatID}/allowed`);
  update(allowedRef, {
    [currentUserId]: true,
    [targetUid]: true
  });

  chatHeader.innerText = `${targetEmail.split("@")[0]}`;
  chatSubheader.innerText = "";
  chatInput.placeholder = "Type your message...";
  chatInput.focus();
  chatMessages.innerHTML = "";

  const messageRef = ref(database, `chats/${chatID}/messages`);
  onChildAdded(messageRef, (snapshot) => {
    const message = snapshot.val();
    const messageKey = snapshot.key;
    const myMsg = auth.currentUser.uid === message.uid;

    if (!message || !message.text) return;
    if (!myMsg && !message.seen) {
      update(ref(database, `chats/${chatID}/messages/${messageKey}`), {
        seen: true,
        seenAt: new Date().toLocaleString()
      });
    }

    const seenTick = myMsg ? (message.seen ? "✔✔" : "✔") : "";

    const msgHtml = `
      <div class="message ${myMsg ? "blue-bg" : "gray-bg"}">
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
        <div class="message-timestamp">${message.timestamp} ${seenTick}</div>
      </div>
    `;

    chatMessages.innerHTML += msgHtml;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  const statusRef = ref(database, `users/${targetUid}`);
  onValue(statusRef, (snap) => {
    const data = snap.val();
    if (data?.online) {
      chatSubheader.innerText = "Online";
    } else if (data?.lastSeen) {
      chatSubheader.innerText = `Last seen at ${data.lastSeen}`;
    } else {
      chatSubheader.innerText = "Offline";
    }
  });

  typingRef = ref(database, `typing/${chatID}`);
  onValue(typingRef, (snap) => {
    const typingUser = snap.val();
    typingIndicator.innerText = typingUser && typingUser !== messageSender
      ? `${typingUser} is typing...` : "";
  });
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    const { uid, email } = user;
    messageSender = email.split("@")[0];
    if (userProfileDisplay) {
      userProfileDisplay.innerText = email;
    }

    setUserOnline(uid, email);

    const usersRef = ref(database, "users");
    onValue(usersRef, (snapshot) => {
      userListContainer.innerHTML = "";
      const users = snapshot.val();
      for (let uid2 in users) {
        if (uid2 !== uid) {
          const username = users[uid2].email.split("@")[0];

          const userItem = document.createElement("div");
          userItem.classList.add("user-item");
          userItem.innerText = username;

          userItem.addEventListener("click", () => {
            startChatWith(uid, uid2, users[uid2].email);
            document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active"));
            userItem.classList.add("active");
          });

          userListContainer.appendChild(userItem);
        }
      }
    });

    chatInputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!chatID) return;
      const timestamp = new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
      });

      const message = {
        uid: uid,
        sender: messageSender,
        text: chatInput.value,
        timestamp,
        seen: false,
        seenAt: null
      };

      const messageRef = ref(database, `chats/${chatID}/messages`);
      push(messageRef, message);
      chatInputForm.reset();
      update(typingRef, null);
    });

    chatInput.addEventListener("input", () => {
      const typingNow = chatInput.value.trim() !== "";
      set(typingRef, typingNow ? messageSender : null);
    });

    clearChatBtn.addEventListener("click", () => {
      if (!chatID) return;
      const confirmClear = confirm("Are you sure you want to delete all messages?");
      if (!confirmClear) return;
      const messageRef = ref(database, `chats/${chatID}/messages`);
      set(messageRef, null).then(() => {
        chatMessages.innerHTML = "";
      }).catch((error) => {
        alert("Error clearing chat: " + error.message);
      });
    });

    logoutBtn.addEventListener("click", () => {
      signOut(auth).then(() => {
        window.location.href = "index.html";
      }).catch((error) => {
        alert("Logout failed: " + error.message);
      });
    });

  } else {
    window.location.href = "index.html";
  }
});


const menuIcon = document.getElementById("menu-icon");

if (menuIcon) {
  menuIcon.addEventListener("click", () => {
    userListContainer.classList.toggle("active");
  });
}

if (window.innerWidth <= 600) {
  userListContainer.classList.remove("active");
}