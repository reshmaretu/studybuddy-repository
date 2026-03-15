import { supabase, showMessage } from './supabase-client.js';

// Helper: Basic email validation regex
const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('#register-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // .trim() prevents users from bypassing required fields using spaces
        const firstName = document.querySelector('#fName').value.trim();
        const lastName = document.querySelector('#lName').value.trim();
        const email = document.querySelector('#reg-email').value.trim();
        const password = document.querySelector('#reg-password').value;
        const confirmPassword = document.querySelector('#confirm-password').value;
        const registerBtn = document.querySelector('#submitSignUp');

        // --- 1. SECURITY & VALIDITY CHECKS ---

        if (!firstName || !lastName) {
            showMessage("Names cannot be empty or just spaces.", "signUpMessage", true);
            return;
        }

        if (!validateEmail(email)) {
            showMessage("Please enter a valid email address.", "signUpMessage", true);
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match!", "signUpMessage", true);
            return;
        }

        // Strong Password: At least 8 chars, 1 uppercase, 1 number
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;
        if (!passwordRegex.test(password)) {
            showMessage("Password must be at least 8 characters, with 1 uppercase letter and 1 number.", "signUpMessage", true);
            return;
        }

        // --- 2. SUPABASE AUTH LOGIC ---
        try {
            registerBtn.textContent = "Forging Account...";
            registerBtn.disabled = true;

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName
                    }
                }
            });

            if (error) throw error;

            if (error) throw error;

            // THE NEW PROGRESSIVE ONBOARDING FLOW:
            if (data.session === null) {
                // ✨ SAVE EMAIL TEMPORARILY FOR RESEND FUNCTION ✨
                localStorage.setItem('tempRegEmail', email);

                showMessage("Welcome! Entering local workspace. (Check your email later to unlock Cloud Sync) ✨", "signUpMessage", false);
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2500);
            } else {
                // If you ever turn off "Confirm Email" in Supabase, this runs instead
                showMessage("Account created successfully! Entering Flow...", "signUpMessage", false);
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            }

        } catch (error) {
            console.error("Registration error:", error.message);
            showMessage(error.message, "signUpMessage", true);
        } finally {
            registerBtn.textContent = "Sign Up";
            registerBtn.disabled = false;
        }
    });
});