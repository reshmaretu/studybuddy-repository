import { auth, db, showMessage } from './firebaseauth.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('#register-form');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.querySelector('#fName').value;
        const lastName = document.querySelector('#lName').value;
        const email = document.querySelector('#reg-email').value;
        const password = document.querySelector('#reg-password').value;
        const confirmPassword = document.querySelector('#confirm-password').value;
        const registerBtn = document.querySelector('#submitSignUp');

        // 1. Basic Validation
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            alert("Password should be at least 6 characters.");
            return;
        }

        // 2. Firebase Logic
        try {
            registerBtn.textContent = "Creating Account...";
            registerBtn.disabled = true;

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Store user data in Firestore
            const userData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                createdAt: new Date().toISOString()
            };
            
            const docRef = doc(db, "users", user.uid);
            await setDoc(docRef, userData);
            
            console.log("Success:", user);
            showMessage("Account created successfully! Redirecting to dashboard...", "signUpMessage");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 2000);

        } catch (error) {
            console.error("Error code:", error.code);
            const errorCode = error.code;
            if (errorCode === 'auth/email-already-in-use') {
                showMessage("Email already in use. Please use a different email.", "signUpMessage");
            } else if (errorCode === 'auth/weak-password') {
                showMessage("Password should be at least 6 characters.", "signUpMessage");
            } else if (errorCode === 'auth/invalid-email') {
                showMessage("Please enter a valid email address.", "signUpMessage");
            } else {
                showMessage("Registration failed: " + error.message, "signUpMessage");
            }
        } finally {
            registerBtn.textContent = "Sign Up";
            registerBtn.disabled = false;
        }
    });
});