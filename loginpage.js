import { supabase, showMessage } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const loginBtn = document.querySelector('.login-btn');

    let msgDiv = document.querySelector('#loginMessage');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'loginMessage';
        msgDiv.className = 'messageDiv';
        msgDiv.style.display = 'none';
        loginForm.insertBefore(msgDiv, loginForm.firstChild);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("Please enter both email and password.", "loginMessage", true);
            return;
        }

        try {
            loginBtn.textContent = "Logging in...";
            loginBtn.disabled = true;
            loginBtn.style.opacity = "0.7";

            // 1. Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            showMessage("Login successful! Fetching your cloud data...", "loginMessage", false);

            // 2. THE CLOUD PULL: Fetch data and load it into the browser
            await pullCloudData(data.user.id);

            // 3. Enter the App
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);

        } catch (error) {
            console.error("Login error:", error.message);

            // Check if Supabase blocked them specifically because of the unverified email
            if (error.message.includes("Email not confirmed")) {
                showMessage("Your email is unverified! Please check your inbox for the confirmation link.", "loginMessage", true);
            } else {
                showMessage("Invalid email or password.", "loginMessage", true);
            }

        } finally {
            loginBtn.textContent = "Login";
            loginBtn.disabled = false;
            loginBtn.style.opacity = "1";
        }
        // --- Helper Function to Pull Data ---
        async function pullCloudData(userId) {
            // A. Pull User Stats
            const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', userId).single();
            if (stats) {
                localStorage.setItem('focusScore', stats.focus_score);
                localStorage.setItem('totalSessions', stats.total_sessions);
                localStorage.setItem('dailyStreak', stats.daily_streak);
                localStorage.setItem('totalSecondsTracked', stats.total_seconds_tracked);
            }

            // B. Pull Active Quests
            const { data: activeTasks } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('is_completed', false);
            if (activeTasks && activeTasks.length > 0) {
                // Reformat to match the Vanilla JS structure
                const formattedTasks = activeTasks.map(t => ({
                    id: t.id,
                    name: t.name,
                    type: t.type,
                    deadline: t.deadline,
                    completed: false
                }));
                localStorage.setItem('tasks', JSON.stringify(formattedTasks));
            }

            // C. Pull Knowledge Shards
            const { data: shards } = await supabase.from('knowledge_shards').select('*').eq('user_id', userId);
            if (shards && shards.length > 0) {
                const formattedShards = shards.map(s => ({
                    id: s.id,
                    title: s.title,
                    content: s.content,
                    masteryScore: s.mastery_score
                }));
                localStorage.setItem('knowledgeShards', JSON.stringify(formattedShards));
            }
        }
    });
});