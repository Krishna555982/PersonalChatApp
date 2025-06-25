import { auth, database } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { ref, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Panel toggle
const container = document.querySelector(".container");
const loginBtn = document.querySelector(".login-btn");
const registerBtn = document.querySelector(".register-btn");

if (registerBtn && loginBtn) {
  registerBtn.addEventListener("click", () => {
    container.classList.add("active");
  });

  loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
  });
}

// Login logic
const loginForm = document.querySelector(".form-box.login form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const usernameInput = loginForm.querySelector("input[placeholder='Email or Username']").value.trim();
    const passwordInput = loginForm.querySelector("input[placeholder='password']").value;

    const email = usernameInput.includes("@") ? usernameInput : `${usernameInput}@chatapp.com`;

    signInWithEmailAndPassword(auth, email, passwordInput)
      .then(() => {
        console.log("Login successful");
        window.location.href = "chat.html";
      })
      .catch((error) => {
        alert("Login failed: " + error.message);
        console.error("Login error:", error);
      });
  });
}

// Register logic
const registerForm = document.querySelector(".form-box.register form");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = registerForm.querySelector("input[placeholder='Username']").value.trim();
    const email = registerForm.querySelector("input[placeholder='Email']").value.trim();
    const password = registerForm.querySelector("input[placeholder='password']").value;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const uid = userCredential.user.uid;
        return set(ref(database, `users/${uid}`), {
          email,
          username,
          online: true
        });
      })
      .then(() => {
        console.log("Registration successful");
        window.location.href = "chat.html";
      })
      .catch((error) => {
        alert("Registration failed: " + error.message);
        console.error("Registration error:", error);
      });
  });
}

// Google login (for both forms)
const googleBtns = document.querySelectorAll(".google-login");
googleBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        return set(ref(database, `users/${user.uid}`), {
          email: user.email,
          username: user.displayName || user.email.split("@")[0],
          online: true
        });
      })
      .then(() => {
        window.location.href = "chat.html";
      })
      .catch((error) => {
        alert("Google sign-in failed: " + error.message);
        console.error("Google login error:", error);
      });
  });
});

// Auto redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("index.html")) {
    window.location.href = "chat.html";
  }
});
