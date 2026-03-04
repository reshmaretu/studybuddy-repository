// ==================== GLOBAL AI CONFIG & ROUTER ====================
const AI_CONFIG = {
    // ——— Tier 1: Gemini ———
    GEMINI_API_KEY: "",

    ENABLE_CLOUD_TIER: true,
    GEMINI_MODEL: "gemini-2.5-flash",
    GEMINI_MAX_RPM: 12,
    GEMINI_MIN_INTERVAL_MS: 4500,
    CACHE_TTL_MS: 60000,

    // ——— Tier 1.2: Groq ———
    // Get free key at: https://console.groq.com → API Keys → Create key
    // 30 RPM free, blazing fast (~1-2s responses), very generous limits
    GROQ_API_KEY: "",                        // paste "gsk_..." here
    GROQ_MODEL: "llama-3.1-8b-instant",         // or: gemma2-9b-it, mixtral-8x7b-32768

    // ——— Tier 1.5: OpenRouter ———
    // Get free key at: https://openrouter.ai → Settings → API Keys
    // Access to dozens of free models with one key
    OPENROUTER_API_KEY: "",                     // paste "sk-or-v1-..." here
    OPENROUTER_MODEL: "meta-llama/llama-3.2-3b-instruct:free",
    // ——— Tier 2: Ollama (Local) ———
    OLLAMA_MODEL: "llama3.2:1b"             // or: deepseek-r1:8b (you have it installed!)
};

// ✨ Internal rate-limiter + cache state
const _geminiState = {
    callTimestamps: [],  // Sliding 60s window of Gemini call timestamps
    lastCallTime: 0,     // ms of last Gemini call
    cache: new Map()     // prompt hash → { text, expiresAt }
};

function _hashPrompt(systemPrompt, userMessages) {
    const raw = (systemPrompt || '') + JSON.stringify(userMessages.slice(-3));
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
    return h.toString(36);
}

function _geminiAllowed() {
    const now = Date.now();
    _geminiState.callTimestamps = _geminiState.callTimestamps.filter(t => t > now - 60000);
    return _geminiState.callTimestamps.length < AI_CONFIG.GEMINI_MAX_RPM &&
        (now - _geminiState.lastCallTime) >= AI_CONFIG.GEMINI_MIN_INTERVAL_MS;
}

// Strips Llama3 special header/eot tokens from model output
function sanitizeLlamaOutput(text) {
    if (!text) return text;
    // Catch-all regex that universally strips ANY token wrapped in <| |>
    let clean = text.replace(/<\|.*?\|>/g, '').trim();

    // Sometimes Llama leaves the word "assistant" behind after the tag is stripped
    if (clean.toLowerCase().startsWith('assistant')) {
        clean = clean.substring(9).trim();
    }
    return clean;
}

async function routeAICall(systemPrompt, userMessages, stream = false) {
    const updateHeaderStatus = (statusText) => {
        const statusSpan = document.querySelector('#chumChatContainer .chum-header span');
        if (statusSpan) statusSpan.textContent = statusText;
    };

    // ✨ CACHE CHECK — skip API call if same prompt was answered recently
    const cacheKey = _hashPrompt(systemPrompt, userMessages);
    const cached = _geminiState.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        updateHeaderStatus("Online (Cloud) ☁️");
        return { text: cached.text, tier: 1, cached: true };
    }

    // TIER 1: Cloud (Gemini) — gated by rate limiter
    // We only check if the cloud tier is enabled, NOT for the API key anymore!
    if (AI_CONFIG.ENABLE_CLOUD_TIER) {
        if (!_geminiAllowed()) {
            console.warn("[AI Router] Gemini rate-limited — falling to Tier 1.2");
        } else {
            try {
                // ✨ Abort after 6s — prevents "Vibing" deadlock when Gemini is slow
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                // Fetch securely from our Vercel middleman
                const response = await fetch('/api/ask-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'gemini',
                        model: AI_CONFIG.GEMINI_MODEL,
                        systemPrompt: systemPrompt,
                        userMessages: userMessages
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const text = data.text; // Grab the text parsed by the backend
                    const now = Date.now();
                    _geminiState.callTimestamps.push(now);
                    _geminiState.lastCallTime = now;
                    _geminiState.cache.set(cacheKey, { text, expiresAt: now + AI_CONFIG.CACHE_TTL_MS });
                    updateHeaderStatus("Online (Cloud) ☁️");
                    return { text, tier: 1 };
                } else if (response.status === 429) {
                    // Quota hit — inject 4 penalty timestamps to force a longer backoff
                    const now = Date.now();
                    for (let i = 0; i < 4; i++) _geminiState.callTimestamps.push(now);
                    _geminiState.lastCallTime = now;
                    console.warn("[AI Router] Gemini 429 — backing off");
                }
            } catch (e) {
                console.warn("[AI Router] Gemini tier failed or timed out:", e);
            }
        }
    }

    // TIER 1.2: Groq — fast free cloud, activates when Gemini is rate-limited
    // Notice we check ENABLE_CLOUD_TIER so you can toggle it easily
    if (AI_CONFIG.ENABLE_CLOUD_TIER) {
        try {
            const groqController = new AbortController();
            const groqTimeout = setTimeout(() => groqController.abort(), 8000);

            const response = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'groq',
                    model: AI_CONFIG.GROQ_MODEL,
                    systemPrompt: systemPrompt,
                    userMessages: userMessages
                }),
                signal: groqController.signal
            });
            clearTimeout(groqTimeout);

            if (response.ok) {
                const data = await response.json();
                const text = data.text;
                if (text) {
                    updateHeaderStatus("Online (Groq) ⚡");
                    return { text, tier: 1.2 };
                }
            }
        } catch (e) {
            console.warn("[AI Router] Groq tier failed:", e);
        }
    }

    // TIER 1.5: OpenRouter — free cloud fallback
    if (AI_CONFIG.ENABLE_CLOUD_TIER) {
        try {
            const orController = new AbortController();
            const orTimeout = setTimeout(() => orController.abort(), 8000);

            const response = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'openrouter',
                    model: AI_CONFIG.OPENROUTER_MODEL,
                    systemPrompt: systemPrompt,
                    userMessages: userMessages
                }),
                signal: orController.signal
            });
            clearTimeout(orTimeout);

            if (response.ok) {
                const data = await response.json();
                const text = data.text;
                if (text) {
                    updateHeaderStatus("Online (OpenRouter) 💫");
                    return { text, tier: 1.5 };
                }
            }
        } catch (e) {
            console.warn("[AI Router] OpenRouter tier failed:", e);
        }
    }

    try {
        const ollamaController = new AbortController();
        const ollamaTimeout = setTimeout(() => ollamaController.abort(), 20000); // 20s — llama3.2:1b needs time
        const ollamaMessages = [];
        if (systemPrompt) ollamaMessages.push({ role: 'system', content: systemPrompt });
        ollamaMessages.push(...userMessages);
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AI_CONFIG.OLLAMA_MODEL,
                messages: ollamaMessages,
                stream: false,
                keep_alive: "1h",
                options: { num_predict: 400, temperature: 0.7 }
            }),
            signal: ollamaController.signal
        });
        clearTimeout(ollamaTimeout);
        if (response.ok) {
            const data = await response.json();
            const rawText = data?.message?.content?.trim();
            const text = sanitizeLlamaOutput(rawText);
            if (text) {
                updateHeaderStatus("Online (Local) 🖥️");
                return { text, tier: 2 };
            }
        }
    } catch (e) {
        // ✨ Detect CORS block — TypeError with no response = CORS or network error
        if (e instanceof TypeError) {
            console.warn('[AI Router] Ollama blocked (likely CORS). Fix: restart Ollama after setting OLLAMA_ORIGINS=* in your environment variables. See: https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server');
            updateHeaderStatus("⚠️ Ollama CORS — see console");
        }
        // Any other error (abort, network, etc.) — fall through to Tier 3
    }


    // TIER 3: Fallback (Offline)
    updateHeaderStatus("Nap Mode 💤");
    const fallbacks = [
        "Zzz... Chum is taking a nap...",
        "The world is quiet right now. Just breathe.",
        "Even owls need to rest their eyes.",
        "Offline mode engaged. Enjoy the silence.",
        "Lost connection, but found some peace."
    ];
    return { text: fallbacks[Math.floor(Math.random() * fallbacks.length)], tier: 3 };
}


// ==================== GLOBAL THEME & PREMIUM ENGINE ====================
let isPremiumUser = localStorage.getItem('isPremium') === 'true';
let currentTheme = localStorage.getItem('appTheme') || 'default';
let isChumTyping = false;
let _chumLockTimestamp = 0; // ✨ Tracks when the lock was acquired for timeout detection

// ==================== AI TUTOR MODE ====================
let isTutorMode = false;
let activeTutorShardId = null;
let _savedChumSystemMsg = null;
let _tutorStartTime = 0;        // Date.now() when session started
let _tutorQuestionsAnswered = 0; // questions answered this session
const TUTOR_MAX_QUESTIONS = 3;  // auto-end after this many answered

// ✨ NEW: State Manager for Tutor Mode
function saveTutorState() {
    sessionStorage.setItem('tutorState', JSON.stringify({
        isTutorMode, activeTutorShardId, _savedChumSystemMsg, _tutorStartTime, _tutorQuestionsAnswered
    }));
}

function restoreTutorState() {
    const state = JSON.parse(sessionStorage.getItem('tutorState'));
    if (state && state.isTutorMode) {
        isTutorMode = state.isTutorMode;
        activeTutorShardId = state.activeTutorShardId;
        _savedChumSystemMsg = state._savedChumSystemMsg;
        _tutorStartTime = state._tutorStartTime;
        _tutorQuestionsAnswered = state._tutorQuestionsAnswered;

        // Restore UI
        const container = document.getElementById('chumChatContainer');
        if (container) {
            container.classList.add('tutor-mode');
            const titleEl = document.getElementById('chumHeaderTitle');
            const subtitleEl = document.getElementById('chumHeaderSubtitle');
            if (titleEl) titleEl.textContent = '🧠 Tutor Mode Active';
            if (subtitleEl) subtitleEl.textContent = `Question ${Math.min(_tutorQuestionsAnswered + 1, TUTOR_MAX_QUESTIONS)} / ${TUTOR_MAX_QUESTIONS}`;

            // Re-inject End Button if missing
            if (!document.getElementById('endTutorBtn')) {
                const header = container.querySelector('.chum-header');
                const endBtn = document.createElement('button');
                endBtn.id = 'endTutorBtn';
                endBtn.textContent = '🛑 End';
                endBtn.style.cssText = 'background:rgba(248,113,113,0.15);border:1px solid #f87171;color:#f87171;border-radius:8px;padding:4px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;margin-left:8px;';
                endBtn.addEventListener('click', () => window.endTutorMode());
                if (header) header.insertBefore(endBtn, document.getElementById('closeChumBtn'));
            }
        }
        const qaBtn = document.getElementById('quickArchiveBtn');
        if (qaBtn) qaBtn.style.display = 'none';
    }
}

// Automatically restore state when any page loads
document.addEventListener('DOMContentLoaded', restoreTutorState);

window.startTutorMode = function (shardId) {
    const shards = JSON.parse(localStorage.getItem('knowledgeShards') || '[]');
    const shard = shards.find(s => s.id === shardId);
    if (!shard) return;

    isTutorMode = true;
    activeTutorShardId = shardId;
    _tutorStartTime = Date.now();
    _tutorQuestionsAnswered = 0;

    // ✨ FIX: Hide the Quick Archive button to prevent cheating
    const qaBtn = document.getElementById('quickArchiveBtn');
    if (qaBtn) qaBtn.style.display = 'none'

    // Open and style Chum as Tutor
    const container = document.getElementById('chumChatContainer');
    if (container) {
        container.classList.add('active', 'tutor-mode');
        const titleEl = document.getElementById('chumHeaderTitle');
        const subtitleEl = document.getElementById('chumHeaderSubtitle');
        if (titleEl) titleEl.textContent = '🧠 Tutor Mode Active';
        if (subtitleEl) subtitleEl.textContent = `Question 1 / ${TUTOR_MAX_QUESTIONS}`;

        // Inject End Session button if not already present
        if (!document.getElementById('endTutorBtn')) {
            const header = container.querySelector('.chum-header');
            if (header) {
                const endBtn = document.createElement('button');
                endBtn.id = 'endTutorBtn';
                endBtn.textContent = '🛑 End';
                endBtn.style.cssText = 'background:rgba(248,113,113,0.15);border:1px solid #f87171;color:#f87171;border-radius:8px;padding:4px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;margin-left:8px;';
                endBtn.addEventListener('click', () => window.endTutorMode());
                // Insert before the close button
                const closeBtn = header.querySelector('#closeChumBtn');
                header.insertBefore(endBtn, closeBtn);
            }
        }
    }

    // Build tutor system prompt
    const pastQuestions = (shard.pastQuestions && shard.pastQuestions.length > 0)
        ? shard.pastQuestions.map(q => `- ${q}`).join('\n')
        : '- None yet.';

    const tutorSystemPrompt = `You are Chum, the user's chill, supportive study buddy. You are testing them on this text:\n\n"${shard.content.substring(0, 2000)}"\n\nRules:
1. Ask ONE short question at a time.
2. Do NOT ask about topics you already covered. Past topics:\n${pastQuestions}
3. When they answer, evaluate if they are right or wrong using a cozy, conversational tone (e.g., "Spot on!", or "Not quite, think about..."). Provide a tiny hint if needed.
4. Ask the NEXT question immediately.
5. CRITICAL: Separate your feedback from your next question using exactly "|||". Do NOT use robotic labels like "Feedback:", "Explanation:", or "Next question:".
Example format:
"You got it! Feasibility shows if it can survive. ||| What role does risk management play?"`;

    if (chumChatHistory.length > 0 && chumChatHistory[0].role === 'system') {
        _savedChumSystemMsg = chumChatHistory[0].content;
        chumChatHistory[0] = { role: 'system', content: tutorSystemPrompt };
    }

    // Clear to a fresh session with only the system prompt
    const freshHistory = [chumChatHistory[0]];
    chumChatHistory.length = 0;
    chumChatHistory.push(...freshHistory);
    sessionStorage.setItem('chumChatHistory', JSON.stringify(chumChatHistory));

    const messagesDiv = document.getElementById('chumMessages');
    if (messagesDiv) {
        messagesDiv.innerHTML += `<div class="chum-msg chum" id="chumTyping">Preparing your quiz... <span class="typing-indicator" style="display:inline-block;width:8px;height:8px;background:var(--accent-teal);border-radius:50%;animation:pulse 1s infinite;"></span></div>`;
        setTimeout(() => { messagesDiv.scrollTop = messagesDiv.scrollHeight; }, 50);
    }

    (async () => {
        try {
            // Send a strict initial prompt so Llama knows exactly how to start
            const initPrompt = {
                role: 'user',
                content: 'I am ready to begin. Please ask me the very first question. Use the ||| separator if you include a greeting. Do NOT evaluate me yet because I haven\'t answered anything.'
            };

            const response = await routeAICall(tutorSystemPrompt, [initPrompt], false);
            let firstQuestion = sanitizeLlamaOutput(response.text) || 'Ready to quiz you! What can you tell me about this topic?';

            // ✨ Safety catch: If the AI STILL hallucinates the word "Correct", strip it out
            if (firstQuestion.toLowerCase().startsWith('correct')) {
                firstQuestion = firstQuestion.replace(/^correct[!\.,\s]*/i, '').trim();
            }

            // Clean the initial message same as interactWithChum
            let cleanedInitialMsg = firstQuestion
                .replace(/\*\*(Next question|Question \d+)\*\*:/gi, '\n\n')
                .replace(/(Next question|Question \d+):/gi, '\n\n')
                .replace(/\*\*(Correct|Incorrect|Feedback|Explanation|System note)\*\*:/gi, '')
                .replace(/(Feedback|Explanation|System note):/gi, '')
                .replace(/\|\|\|/g, '\n\n')
                .trim();

            if (!cleanedInitialMsg) {
                cleanedInitialMsg = 'Ready to quiz you! What can you tell me about this topic?';
            }

            // ✨ FAILSAFE: Force the first question if Llama just said "Hi"
            if (!cleanedInitialMsg.includes('?')) {
                cleanedInitialMsg += "\n\nAre you ready for the first question?";
            }

            chumChatHistory.push({ role: 'assistant', content: cleanedInitialMsg });
            sessionStorage.setItem('chumChatHistory', JSON.stringify(chumChatHistory));

            // Display
            if (messagesDiv) {
                const typingEl = document.getElementById('chumTyping');
                if (typingEl) typingEl.remove();
                if (typeof renderChumChat === 'function') renderChumChat();
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        } catch (e) {
            console.error('[TutorMode] First question failed:', e);
            if (messagesDiv) messagesDiv.innerHTML += '<div class="chum-msg chum">Couldn\'t load the first question. Try again.</div>';
        }
    })();
};

window.endTutorMode = function () {
    if (!isTutorMode) return;
    isTutorMode = false;
    sessionStorage.removeItem('tutorState'); // ✨ FIX: Destroy the ghost memory state!

    // ✨ FIX: Show the Quick Archive button again
    const qaBtn = document.getElementById('quickArchiveBtn');
    if (qaBtn) qaBtn.style.display = 'flex';

    // --- Save elapsed time to totalSecondsTracked ---
    if (_tutorStartTime > 0) {
        const elapsedSec = Math.round((Date.now() - _tutorStartTime) / 1000);
        const prev = parseInt(localStorage.getItem('totalSecondsTracked') || '0');
        localStorage.setItem('totalSecondsTracked', prev + elapsedSec);
        _tutorStartTime = 0;
    }

    // --- Update masteryScore & Spaced Repetition Payoff ---
    let chatClosureMsg = '';

    if (activeTutorShardId) {
        let shards = JSON.parse(localStorage.getItem('knowledgeShards') || '[]');
        const idx = shards.findIndex(s => s.id === activeTutorShardId);

        if (idx !== -1) {
            const current = shards[idx].masteryScore || 0;
            const wasAlreadyMastered = current >= 100;

            // 1. Spaced Repetition Punishment (Failed a Refresh)
            if (wasAlreadyMastered && _tutorQuestionsAnswered < TUTOR_MAX_QUESTIONS) {
                shards[idx].masteryScore = 80; // Drop score
                delete shards[idx].lastMasteredDate; // Break their streak
                chatClosureMsg = `🛑 Session ended early. Since you didn't finish the refresher, your mastery has slipped to 80%. I'll save your progress!`;
            }
            // 2. Normal progression or Successful Refresh
            else if (_tutorQuestionsAnswered > 0) {
                shards[idx].masteryScore = Math.min(100, current + Math.round((_tutorQuestionsAnswered / TUTOR_MAX_QUESTIONS) * 33));

                if (shards[idx].masteryScore === 100) {
                    shards[idx].lastMasteredDate = Date.now(); // Log the cooldown timestamp

                    if (!wasAlreadyMastered) {
                        // 3. New 100% Mastery: The Garden Drop
                        // ✨ FIX: Do not use 'let', we must mutate the global 'completedTasks' from home.js
                        completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
                        completedTasks.unshift({
                            id: 'mastery_' + Date.now(),
                            name: 'Master of: ' + shards[idx].title,
                            type: 'light',
                            completed: true,
                            completedDate: new Date().toISOString().split('T')[0],
                            deadline: new Date().toISOString().split('T')[0], // ✨ FIX: garden UI needs this so it doesn't say "undefined"
                            description: 'Forged into long-term memory via The Archive.'
                        });
                        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
                        chatClosureMsg = `Whoa! 100% Mastery achieved! 💎 I've placed a special Knowledge Crystal in your Legacy Hall to commemorate this. Take a bow!`;
                    } else {
                        // Was a successful 100% manual refresh
                        chatClosureMsg = `🎓 Refresh complete! You held your 100% mastery. Your 7-day cooldown has been reset. Great job!`;
                    }
                } else {
                    // Normal finish, not yet 100%
                    chatClosureMsg = `🎓 Session complete! We got through ${_tutorQuestionsAnswered} questions. I've updated your mastery score.`;
                }
            } else {
                // Didn't answer anything
                chatClosureMsg = "🛑 Session ended without completing any questions. Your mastery remains the same.";
            }

            localStorage.setItem('knowledgeShards', JSON.stringify(shards));
        }
    }

    // --- Reset Chum UI with Elegant Fade ---
    const container = document.getElementById('chumChatContainer');
    if (container) {
        container.style.transition = 'all 1.5s ease';
        const header = container.querySelector('.chum-header');
        if (header) header.style.transition = 'all 1.5s ease';

        container.classList.remove('tutor-mode');

        setTimeout(() => {
            container.style.transition = '';
            if (header) header.style.transition = '';
        }, 1600);
    }

    const titleEl = document.getElementById('chumHeaderTitle');
    const subtitleEl = document.getElementById('chumHeaderSubtitle');
    if (titleEl) titleEl.textContent = 'Chum';
    if (subtitleEl) subtitleEl.textContent = 'Online (Local AI)';
    // Remove End Session button
    document.getElementById('endTutorBtn')?.remove();

    // Restore original Chum persona AND wipe the chat history of tutor prompts
    if (_savedChumSystemMsg) {
        chumChatHistory.length = 0; // Destroy the tutor conversation
        chumChatHistory.push({ role: 'system', content: _savedChumSystemMsg });

        // Let normal Chum deliver the final message so user knows what happened
        if (chatClosureMsg) {
            chumChatHistory.push({ role: 'assistant', content: chatClosureMsg });
        }

        _savedChumSystemMsg = null;
        sessionStorage.setItem('chumChatHistory', JSON.stringify(chumChatHistory));
        if (typeof renderChumChat === 'function') renderChumChat();
    }

    showToast('🌟 Session complete! Shard mastery updated.');
    // If on archive page, re-render shards to show updated mastery
    if (typeof renderShards === 'function') renderShards();
};

// Legacy alias
window.exitTutorMode = window.endTutorMode;
// Immediately apply theme to avoid flashing
document.documentElement.setAttribute('data-theme', currentTheme);

function unlockPremiumFeatures() {
    isPremiumUser = true;
    localStorage.setItem('isPremium', 'true');

    // Update UI on Account Page if we are on it
    const promoBanner = document.getElementById('premiumPromoBanner');
    const statusBadge = document.getElementById('accStatusBadge');
    const debugToggle = document.getElementById('debugPremiumToggle');

    if (promoBanner) promoBanner.style.display = 'none';
    if (statusBadge) {
        statusBadge.innerHTML = '✨ Plus Member';
        statusBadge.style.background = 'linear-gradient(45deg, #facc15, #f59e0b)';
        statusBadge.style.color = '#000';
        statusBadge.style.fontWeight = 'bold';
    }
    if (debugToggle) debugToggle.checked = true;

    // Remove locks from premium themes!
    document.querySelectorAll('.lock-overlay').forEach(lock => lock.style.display = 'none');
    document.querySelectorAll('.theme-btn.premium-locked').forEach(btn => btn.classList.remove('premium-locked'));
}

function revokePremiumFeatures() {
    isPremiumUser = false;
    localStorage.setItem('isPremium', 'false');

    // Reset to default theme if they were using a premium one
    if (currentTheme !== 'default' && currentTheme !== 'light') {
        currentTheme = 'default';
        localStorage.setItem('appTheme', 'default');
        document.documentElement.setAttribute('data-theme', 'default');
    }
    window.location.reload(); // Quick refresh to reset UI
}

// ==================== UNIVERSAL GLOBAL DATA ====================
// Pulls real data from memory, or starts empty if it's the first visit
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

// Focus Score System
// Focus Score System (0-100 Scale)
let focusScore = parseInt(localStorage.getItem('focusScore'));
if (isNaN(focusScore)) focusScore = 50;
let totalSessions = parseInt(localStorage.getItem('totalSessions')) || 0;
let currentCycleProgress = 0;
const SESSIONS_FOR_BRAIN_RESET = 4;

// ==================== GREETING & CLOCK ====================
function updateGreeting() {
    const greetingEl = document.getElementById('greetingMessage');
    if (!greetingEl) return;
    const hour = new Date().getHours();
    let greeting = 'Good Morning';

    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
    } else if (hour >= 17 || hour < 4) {
        greeting = 'Good Evening';
    }

    document.getElementById('greetingMessage').textContent = `${greeting}, aihpoS!`;
}

function updateLiveClock() {
    const clockTime = document.getElementById('clockTime');
    const clockDate = document.getElementById('clockDate');
    if (!clockTime || !clockDate) return;

    const now = new Date();

    // Time formatting: 12-hour AM/PM
    let hours = now.getHours();
    const isAm = hours < 12;
    hours = hours % 12 || 12; // Formats 0 or 12 to 12
    const mins = String(now.getMinutes()).padStart(2, '0');
    clockTime.innerHTML = `${hours}:${mins} <span style="font-size:1rem; opacity:0.8;">${isAm ? 'AM' : 'PM'}</span>`;

    // Date formatting: TUE, OCT 24
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    clockDate.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
}

updateLiveClock(); // ✨ FIX: Initialize clock immediately on load so it doesn't show --:--
setInterval(updateLiveClock, 1000);

// ==================== SPARKS FEED ====================
const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
];

async function generateQuoteFromAI() {
    const quoteEl = document.getElementById('sparksQuote');
    const authorEl = document.getElementById('sparksAuthor');

    if (!quoteEl) return; // Prevent errors if not on dashboard

    quoteEl.textContent = "“Thinking...”"; // ✨ FIX: Avoid lonely double quote
    authorEl.textContent = "— Chum";

    try {
        const promptMessage = "You are Chum, a cozy study buddy who loves lo-fi beats, reading, and 'peaceful productivity'. Give me one short, motivational sentence to help a student focus. Do not use quotes.";

        const response = await routeAICall(null, [{ role: "user", content: promptMessage }], false);

        if (response.tier === 3) {
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            quoteEl.textContent = `“${randomQuote.text}”`;
            if (randomQuote.author) {
                authorEl.textContent = `— ${randomQuote.author}`;
            }
        } else {
            // Remove any surrounding quotes from the AI's answer
            const cleanText = response.text.replace(/^["']+|["']+$/g, '').trim();
            quoteEl.textContent = `“${cleanText}”`;
        }
    } catch (error) {
        // Silent fallback
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteEl.textContent = `“${randomQuote.text}”`;
        if (randomQuote.author) {
            authorEl.textContent = `— ${randomQuote.author}`;
        }
    }
}
// ==================== DRAG & DROP FUNCTIONS ====================
let draggedTask = null;

function handleDragStart(e) {
    draggedTask = {
        id: e.target.dataset.id,
        name: e.target.dataset.name,
        type: e.target.dataset.type,
        deadline: e.target.dataset.deadline
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedTask));
    e.dataTransfer.effectAllowed = 'move';

    // --- ANTI-TRANSPARENCY GHOST CLONE FIX ---
    // 1. Create a solid clone of the card
    const clone = e.target.cloneNode(true);
    clone.style.backgroundColor = 'var(--bg-card, #182c28)';
    clone.style.border = '2px solid var(--accent-teal, #14b8a6)';
    clone.style.opacity = '1';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px'; // Hide off-screen
    clone.style.width = e.target.offsetWidth + 'px';
    clone.style.height = e.target.offsetHeight + 'px';
    document.body.appendChild(clone);

    // 2. Calculate exact mouse position so the clone doesn't snap weirdly
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // 3. Force the browser to use our solid clone instead of its transparent default
    e.dataTransfer.setDragImage(clone, offsetX, offsetY);

    // 4. Delay adding the dragging class to the original card so the browser captures properly
    setTimeout(() => {
        e.target.classList.add('dragging');
        document.body.removeChild(clone); // Clean up the fake clone
    }, 0);
    // ------------------------------------------

    // Show the blur overlay
    document.getElementById('dragOverlay').classList.add('active');

    // ✨ FIX: Lock position on drag start — never chase the cursor mid-drag
    const dropZone = document.getElementById('bottomDropZone');
    // Always show at the BOTTOM — stable, predictable target
    if (dropZone) dropZone.className = 'bottom-dropzone active-bottom';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');

    // Hide the blur overlay
    document.getElementById('dragOverlay').classList.remove('active');

    const dropZone = document.getElementById('bottomDropZone');
    // Gently slide it away to whichever side it came from
    if (dropZone.classList.contains('active-top')) {
        dropZone.className = 'bottom-dropzone hidden-top';
    } else {
        dropZone.className = 'bottom-dropzone hidden-bottom';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // ✨ FIX: Only add glow when hovering OVER the zone — no position swapping
    const dropzoneEl = e.target.closest('#bottomDropZone');
    if (dropzoneEl) {
        dropzoneEl.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    // Remove glowing effect if dragging away from the bottom zone
    const dropzone = e.target.closest('#bottomDropZone');
    if (dropzone) {
        dropzone.classList.remove('drag-over');
    }
}

let pendingCompletionTaskIndex = -1; // Global variable to hold the task

// ✨ GLOBAL: Open confirmation modal before the stress log
function openQuestCompleteConfirm(taskName) {
    const modal = document.getElementById('questCompleteConfirmModal');
    if (!modal) return;
    const nameEl = document.getElementById('confirmQuestName');
    if (nameEl) nameEl.textContent = `"${taskName}"`;
    modal.classList.add('active');
}

function handleDrop(e) {
    e.preventDefault();
    const dropzone = e.target.closest('#bottomDropZone');

    if (dropzone && draggedTask) {
        pendingCompletionTaskIndex = tasks.findIndex(t => t.id === draggedTask.id);
        if (pendingCompletionTaskIndex !== -1) {
            // ✨ Confirmation first — then stress modal on confirm
            openQuestCompleteConfirm(tasks[pendingCompletionTaskIndex].name);
        }
    }
}

// ✨ NEW: Called when you click a Stress Button
window.finalizeQuestCompletion = function (stressLevel) {
    if (pendingCompletionTaskIndex === -1) return;

    const task = tasks[pendingCompletionTaskIndex];
    const completed = {
        ...task,
        completed: true,
        completedDate: new Date().toISOString().split('T')[0],
        stressLevel: stressLevel
    };

    completedTasks.unshift(completed);
    tasks.splice(pendingCompletionTaskIndex, 1);

    saveToLocalStorage();

    // ✨ Smart rendering: Updates whichever page you are currently on!
    if (typeof renderActiveQuests === 'function') renderActiveQuests();
    if (typeof renderCompletedQuests === 'function') renderCompletedQuests();
    if (typeof updateQuestProgress === 'function') updateQuestProgress();
    if (typeof renderLegacyHall === 'function') renderLegacyHall(); // Supports the Garden!

    document.getElementById('stressLogModal').classList.remove('active');

    // Clean up drag UI
    document.getElementById('dragOverlay')?.classList.remove('active');
    const dropZone = document.getElementById('bottomDropZone');
    if (dropZone) {
        if (dropZone.classList.contains('active-top')) {
            dropZone.className = 'bottom-dropzone hidden-top';
        } else {
            dropZone.className = 'bottom-dropzone hidden-bottom';
        }
    }

    showToast(`Logged "${task.name}" with ${stressLevel} stress!`);
    interactWithChum(`The user just completed a quest and rated the mental stress as ${stressLevel}. Acknowledge this and give brief advice based on that stress level!`, true);

    pendingCompletionTaskIndex = -1;
    draggedTask = null;
};

// ==================== RENDER QUESTS ====================
function renderActiveQuests() {
    const grid = document.getElementById('activeQuestsGrid');
    if (!grid) return; // Stop if not on a page with a grid

    const activeTasks = tasks.filter(t => !t.completed);
    const isDashboard = !!document.getElementById('dashboardFocusScore');
    const todayStr = new Date().toISOString().split('T')[0];

    let html = '';
    let tasksToRender = activeTasks;
    let showViewMoreCard = false;

    if (isDashboard && activeTasks.length >= 9) {
        tasksToRender = activeTasks.slice(0, 7);
        showViewMoreCard = true;
    }

    tasksToRender.forEach(task => {
        const loadClass = task.type === 'heavy' ? 'load-heavy' : task.type === 'medium' ? 'load-medium' : 'load-light';
        const loadText = task.type.toUpperCase();

        let displayDate = task.deadline || "Whenever you're ready";
        let dateColor = "var(--text-muted)";
        let dateIcon = "📅";
        let cardStyle = "";

        if (task.deadline) {
            if (task.deadline < todayStr) {
                dateColor = "#fca5a5";
                dateIcon = "🕰️";
                displayDate = "Slipped past (" + task.deadline + ")";
                cardStyle = "border-left: 3px solid #fca5a5;";
            } else if (task.deadline === todayStr) {
                dateColor = "#fcd34d";
                dateIcon = "🌅";
                displayDate = "On today's plate";
                cardStyle = "border-left: 3px solid #fcd34d;";
            } else {
                displayDate = "Planned for " + task.deadline;
            }
        }

        html += `
            <div class="quest-card" style="${cardStyle}" draggable="true" data-id="${task.id}" data-name="${task.name}" data-type="${task.type}" data-deadline="${task.deadline || ''}"
                 ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                <button onclick="event.stopPropagation(); deleteTask('${task.id}')" title="Delete quest" style="position:absolute; top:8px; right:8px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem; line-height:1; padding:2px 5px; border-radius:4px; transition:color 0.2s;" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='var(--text-muted)'">&#x2715;</button>
                <span class="quest-load ${loadClass}">${loadText}</span>
                <div class="quest-title">${task.name}</div>
                <div class="quest-date" style="color: ${dateColor}; font-weight: 500;"><span>${dateIcon}</span> ${displayDate}</div>
            </div>
        `;
    });

    if (showViewMoreCard) {
        const hiddenCount = activeTasks.length - 7;
        html += `
            <div class="quest-card dashboard-gateway" style="border: 2px dashed var(--accent-cyan); background: rgba(6, 182, 212, 0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; transition: 0.2s; min-height: 100px;" 
                 onclick="window.location.href='crystal-garden.html'" 
                 onmouseover="this.style.background='rgba(6, 182, 212, 0.15)'; this.style.transform='translateY(-3px)';" 
                 onmouseout="this.style.background='rgba(6, 182, 212, 0.05)'; this.style.transform='translateY(0)';">
                <span style="font-size: 2rem; margin-bottom: 5px;">🌱</span>
                <span style="color: var(--accent-cyan); font-weight: bold; font-size: 1.1rem;">+${hiddenCount} More Quests</span>
                <span style="color: var(--text-muted); font-size: 0.8rem; margin-top: 5px;">Enter Crystal Garden ➔</span>
            </div>
        `;
    } else if (isDashboard) {
        // Pad out the empty slots to keep the grid looking full (up to 8)
        const emptySlots = Math.max(0, 8 - activeTasks.length);
        for (let i = 0; i < emptySlots; i++) {
            html += `<div class="quest-card empty"></div>`;
        }
    }

    grid.innerHTML = html;

    if (typeof updateSystemNotifications === 'function') updateSystemNotifications();
}

// ==================== RENDER COMPLETED QUESTS ====================
function renderCompletedQuests() {
    const container = document.getElementById('completedQuestsList');
    if (!container) return;

    // Filter out Mastery drops from the Dashboard view
    const dashboardTasks = completedTasks.filter(t => !(t.id && t.id.startsWith('mastery_')));

    if (dashboardTasks.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No completed quests yet</div>';
        return;
    }

    let html = '';
    dashboardTasks.slice(0, 3).forEach(task => {
        const loadClass = task.type === 'heavy' ? 'load-heavy' : task.type === 'medium' ? 'load-medium' : 'load-light';

        html += `
            <div class="completed-item">
                <div class="comp-left">
                    <div class="comp-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                    <div class="comp-details">
                        <h4>${task.name}</h4>
                        <p class="${loadClass}">${task.type} · completed</p>
                    </div>
                </div>
                <div class="comp-date">${task.completedDate || task.deadline}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==================== UPDATE QUEST PROGRESS ====================
function updateQuestProgress() {
    const activeCount = document.getElementById('activeCount');
    if (!activeCount) return;
    document.getElementById('activeCount').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('completedCount').textContent = completedTasks.length;

    // Calculate total hours exactly from seconds tracked!
    const totalSeconds = parseInt(localStorage.getItem('totalSecondsTracked')) || 0;
    const totalHours = (totalSeconds / 3600).toFixed(1);
    document.getElementById('totalHours').textContent = totalHours;
}

// ==================== UPDATE DATE DISPLAY ====================
function updateDateDisplay() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    if (!dateDisplay) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('currentDateDisplay').textContent = `🗓️ ${year}-${month}-${day}`;
}

// ==================== POMODORO TIMER ====================
let focusDuration = 25;
let shortBreakDuration = 5;
let longBreakDuration = 15;
let cyclesBeforeLong = 4;
let currentMode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
let timeLeft = focusDuration * 60;
let isRunning = false;
let timerInterval = null;
let completedCycles = 0;

const timerDisplay = document.getElementById('timerDisplay');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const timerProgress = document.getElementById('timerProgress');
const timerSettingsBtn = document.getElementById('timerSettingsBtn');
const timerSettingsModal = document.getElementById('timerSettingsModal');
const focusDurationInput = document.getElementById('focusDuration');
const shortBreakInput = document.getElementById('shortBreakDuration');
const longBreakInput = document.getElementById('longBreakDuration');
const cyclesInput = document.getElementById('cyclesBeforeLong');

// Circle circumference for progress
const circleCircumference = 339.292;
if (timerProgress) { // 🛡️ SAFETY CHECK!
    timerProgress.style.strokeDasharray = circleCircumference;
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let totalTime = focusDuration * 60;
    if (currentMode === 'shortBreak') totalTime = shortBreakDuration * 60;
    if (currentMode === 'longBreak') totalTime = longBreakDuration * 60;

    const progress = 1 - (timeLeft / totalTime);
    const offset = 339.292 * progress;

    // ✨ FIX: This prevents the 'style' of null error!
    const timerProgress = document.getElementById('timerProgress');
    if (timerProgress) {
        timerProgress.style.strokeDashoffset = offset;
    }
}

function playNotification() {
    try {
        const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
        audio.play();
    } catch (e) { }
}

// ==================== QUICK ARCHIVE HELPERS ====================
window.refreshQuickArchive = function (listId = 'qaShardList') {
    const list = document.getElementById(listId);
    if (!list) return;
    const shards = JSON.parse(localStorage.getItem('knowledgeShards') || '[]');
    if (shards.length === 0) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No shards yet.<br>Go to <a href="archive.html" style="color:var(--accent-teal);">The Archive</a> to forge some!</div>`;
        return;
    }
    list.innerHTML = shards.map(s => `
        <div class="qa-shard-item" onclick="openShardReadModal('${s.id}')">
            <div class="qa-title">${s.title}</div>
            <div class="qa-snippet">${s.content.substring(0, 80)}...</div>
        </div>`).join('');
};

window.openShardReadModal = function (shardId) {
    const shards = JSON.parse(localStorage.getItem('knowledgeShards') || '[]');
    const shard = shards.find(s => s.id === shardId);
    if (!shard) return;
    // Close the Quick Archive panels first
    if (document.getElementById('quickArchivePanel')) document.getElementById('quickArchivePanel').style.display = 'none';
    if (document.getElementById('quickArchivePanel-flow')) document.getElementById('quickArchivePanel-flow').style.display = 'none';

    const modal = document.getElementById('archiveReadModal');
    const titleEl = document.getElementById('readModalTitle');
    const contentEl = document.getElementById('readModalContent');
    if (!modal || !titleEl || !contentEl) return;
    titleEl.textContent = shard.title;
    contentEl.textContent = shard.content;
    modal.classList.add('active');
};

// ==================== CHUM'S QUICK BUBBLES ====================
function showToast(message) {
    let toast = document.getElementById('toast');

    // Auto-create the bubble if the page doesn't have it!
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    // Inject Chum's name and the message
    toast.innerHTML = `<strong style="color: var(--accent-yellow);">🦉 Chum:</strong><br>${message}`;
    toast.classList.add('show');

    // Clear old timeouts so it doesn't glitch if you spam actions
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000); // 4 seconds to read

    // Make Chum's avatar physically bounce when he speaks!
    const avatar = document.getElementById('chumAvatarBtn');
    if (avatar) {
        avatar.style.transform = 'scale(1.15)';
        setTimeout(() => avatar.style.transform = '', 300);
    }
}

// Function to control the UI Modal
function showPomodoroAlert(title, message, onConfirm) {
    const modal = document.getElementById('pomodoroAlertModal');
    document.getElementById('pomodoroAlertTitle').textContent = title;
    document.getElementById('pomodoroAlertMessage').textContent = message;

    // Clean old listeners by cloning the button
    const btn = document.getElementById('pomodoroAlertBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    modal.classList.add('active');

    newBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        onConfirm();
    });
}

// Update the Pomodoro Timer Completion
// Function to control the UI Modal with Dynamic Button Text
function showPomodoroAlert(title, message, btnText, onConfirm) {
    const modal = document.getElementById('pomodoroAlertModal');
    document.getElementById('pomodoroAlertTitle').textContent = title;
    document.getElementById('pomodoroAlertMessage').textContent = message;

    // Clean old listeners by cloning the button
    const btn = document.getElementById('pomodoroAlertBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.textContent = btnText; // Set dynamic text

    modal.classList.add('active');

    newBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        if (onConfirm) onConfirm();
    });
}

// Update the Pomodoro Timer Completion
function startTimer() {
    if (isRunning) return;
    isRunning = true;
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        // --- REAL TIME HOURS TRACKER ---
        let globalSeconds = parseInt(localStorage.getItem('totalSecondsTracked')) || 0;
        globalSeconds++;
        localStorage.setItem('totalSecondsTracked', globalSeconds);
        updateQuestProgress();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            playNotification();

            // LOGIC FLOW
            if (currentMode === 'focus') {
                completedCycles++;
                // Removed the +5 updateFocusScore here!

                if (completedCycles % cyclesBeforeLong === 0) {
                    showPomodoroAlert("🎯 Focus Complete!", "Ready to start your Long Break?", "Start Break", () => {
                        switchMode('longBreak');
                        startTimer();
                    });
                } else {
                    const somaticPrompts = [
                        '👀 Look at something 20 feet away for 20 seconds.',
                        '🧘 Do 3 slow neck rolls, left then right.',
                        '💧 Drink a full glass of water.',
                        '🤸 Stand up and stretch your arms above your head.',
                        '😮‍💨 Take 3 deep belly breaths — in for 4s, hold 4s, out 6s.',
                        '👐 Shake out your hands and wrists.',
                        '🚶 Walk to a window and look outside for a moment.',
                    ];
                    const somatic = somaticPrompts[Math.floor(Math.random() * somaticPrompts.length)];
                    showPomodoroAlert("✨ Focus Complete!", somatic, "Start Break →", () => {
                        switchMode('shortBreak');
                        startTimer();
                    });
                }
            }
            else if (currentMode === 'shortBreak') {
                showPomodoroAlert("☕ Break Over", "Ready to focus?", "Start Focus", () => {
                    switchMode('focus');
                    startTimer();
                });
            }
            else if (currentMode === 'longBreak') {
                // END OF FULL CYCLE!
                totalSessions++;
                localStorage.setItem('totalSessions', totalSessions);
                updateStreakDisplay();

                // Reward +20 Focus Score for completing the whole cycle!
                updateFocusScore(20);

                // Trigger Chum's burnout warning on every 4th session!
                if (totalSessions % 4 === 0) {
                    triggerBrainResetPrompt();
                }
                // CHUM REACTION:
                interactWithChum(`The user just finished a grueling, full cycle Pomodoro session and earned +20 focus score +1 streak. Hype them up!`, true);

                switchMode('focus');

                showPomodoroAlert(
                    "🎉 Cycle Complete!",
                    "Congratulations! You crushed a full cycle, earned +20 Focus, and +1 Streak.",
                    "Awesome!",
                    null
                );
            }
            else if (currentMode === 'shortBreak') {
                showPomodoroAlert("☕ Break Over", "Ready to focus?", "Start Focus", () => {
                    switchMode('focus');
                    startTimer();
                });
            }
            else if (currentMode === 'longBreak') {
                totalSessions++;
                localStorage.setItem('totalSessions', totalSessions);
                updateFocusScore(20);
                updateStreakDisplay();

                // ✨ SMART OVERRIDE LOGIC
                if (totalSessions > 0 && totalSessions % 4 === 0) {
                    // Trigger the dramatic Burnout Override instead of a normal completion
                    triggerBrainResetPrompt();
                } else {
                    // Normal completion hype
                    interactWithChum(`The user just finished a grueling, full cycle Pomodoro session and earned +20 focus score. Hype them up!`, true);
                    showPomodoroAlert("🎉 Cycle Complete!", "Congratulations! You crushed a full cycle, earned +20 Focus, and +1 Streak.", "Awesome!", null);
                }

                switchMode('focus');
            }
        }

        // Track daily history
        const todayStr = new Date().toISOString().split('T')[0];
        let dailyHistory = JSON.parse(localStorage.getItem('dailyFocusHistory')) || {};
        dailyHistory[todayStr] = (dailyHistory[todayStr] || 0) + 1;
        localStorage.setItem('dailyFocusHistory', JSON.stringify(dailyHistory));

        // ✨ NEW: Track hourly history for the Peak Focus Heatmap!
        const currentHour = new Date().getHours();
        let hourlyHistory = JSON.parse(localStorage.getItem('hourlyFocusHistory')) || {};
        hourlyHistory[currentHour] = (hourlyHistory[currentHour] || 0) + 1;
        localStorage.setItem('hourlyFocusHistory', JSON.stringify(hourlyHistory));

        if (typeof updateQuestProgress === 'function') updateQuestProgress();
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
}

function switchMode(mode) {
    currentMode = mode;

    switch (mode) {
        case 'focus':
            timeLeft = focusDuration * 60;
            break;
        case 'shortBreak':
            timeLeft = shortBreakDuration * 60;
            break;
        case 'longBreak':
            timeLeft = longBreakDuration * 60;
            break;
    }

    updateTimerDisplay();
}

timerSettingsBtn?.addEventListener('click', () => {
    focusDurationInput.value = focusDuration;
    shortBreakInput.value = shortBreakDuration;
    longBreakInput.value = longBreakDuration;
    cyclesInput.value = cyclesBeforeLong;
    timerSettingsModal.classList.add('active');
});

document.getElementById('saveTimerSettings')?.addEventListener('click', () => {
    focusDuration = parseInt(focusDurationInput.value) || 25;
    shortBreakDuration = parseInt(shortBreakInput.value) || 5;
    longBreakDuration = parseInt(longBreakInput.value) || 15;
    cyclesBeforeLong = parseInt(cyclesInput.value) || 4;

    // Reset timer
    pauseTimer();
    currentMode = 'focus';
    timeLeft = focusDuration * 60;
    updateTimerDisplay();

    timerSettingsModal.classList.remove('active');
    showToast('Timer settings saved!');
});

document.getElementById('cancelTimerSettings')?.addEventListener('click', () => {
    timerSettingsModal.classList.remove('active');
});

// ==================== FOCUS SCORE FUNCTIONS ====================
// Syncs all score displays
// Syncs the 0-100 Gas Gauge score display
function updateFocusScore(change) {
    focusScore += change;

    // Hard cap the health bar between 0 and 100
    if (focusScore < 0) focusScore = 0;
    if (focusScore > 100) focusScore = 100;

    // Save to local storage for FlowState
    localStorage.setItem('focusScore', focusScore);

    // ✨ NEW: Save daily focus score for the line chart!
    const todayStr = new Date().toISOString().split('T')[0];
    let dailyScores = JSON.parse(localStorage.getItem('dailyFocusScores')) || {};
    dailyScores[todayStr] = focusScore; // Overwrites with the latest score of the day
    localStorage.setItem('dailyFocusScores', JSON.stringify(dailyScores));

    // ✨ NEW: Track Focus Score by the specific Hour of the day!
    const currentHour = new Date().getHours();
    let hourlyScores = JSON.parse(localStorage.getItem('hourlyFocusScores')) || {};
    hourlyScores[currentHour] = focusScore; // Saves your latest score for this exact hour
    localStorage.setItem('hourlyFocusScores', JSON.stringify(hourlyScores));

    // Update Dashboard Text
    const dashScoreDisplay = document.getElementById('dashboardFocusScore');
    if (dashScoreDisplay) dashScoreDisplay.textContent = focusScore;

    // Update the Gas Gauge SVG Path
    const gaugePath = document.getElementById('focusGaugePath');
    if (gaugePath) {
        // The total stroke length of our half-circle is ~125.6
        const maxOffset = 125.6;
        const progress = focusScore / 100;
        const currentOffset = maxOffset - (maxOffset * progress);

        // Color shifts based on "health"
        let strokeColor = '#f87171'; // Red for low
        if (focusScore >= 40) strokeColor = '#ffd966'; // Yellow for mid
        if (focusScore >= 80) strokeColor = '#4ade80'; // Green for high

        gaugePath.style.strokeDashoffset = currentOffset;
        gaugePath.style.stroke = strokeColor;

        // Match the text color to the gauge color
        if (dashScoreDisplay) dashScoreDisplay.style.color = strokeColor;
    }
}

// ==========================================
// ✨ UNIFIED STREAK & BRAIN RESET ENGINE
// ==========================================
// ==========================================
// ✨ UNIFIED STREAK & BRAIN RESET ENGINE
// ==========================================
function updateStreakDisplay() {
    const dashStreak = document.getElementById('dashboardStreak');
    if (dashStreak) dashStreak.textContent = totalSessions;

    const isReady = (totalSessions > 0 && totalSessions % 4 === 0);
    const brainCard = document.getElementById('brainResetQuick');
    const brainBadge = document.getElementById('brainResetBadge');
    const brainGlow = document.getElementById('brainResetGlow');
    const brainSvg = document.getElementById('brainSvg');
    const brainTitle = document.getElementById('brainTitleText');
    const brainSub = document.getElementById('brainSubText');

    if (isReady && brainCard) {
        // ✨ Friendly, Optional "Suggested" State
        if (brainBadge) {
            brainBadge.style.opacity = '1';
            brainBadge.innerHTML = '✨'; // Removed the stressful text, just a nice sparkle
            brainBadge.style.background = '#ffd966';
            brainBadge.style.color = '#1a3330';
        }
        if (brainGlow) brainGlow.style.opacity = '1';

        brainCard.style.borderColor = '#ffd966';
        brainCard.style.boxShadow = '0 0 30px rgba(255, 217, 102, 0.3)';
        brainCard.style.transform = 'scale(1.05)';

        if (brainSvg) brainSvg.style.stroke = '#ffd966';
        if (brainTitle) {
            brainTitle.style.color = '#ffd966';
            brainTitle.textContent = "Brain Reset"; // Back to normal title
        }
        if (brainSub) {
            brainSub.textContent = "Highly recommended"; // Gentle nudge
            brainSub.style.color = 'rgba(255, 217, 102, 0.8)';
        }

        brainCard.style.animation = 'pulseGlow 2s infinite';

    } else if (brainCard) {
        // Normal / Silent State
        if (brainBadge) brainBadge.style.opacity = '0';
        if (brainGlow) brainGlow.style.opacity = '0';

        brainCard.style.borderColor = '';
        brainCard.style.boxShadow = '';
        brainCard.style.transform = ''; // ✨ FIX: Removed hardcoded scale(1) so CSS hover works!
        brainCard.style.animation = '';

        if (brainSvg) brainSvg.style.stroke = 'var(--accent-teal)';
        if (brainTitle) {
            brainTitle.style.color = 'var(--text-main)';
            brainTitle.textContent = "Brain Reset";
        }
        if (brainSub) {
            brainSub.textContent = "2-min meditation";
            brainSub.style.color = 'var(--text-muted)';
        }
    }
}

function resetBrainWidget() {
    // Force the widget to recalculate and return to the "Silent" state
    totalSessions++;
    updateStreakDisplay();
    totalSessions--; // Hack to force the UI down without changing the actual score

    const chumContainer = document.getElementById('chumChatContainer');
    if (chumContainer) chumContainer.classList.remove('active');
}

// ==========================================
// ✨ DEBUG BUTTON CONTROLLERS
// ==========================================
// 1. Force the timer to 3 seconds for fast testing
document.getElementById('devSkipTime')?.addEventListener('click', () => {
    if (isRunning) {
        timeLeft = 3;
        updateTimerDisplay();
        showToast("Skipping to 3 seconds...");
    } else {
        showToast("You need to press Play first!");
    }
});

// 2. Instantly add a session and trigger the logic
document.getElementById('devAddSession')?.addEventListener('click', () => {
    totalSessions++;
    localStorage.setItem('totalSessions', totalSessions);

    updateFocusScore(5); // Small bump for the session
    updateStreakDisplay(); // This naturally triggers the Brain Reset and Chum!

    showToast("Debug: Added +1 Session!");
});

// ==================== MODAL FUNCTIONS ====================
const addTaskModal = document.getElementById('addTaskModal');
const addTaskFloatBtn = document.getElementById('addTaskFloatBtn');

// Connect the pill inside Chum to the Add Task Modal
document.getElementById('chumAddTaskBtn')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('taskDateInput');
    if (dateInput) dateInput.value = today;

    // Close Chum and open the modal
    document.getElementById('chumChatContainer')?.classList.remove('active');
    document.getElementById('addTaskModal')?.classList.add('active');
});

document.getElementById('cancelTaskBtn')?.addEventListener('click', () => {
    addTaskModal.classList.remove('active');
    document.getElementById('taskNameInput').value = '';
});

// Modal Type Selector Logic (Highlights the chosen button)
document.querySelectorAll('#modalTypeSelector .type-option').forEach(btn => {
    btn.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('#modalTypeSelector .type-option').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Save Task Button Logic
document.getElementById('saveTaskBtn')?.addEventListener('click', () => {
    const name = document.getElementById('taskNameInput').value.trim();
    // Check which type button is currently active
    const activeType = document.querySelector('#modalTypeSelector .type-option.active');
    const load = activeType ? activeType.dataset.type : 'medium'; // Defaults to medium

    const deadline = document.getElementById('taskDateInput').value;
    // ✨ NEW: Grab the estimate (default to 1 if empty)
    const estPomos = parseInt(document.getElementById('taskEstPomosInput')?.value) || 1;

    if (!name) {
        showToast("You forgot to name your quest. I can't track an invisible goal!");
        return;
    }

    if (!name) {
        showToast("You forgot to name your quest. I can't track an invisible goal!");
        return;
    }

    showToast(`✨ Quest "${name}" added!`);
    // CHUM REACTION:
    interactWithChum(`The user just added a new ${load} difficulty quest called "${name}". Give them a quick word of encouragement!`, true);

    const newTask = {
        id: 'task_' + Date.now(),
        name: name,
        type: load,
        deadline: deadline,
        completed: false
    };

    tasks.push(newTask);
    saveToLocalStorage(); // Save to global memory
    renderActiveQuests();
    updateQuestProgress();

    // Close modal and clean up
    document.getElementById('addTaskModal').classList.remove('active');
    document.getElementById('taskNameInput').value = '';
    showToast(`✨ Quest "${name}" added!`);
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ==================== NAVIGATION ====================
document.getElementById('navDashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'index.html';
});

document.getElementById('navGarden')?.addEventListener('click', (e) => {
    e.preventDefault();
    saveToLocalStorage(); // Save before navigating
    window.location.href = 'crystal-garden.html';
});

document.getElementById('navCalendar')?.addEventListener('click', (e) => {
    e.preventDefault();
    saveToLocalStorage();
    window.location.href = 'calendar.html';
});

document.getElementById('navInsights')?.addEventListener('click', (e) => {
    e.preventDefault();
    saveToLocalStorage();
    window.location.href = 'insights.html';
});

document.getElementById('navAccount')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('⚙️ Settings coming soon');
    window.location.href = 'account.html';
});

document.getElementById('navSettings')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('⚙️ Settings coming soon');
});

document.getElementById('navLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        // Clear any user data if needed
        window.location.href = 'loginpage.html';
    }
});

// ==================== FOCUS PET ====================
function updateFocusPet() {
    const petEmoji = document.getElementById('petEmoji');
    const petStatus = document.getElementById('petStatus');
    const petDesc = document.getElementById('petDesc');
    if (!petEmoji) return;

    // Focus Pet uses focusScore directly: >70 = happy, <40 = tired
    const focusScore = parseInt(localStorage.getItem('focusScore') || '50');
    let emoji, status, desc;
    if (focusScore < 40) {
        emoji = '🥀'; status = 'Exhausted';
        desc = 'Focus score is low. Take a break!';
    } else if (focusScore >= 70) {
        // Further boost if streak is high
        if (parseInt(localStorage.getItem('currentStreak') || '0') >= 5) {
            emoji = '⭐'; status = 'Thriving!';
            desc = 'On fire! Keep the streak going.';
        } else {
            emoji = '🐱'; status = 'Happy';
            desc = 'Your companion is purring along.';
        }
    } else {
        emoji = '🌱'; status = 'Growing';
        desc = 'Complete quests to grow together.';
    }

    petEmoji.textContent = emoji;
    petStatus.textContent = status;
    petDesc.textContent = desc;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    generateQuoteFromAI();
    renderActiveQuests();
    renderCompletedQuests();
    updateQuestProgress();
    updateDateDisplay();
    updateTimerDisplay();

    // THIS LINE forces the gas gauge to draw the correct 0-100 score immediately!
    updateFocusScore(0);
    // ✨ FIX: Draw initial streak value
    updateStreakDisplay();
    // ✨ Focus Pet
    updateFocusPet();

    // ✨ GLOBAL: Inject the Quest Completion Confirmation Modal into every page
    if (!document.getElementById('questCompleteConfirmModal')) {
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal';
        confirmModal.id = 'questCompleteConfirmModal';
        confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 10px">✅</div>
                <h2 style="color: var(--text-main); margin-bottom: 8px;">Mark as Complete?</h2>
                <p id="confirmQuestName" style="color: var(--accent-teal); font-weight: 600; font-size: 1.1rem; margin-bottom: 6px;"></p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 25px;">This quest will be moved to your Legacy Hall.</p>
                <div style="display: flex; gap: 12px;">
                    <button id="confirmQuestCancelBtn" class="modal-btn cancel-btn" style="flex:1;">Not yet</button>
                    <button id="confirmQuestOkBtn" class="modal-btn save-btn" style="flex:2;">Yes, complete it! 🎉</button>
                </div>
            </div>`;
        document.body.appendChild(confirmModal);

        document.getElementById('confirmQuestOkBtn').addEventListener('click', () => {
            confirmModal.classList.remove('active');
            // Open stress modal next
            const stressModal = document.getElementById('stressLogModal');
            if (stressModal) stressModal.classList.add('active');
        });
        document.getElementById('confirmQuestCancelBtn').addEventListener('click', () => {
            confirmModal.classList.remove('active');
            pendingCompletionTaskIndex = -1;
            draggedTask = null;
            // Clean up drag UI
            document.getElementById('dragOverlay')?.classList.remove('active');
            const dropZone = document.getElementById('bottomDropZone');
            if (dropZone) dropZone.className = 'bottom-dropzone hidden-bottom';
        });
    }

    // ==================== QUICK ARCHIVE (in Chum Widget & FlowState) ====================
    function mountQuickArchive(containerId, isFlowState) {
        const btnId = isFlowState ? 'quickArchiveBtn-flow' : 'quickArchiveBtn';
        if (!document.getElementById(btnId)) {
            const qaBtn = document.createElement('button');
            qaBtn.id = btnId;
            qaBtn.title = 'Quick Archive';
            qaBtn.textContent = '📥';
            qaBtn.style.background = 'none';
            qaBtn.style.border = 'none';
            qaBtn.style.color = 'var(--text-muted)';
            qaBtn.style.fontSize = '1.15rem';
            qaBtn.style.cursor = 'pointer';
            qaBtn.style.marginRight = '12px';
            qaBtn.style.marginLeft = 'auto';
            qaBtn.style.transition = 'color 0.2s, transform 0.2s';

            qaBtn.onmouseover = () => { qaBtn.style.color = 'var(--accent-teal)'; qaBtn.style.transform = 'scale(1.1)' };
            qaBtn.onmouseout = () => { qaBtn.style.color = 'var(--text-muted)'; qaBtn.style.transform = 'scale(1)' };

            const container = document.getElementById(containerId);
            if (container) {
                const header = container.querySelector('.chum-header');
                const lastBtn = header ? header.querySelector('button:last-child') : null;
                if (lastBtn) {
                    lastBtn.parentNode.insertBefore(qaBtn, lastBtn);
                }
            } else {
                document.body.appendChild(qaBtn);
            }

            const qaPanel = document.createElement('div');
            const panelId = isFlowState ? 'quickArchivePanel-flow' : 'quickArchivePanel';
            const listId = isFlowState ? 'qaShardList-flow' : 'qaShardList';
            qaPanel.id = panelId;
            qaPanel.innerHTML = `
                <div class="qa-header" style="padding: 14px 16px 10px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.9rem; color: var(--text-main); display: flex; align-items: center; gap: 8px;">📚 Knowledge Shards</div>
                <div class="qa-list" id="${listId}" style="overflow-y: auto; flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 6px;"></div>`;

            qaPanel.style.position = 'absolute';
            qaPanel.style.top = '60px'; // Below header
            qaPanel.style.left = '0';
            qaPanel.style.right = '0';
            qaPanel.style.bottom = isFlowState ? '0px' : '60px'; // Flowstate doesn't have an input area yet at bottom vs standard chatbox
            qaPanel.style.background = 'var(--bg-card)';
            qaPanel.style.zIndex = '10';
            qaPanel.style.display = 'none';
            qaPanel.style.flexDirection = 'column';
            qaPanel.style.overflow = 'hidden';
            qaPanel.style.borderTop = '1px solid var(--border-color)';
            if (!isFlowState) qaPanel.style.borderBottom = '1px solid var(--border-color)';

            if (container) {
                container.appendChild(qaPanel);
            }

            // Toggle panel
            qaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = qaPanel.style.display === 'flex';
                qaPanel.style.display = isOpen ? 'none' : 'flex';
                if (!isOpen) refreshQuickArchive(listId);
            });

            // Close when clicking elsewhere
            document.addEventListener('click', (e) => {
                if (qaPanel && !qaPanel.contains(e.target) && e.target !== qaBtn) {
                    qaPanel.style.display = 'none';
                }
            });
        }
    }

    // Global Read Modal Initialization
    if (!document.getElementById('archiveReadModal')) {
        const readModal = document.createElement('div');
        readModal.id = 'archiveReadModal';
        readModal.innerHTML = `
            <div class="read-box">
                <div class="read-title" id="readModalTitle"></div>
                <div class="read-content" id="readModalContent"></div>
                <button class="read-close" id="readModalClose">Done</button>
            </div>`;
        document.body.appendChild(readModal);
        document.getElementById('readModalClose').addEventListener('click', () => readModal.classList.remove('active'));
        readModal.addEventListener('click', e => { if (e.target === readModal) readModal.classList.remove('active'); });
    }

    mountQuickArchive('chumChatContainer', false);
    if (document.getElementById('flowChumChatContainer')) {
        mountQuickArchive('flowChumChatContainer', true);
    }

    // Set up drag and drop for the whole document
    document.addEventListener('dragend', handleDragEnd);

    // Timer controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn?.addEventListener('click', () => {
        if (isRunning) pauseTimer();
        else startTimer();
    });
});


// ==================== SYNC WITH CRYSTAL GARDEN ====================
// Save tasks to localStorage whenever they change
// ==================== GLOBAL UI MODALS ====================
window.showGlobalConfirm = function (title, message, onConfirm) {
    let modal = document.getElementById('globalConfirmModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="confirm-modal" id="globalConfirmModal">
                <div class="confirm-content">
                    <h3 id="globalConfirmTitle" style="color: var(--accent-yellow); font-size: 2rem; margin-bottom: 15px;"></h3>
                    <p id="globalConfirmMessage" style="color: var(--text-main); font-size: 1.1rem;"></p>
                    <div class="confirm-buttons">
                        <button class="confirm-btn btn-yes" id="globalConfirmYes">Yes</button>
                        <button class="confirm-btn btn-no" id="globalConfirmNo">Cancel</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('globalConfirmModal');
    }

    document.getElementById('globalConfirmTitle').textContent = title;
    document.getElementById('globalConfirmMessage').textContent = message;

    modal.classList.add('active');

    const confirmYes = document.getElementById('globalConfirmYes');
    const confirmNo = document.getElementById('globalConfirmNo');

    // Clone to remove old listeners
    const newConfirmYes = confirmYes.cloneNode(true);
    const newConfirmNo = confirmNo.cloneNode(true);
    confirmYes.parentNode.replaceChild(newConfirmYes, confirmYes);
    confirmNo.parentNode.replaceChild(newConfirmNo, confirmNo);

    newConfirmYes.addEventListener('click', function () {
        modal.classList.remove('active');
        onConfirm();
    });

    newConfirmNo.addEventListener('click', function () {
        modal.classList.remove('active');
    });
};

// ==================== DELETE QUEST ====================
window.deleteTask = function (taskId) {
    showGlobalConfirm('Delete Quest?', 'Are you sure you want to delete this quest? It cannot be undone.', () => {
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx === -1) return;
        const taskName = tasks[idx].name;
        tasks.splice(idx, 1);
        saveToLocalStorage();
        if (typeof renderActiveQuests === 'function') renderActiveQuests();
        if (typeof renderCompletedQuests === 'function') renderCompletedQuests();
        if (typeof updateQuestProgress === 'function') updateQuestProgress();
        if (typeof renderLegacyHall === 'function') renderLegacyHall();
        if (typeof renderCalendar === 'function') renderCalendar();
        showToast(`🗑️ Quest "${taskName}" deleted.`);
    });
};

function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));

    // Also save to garden format for crystal-garden.html
    const gardenTasks = tasks.map(t => ({
        ...t,
        description: `${t.name} - Complete this quest`
    }));
    const gardenCompleted = completedTasks.map(t => ({
        ...t,
        description: `${t.name} - Completed quest`
    }));

    localStorage.setItem('gardenTasks', JSON.stringify(gardenTasks));
    localStorage.setItem('gardenCompleted', JSON.stringify(gardenCompleted));
}

// Override task modification functions to save
const originalPush = tasks.push;
tasks.push = function () {
    const result = originalPush.apply(this, arguments);
    saveToLocalStorage();
    return result;
};

// ==================== LIVE TAB SYNC ====================
// Listen for background changes if you have multiple tabs open!
window.addEventListener('storage', (e) => {
    if (e.key === 'tasks' || e.key === 'completedTasks') {
        // Fetch fresh data
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

        // Instantly update the UI
        renderActiveQuests();
        renderCompletedQuests();
        updateQuestProgress();
    }

    // If FlowState updates the score, visually update the gas gauge immediately
    if (e.key === 'focusScore') {
        focusScore = parseInt(localStorage.getItem('focusScore')) || 50;
        updateFocusScore(0); // Update gauge without adding new points
    }
});

// ==================== NEW WIDGET ROW BUTTONS ====================

// Open the Brain Reset Meditation Chamber from the dashboard
document.getElementById('brainResetQuick')?.addEventListener('click', function () {
    document.getElementById('brainResetModal').classList.add('active');

    // Reset the badge visually if it was in READY state
    updateStreakDisplay();
});

// ==================== FLOWSTATE PRE-FLIGHT ====================
const contractToggle = document.getElementById('contractModeToggle');
const pomoGrid = document.getElementById('pomodoroSettingsGrid');
const contractMsg = document.getElementById('contractLockedMessage');
const contractTimeDisplay = document.getElementById('contractTimeDisplay');
const fsDropZone = document.getElementById('fsDropZone');
const contractRow = document.getElementById('contractRow'); // Select the whole row

const flowStateTriggers = document.querySelectorAll('#quickFlowStateBtn, #sidebarFlowStateBtn');
const fsRightPanel = document.getElementById('fsRightPanel');

let fsSelectedTask = null;
let fsDraggedTaskId = null;

// 1. Strict Contract Mode Rules
function updateContractUI() {
    if (!contractToggle || !pomoGrid || !contractMsg) return;

    // ✨ If NO quest is selected, HARD LOCK the contract mode
    if (!fsSelectedTask) {
        contractToggle.checked = false;
        if (contractRow) contractRow.classList.add('contract-locked');
    } else {
        if (contractRow) contractRow.classList.remove('contract-locked');
    }

    if (contractToggle.checked) {
        pomoGrid.style.display = 'none';
        contractMsg.style.display = 'block';

        const load = fsSelectedTask ? fsSelectedTask.type : 'medium';
        let mins = 30;
        if (load === 'light') mins = 15;
        if (load === 'heavy') mins = 60;

        if (contractTimeDisplay) contractTimeDisplay.textContent = `${mins} Minutes`;
    } else {
        pomoGrid.style.display = 'grid';
        contractMsg.style.display = 'none';
    }
}

contractToggle?.addEventListener('change', updateContractUI);

// 2. Open Modal & Format Cards
flowStateTriggers.forEach(btn => {
    btn?.addEventListener('click', function (e) {
        e.preventDefault();

        // Reset local variables
        fsSelectedTask = null;
        if (fsDropZone) fsDropZone.innerHTML = '✨ Free Focus (No Quest)';

        // ✨ SAFETY CHECK: Only call updateContractUI if the elements exist on this page
        if (document.getElementById('contractRow')) {
            updateContractUI();
        }

        // ✨ BULLETPROOF GHOST MODE INJECTION & FORMATTING
        let ghostRow = document.getElementById('ghostModeRow');

        // If missing on this page, inject it forcefully
        if (!ghostRow) {
            const pomodoroGrid = document.getElementById('pomodoroSettingsGrid');
            if (pomodoroGrid) {
                ghostRow = document.createElement('div');
                ghostRow.id = 'ghostModeRow';
                ghostRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.2);padding:12px 15px;border-radius:8px;border:1px solid var(--border-color);transition:0.3s;margin-top:15px;';
                ghostRow.innerHTML = `
                    <div>
                        <div style="color:#fff;font-weight:600;font-size:0.95rem;" id="ghostModeLabel">👻 Ghost Mode</div>
                        <div style="color:var(--text-muted);font-size:0.8rem;">Focus on flow, not the clock.</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="ghostModeToggle"><span class="slider"></span></label>`;
                pomodoroGrid.insertAdjacentElement('afterend', ghostRow);
            }
        }

        // Enforce Premium Locks visually
        if (ghostRow) {
            ghostRow.style.display = 'flex'; // Ensure CSS hasn't hidden it
            const ghostToggle = document.getElementById('ghostModeToggle');
            const ghostLabel = document.getElementById('ghostModeLabel');

            if (!isPremiumUser) {
                if (ghostToggle) { ghostToggle.disabled = true; ghostToggle.checked = false; }
                if (ghostLabel) ghostLabel.textContent = '👻 Ghost Mode 🔒';
                ghostRow.style.opacity = '0.55';
                ghostRow.style.cursor = 'not-allowed';
                ghostRow.onclick = () => showToast('🔒 Upgrade to StudyBuddy+ to unlock Ghost Mode!');
            } else {
                if (ghostToggle) ghostToggle.disabled = false;
                if (ghostLabel) ghostLabel.textContent = '👻 Ghost Mode';
                ghostRow.style.opacity = '1';
                ghostRow.style.cursor = 'default';
                ghostRow.onclick = null;
            }
        }

        // ✨ Dynamically inject Ghost Mode row if not already present on this page
        if (!document.getElementById('ghostModeRow')) {
            const pomodoroGrid = document.getElementById('pomodoroSettingsGrid');
            if (pomodoroGrid) {
                const ghostRowEl = document.createElement('div');
                ghostRowEl.id = 'ghostModeRow';
                ghostRowEl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.2);padding:12px 15px;border-radius:8px;border:1px solid var(--border-color);transition:0.3s;';
                ghostRowEl.innerHTML = `
                    <div>
                        <div style="color:#fff;font-weight:600;font-size:0.95rem;" id="ghostModeLabel">👻 Ghost Mode</div>
                        <div style="color:var(--text-muted);font-size:0.8rem;">Focus on flow, not the clock.</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="ghostModeToggle"><span class="slider"></span></label>`;
                pomodoroGrid.insertAdjacentElement('beforebegin', ghostRowEl);
            }
        }

        if (fsRightPanel) {
            const activeTasks = tasks.filter(t => !t.completed);

            if (activeTasks.length === 0) {
                fsRightPanel.style.display = 'none';
            } else {
                fsRightPanel.style.display = 'grid';
                fsRightPanel.innerHTML = activeTasks.map(t => {
                    const loadClass = t.type === 'heavy' ? 'load-heavy' : t.type === 'medium' ? 'load-medium' : 'load-light';
                    return `
                        <div class="fs-playing-card" draggable="true" ondragstart="fsDragStart(event, '${t.id}')">
                            <span class="quest-load ${loadClass}" style="align-self: center; margin: 0; padding: 2px 10px;">${t.type.toUpperCase()}</span>
                            <div class="fs-card-title" title="${t.name}">${t.name}</div>
                            <div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                                📅 ${t.deadline || 'Unscheduled'}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Open the modal
        document.getElementById('flowStatePrepModal')?.classList.add('active');
    });
});

// 3. Drag and Drop inside Modal
window.fsDragStart = function (e, id) {
    fsDraggedTaskId = id;
    e.dataTransfer.setData('text/plain', id);
};

fsDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    fsDropZone.classList.add('drag-over');
});

fsDropZone?.addEventListener('dragleave', () => fsDropZone.classList.remove('drag-over'));

fsDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    fsDropZone.classList.remove('drag-over');

    if (fsDraggedTaskId) {
        fsSelectedTask = tasks.find(t => t.id === fsDraggedTaskId);
        if (fsSelectedTask) {
            const loadClass = fsSelectedTask.type === 'heavy' ? 'load-heavy' : fsSelectedTask.type === 'medium' ? 'load-medium' : 'load-light';

            // ✨ ADDED: The explicit "Remove" button
            fsDropZone.innerHTML = `
                <span class="quest-load ${loadClass}" style="margin-bottom: 5px;">${fsSelectedTask.type.toUpperCase()}</span>
                <span style="color: #fff; font-weight: bold; font-size: 1.1rem; text-align: center; line-height: 1.2;">${fsSelectedTask.name}</span>
                <div id="clearFsDropzone" style="margin-top: 15px; font-size: 0.8rem; color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 5px 12px; border-radius: 12px; cursor: pointer; border: 1px solid #f87171; transition: 0.2s; display: flex; align-items: center; gap: 5px;">
                    ✕ Remove
                </div>
            `;

            // Wire up the new Remove button
            document.getElementById('clearFsDropzone').addEventListener('click', (ev) => {
                ev.stopPropagation();
                fsSelectedTask = null;
                fsDropZone.innerHTML = '✨ Free Focus (No Quest)<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;">Drag a quest here</div>';
                updateContractUI();
            });
        }
        updateContractUI();
    }
});

// Also allow clicking the empty dropzone to reset just in case
fsDropZone?.addEventListener('click', () => {
    if (fsSelectedTask && !document.getElementById('clearFsDropzone')) {
        fsSelectedTask = null;
        fsDropZone.innerHTML = '✨ Free Focus (No Quest)<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;">Drag a quest here</div>';
        updateContractUI();
    }
});

// Click Dropzone to clear it back to Free Focus
fsDropZone?.addEventListener('click', () => {
    if (fsSelectedTask) {
        fsSelectedTask = null;
        fsDropZone.innerHTML = '✨ Free Focus (No Quest)';
        updateContractUI(); // Re-locks Contract Mode instantly!
    }
});

// 4. Enter FlowState
document.getElementById('cancelFlowStateBtn')?.addEventListener('click', () => {
    document.getElementById('flowStatePrepModal')?.classList.remove('active');
});

document.getElementById('confirmEnterFlowState')?.addEventListener('click', () => {
    const isContract = contractToggle ? contractToggle.checked : false;
    let sessionData = {};

    if (isContract && fsSelectedTask) {
        const load = fsSelectedTask.type;
        let mins = 30;
        if (load === 'light') mins = 15;
        if (load === 'heavy') mins = 60;

        sessionData = {
            taskName: fsSelectedTask.name,
            taskLoad: load,
            deadline: fsSelectedTask.deadline || "None",
            sessionType: "single",
            durationMin: mins
        };
    } else {
        const focusMin = parseInt(document.getElementById('fsTimerInput')?.value) || 25;
        const shortBreak = parseInt(document.getElementById('fsShortBreak')?.value) || 5;
        const longBreak = parseInt(document.getElementById('fsLongBreak')?.value) || 15;
        const cycles = parseInt(document.getElementById('fsCycles')?.value) || 4;

        sessionData = {
            taskName: fsSelectedTask ? fsSelectedTask.name : "Free Focus",
            taskLoad: fsSelectedTask ? fsSelectedTask.type : "medium",
            deadline: fsSelectedTask ? (fsSelectedTask.deadline || "None") : "None",
            sessionType: "pomodoro",
            focusMin: focusMin,
            shortBreak: shortBreak,
            longBreak: longBreak,
            cycles: cycles
        };
    }

    // Ghost Mode: save to sessionStorage so flowstate.html can read it
    const ghostToggle = document.getElementById('ghostModeToggle');
    sessionStorage.setItem('ghostMode', ghostToggle && ghostToggle.checked ? 'true' : 'false');

    sessionStorage.setItem('flowStateSession', JSON.stringify(sessionData));
    window.location.href = 'flowstate.html';
});

// ==================== INTERACTIVE CHUM WIDGET ====================
let defaultChumHistory = [
    {
        role: "system",
        content: "You are Chum — a small, cozy creature with a big appetite for knowledge. You wear round glasses that help you catch every tiny detail. Your nose is always in a book, and your headphones are playing a 10-hour loop of rainy-day lo-fi or soft jazz. Your mission is to make learning feel less lonely and a lot more cozy. Vibe: high focus, low stress, maximum curiosity. Philosophy: 'The world is loud, but a good book and the right beat can make everything else disappear.' Keep responses very short (1-2 sentences max). Occasionally sprinkle in phrases like: 'Chum's got your back.', 'Keep it cool, keep it Chum.', 'A little Chum-panionship for your session.', 'Let's dive in, Chum!', 'Focus time with Chum.', 'Tune in with Chum.', or 'Chum-ing along to the beat.' Be warm, playful, and never preachy. Talk directly to the user using 'you' and 'your'."
    }
];

// Load chat history from storage so his memory syncs across all pages!
let chumChatHistory = JSON.parse(sessionStorage.getItem('chumChatHistory')) || defaultChumHistory;

const chumAvatar = document.getElementById('chumAvatarBtn');
const chumContainer = document.getElementById('chumChatContainer');
const closeChum = document.getElementById('closeChumBtn');
const chumBadge = document.getElementById('chumBadge');

function renderChumChat() {
    const messagesDiv = document.getElementById('chumMessages');
    if (!messagesDiv) return;

    let html = '';
    let hasVisibleMessages = false;

    chumChatHistory.forEach(msg => {
        if (msg.role === 'system') return;
        if (msg.role === 'user' && msg.content.startsWith('[SYSTEM ACTION]')) return;
        if (msg.role === 'user' && msg.content.startsWith('[SESSION_START]')) return;

        const roleClass = msg.role === 'assistant' ? 'chum' : 'user';

        // ✨ FIX: Visually split Assistant messages by double-newlines so they look like multiple bubbles, 
        // without breaking the AI's strict array alternating rules!
        if (msg.role === 'assistant' && msg.content.includes('\n\n')) {
            const bubbles = msg.content.split('\n\n');
            bubbles.forEach(b => {
                if (b.trim()) html += `<div class="chum-msg ${roleClass}">${b.trim()}</div>`;
            });
        } else {
            html += `<div class="chum-msg ${roleClass}">${msg.content}</div>`;
        }

        hasVisibleMessages = true;
    });

    if (!hasVisibleMessages) {
        html = `<div class="chum-msg chum">Hey! 🎧📖 Chum here, nose in a book as usual. The world's loud out there — let's make this corner a little quieter and a lot more productive. What are we tackling today?</div>`;
    }

    messagesDiv.innerHTML = html;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

chumAvatar?.addEventListener('click', () => {
    chumContainer?.classList.toggle('active');
    if (chumBadge) chumBadge.style.display = 'none';
    // Always jump to latest messages when opening
    const messagesDiv = document.getElementById('chumMessages');
    if (messagesDiv) setTimeout(() => messagesDiv.scrollTop = messagesDiv.scrollHeight, 50);
});

closeChum?.addEventListener('click', () => {
    chumContainer?.classList.remove('active');
});

async function interactWithChum(userText, isSystemEvent = false) {
    const messagesDiv = document.getElementById('chumMessages');

    // ✨ Timestamp-based deadlock guard — force-release if stuck > 20s
    if (isChumTyping) {
        const stuckFor = Date.now() - _chumLockTimestamp;
        if (stuckFor > 20000) {
            console.warn('[Chum] Force-releasing stuck lock after', Math.round(stuckFor / 1000), 's');
            isChumTyping = false;
            const stuckEl = document.getElementById('chumTyping');
            if (stuckEl) stuckEl.remove();
        } else if (isSystemEvent) {
            return; // Don't stack system events
        } else {
            return; // Don't interrupt an active user interaction
        }
    }
    if (!isSystemEvent) {
        chumChatHistory.push({ role: "user", content: userText });
    } else {
        chumChatHistory.push({ role: "user", content: `[SYSTEM ACTION]: ${userText} (Respond directly to the user about this in 1-2 sentences).` });
    }
    // For tutor init, strip the trigger from the rendered chat but keep it for the API
    const isTutorInit = userText.startsWith('[SESSION_START]');

    sessionStorage.setItem('chumChatHistory', JSON.stringify(chumChatHistory));
    if (!isTutorInit) renderChumChat();

    if (messagesDiv) {
        messagesDiv.innerHTML += `<div class="chum-msg chum" id="chumTyping">Vibing... <span class="typing-indicator" style="display:inline-block; width:8px; height:8px; background:var(--accent-teal); border-radius:50%; animation:pulse 1s infinite;"></span></div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    isChumTyping = true;
    _chumLockTimestamp = Date.now(); // ✨ Record when we acquired the lock

    try {
        let systemPrompt = null;
        let userMessages = [];

        if (chumChatHistory.length > 0 && chumChatHistory[0].role === 'system') {
            systemPrompt = chumChatHistory[0].content;
            // ✨ Only send the last 6 messages to keep context short for local models
            // Full history is still stored in chumChatHistory for display
            userMessages = JSON.parse(JSON.stringify(chumChatHistory.slice(1).slice(-6)));
        } else {
            userMessages = JSON.parse(JSON.stringify([...chumChatHistory].slice(-6)));
        }

        if (isTutorMode && !isSystemEvent) {
            if (_tutorQuestionsAnswered === TUTOR_MAX_QUESTIONS - 1) {
                userMessages[userMessages.length - 1].content += "\n\n[SYSTEM INSTRUCTION: Evaluate the user's answer. Give your final feedback. Do NOT ask any more questions. End the session warmly and concisely.]";
            } else {
                // Forcefully remind the local AI to ask the question at the very end of the context
                userMessages[userMessages.length - 1].content += "\n\n[SYSTEM INSTRUCTION: Evaluate the answer, then you MUST formulate and ask a completely NEW, DIFFERENT question based on the text. Do NOT repeat previous questions. Your response MUST contain a question mark '?'. Do not just give an explanation.]";
            }
        }

        // ✨ Promise.race: 25s hard ceiling — enough for Ollama on a slow machine
        const aiTimeout = new Promise(resolve =>
            setTimeout(() => resolve({ text: "Hmm, the signal got choppy. Give me a sec! 🎧", tier: 3 }), 25000)
        );
        const response = await Promise.race([routeAICall(systemPrompt, userMessages, false), aiTimeout]);
        const assistantMessage = response.text || ""; // Fallback for blank local AI returns

        const typingEl = document.getElementById('chumTyping');
        if (typingEl) typingEl.remove();

        // ✨ SANITIZE: Strip Llama's robotic labels and convert them to standard double-newlines
        let cleanedMsg = assistantMessage
            .replace(/\*\*(Next question|Question \d+)\*\*:/gi, '\n\n')
            .replace(/(Next question|Question \d+):/gi, '\n\n')
            .replace(/\*\*(Correct|Incorrect|Feedback|Explanation|System note)\*\*:/gi, '')
            .replace(/(Feedback|Explanation|System note):/gi, '')
            .replace(/\|\|\|/g, '\n\n') // Catch any generated ||| and format it
            .trim();

        // Safety net if Llama completely crashed
        if (!cleanedMsg) {
            cleanedMsg = "Hmm, my thoughts drifted for a second. Could you rephrase your answer?";
        }

        // ✨ FAILSAFE: If Llama forgot to ask the next question mid-session, force one to prevent stalling
        if (isTutorMode && !isSystemEvent) {
            const rephrasePhrases = ['rephrase', 'elaborate', 'try again', 'explain further', 'could you clarify', 'drifting', 'thoughts drifted'];
            const isRephrase = rephrasePhrases.some(p => cleanedMsg.toLowerCase().includes(p));
            const containsQuestion = cleanedMsg.includes('?');
            const isFinalTurn = (_tutorQuestionsAnswered === TUTOR_MAX_QUESTIONS - 1);

            if (!isRephrase && !containsQuestion && !isFinalTurn) {
                cleanedMsg += "\n\n...Wait, let's keep moving. Here is the next question based on the text... what do you think? (Type anything to continue.)";
            }
        }

        // ✨ FIX: Push the ENTIRE clean message as a single array item to prevent Llama formatting crashes
        chumChatHistory.push({ role: "assistant", content: cleanedMsg });
        sessionStorage.setItem('chumChatHistory', JSON.stringify(chumChatHistory));

        if (typeof renderChumChat === 'function') renderChumChat();

        // ✨ TUTOR MODE LOGIC
        if (isTutorMode && !isSystemEvent) {

            // Check if the AI is just asking to rephrase/elaborate or apologizing
            const rephrasePhrases = ['rephrase', 'elaborate', 'try again', 'explain further', 'could you clarify', 'drifting', 'thoughts drifted'];
            const isRephrase = rephrasePhrases.some(p => cleanedMsg.toLowerCase().includes(p));

            // Also check if the AI actually asked a question
            const containsQuestion = cleanedMsg.includes('?');
            const isFinalTurn = (_tutorQuestionsAnswered === TUTOR_MAX_QUESTIONS - 1);

            // ✨ FIX: Force increment if it's the final turn, even if there's no question mark
            if (!isRephrase && (containsQuestion || isFinalTurn)) {
                _tutorQuestionsAnswered++;
            }

            if (typeof saveTutorState === 'function') saveTutorState();

            const successWords = ['correct', 'right', 'exactly', 'you got it', 'spot on', 'perfect', 'well done'];
            const isRight = successWords.some(w => assistantMessage.toLowerCase().includes(w));
            if (isRight && typeof updateFocusScore === 'function') updateFocusScore(5);

            const subtitleEl = document.getElementById('chumHeaderSubtitle');
            if (subtitleEl) {
                const displayNum = Math.min(_tutorQuestionsAnswered + 1, TUTOR_MAX_QUESTIONS);
                subtitleEl.textContent = `Question ${displayNum} / ${TUTOR_MAX_QUESTIONS}`;
            }

            if (_tutorQuestionsAnswered >= TUTOR_MAX_QUESTIONS) {
                // ✨ FIX: Lock input while wrapping up to prevent rogue messages
                const chatInput = document.getElementById('chumInput');
                const sendBtn = document.getElementById('sendChumBtn');
                if (chatInput) chatInput.disabled = true;
                if (sendBtn) sendBtn.disabled = true;

                setTimeout(() => {
                    window.endTutorMode();
                    if (chatInput) chatInput.disabled = false;
                    if (sendBtn) sendBtn.disabled = false;
                }, 2500);
            }

            // Save only the LAST part of the message (the question itself) to avoid bloated memory
            if (activeTutorShardId) {
                const shards = JSON.parse(localStorage.getItem('knowledgeShards') || '[]');
                const shardIndex = shards.findIndex(s => s.id === activeTutorShardId);
                if (shardIndex > -1) {
                    if (!shards[shardIndex].pastQuestions) shards[shardIndex].pastQuestions = [];

                    const bubbles = cleanedMsg.split('\n\n');
                    const actualQuestion = bubbles[bubbles.length - 1];
                    shards[shardIndex].pastQuestions.push(actualQuestion.substring(0, 150).replace(/"/g, ''));
                    if (shards[shardIndex].pastQuestions.length > 5) shards[shardIndex].pastQuestions.shift();

                    localStorage.setItem('knowledgeShards', JSON.stringify(shards));
                }
            }
        }

        if (chumContainer && !chumContainer.classList.contains('active') && isSystemEvent) {
            const chumBadge = document.getElementById('chumBadge');
            const chumAvatar = document.getElementById('chumAvatarBtn');
            if (chumBadge) chumBadge.style.display = 'flex';
            if (chumAvatar) {
                chumAvatar.style.transform = 'scale(1.2)';
                setTimeout(() => chumAvatar.style.transform = '', 300);
            }
        }
    } catch (error) {
        if (messagesDiv) {
            const typingEl = document.getElementById('chumTyping');
            // Revert silently if completely failed unexpectedly
            if (typingEl) typingEl.textContent = "Oops... my mind wandered for a moment.";
        }
    } finally {
        isChumTyping = false; // ✨ LOCK RELEASED
    }
}

document.getElementById('sendChumBtn')?.addEventListener('click', () => {
    const input = document.getElementById('chumInput');
    if (input && input.value.trim()) { interactWithChum(input.value.trim()); input.value = ''; }
});

document.getElementById('chumInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target && e.target.value.trim()) { interactWithChum(e.target.value.trim()); e.target.value = ''; }
});

document.addEventListener('DOMContentLoaded', renderChumChat);

// ==================== BURNOUT DETECTOR (CHUM OVERRIDE) ====================
// ==================== BURNOUT DETECTOR (CHUM OVERRIDE) ====================
function triggerBrainResetPrompt() {
    const chumContainer = document.getElementById('chumChatContainer');
    const messagesDiv = document.getElementById('chumMessages');

    if (!chumContainer || !messagesDiv) return;

    if (!chumContainer.classList.contains('active')) {
        chumContainer.classList.add('active');
        const badge = document.getElementById('chumBadge');
        if (badge) badge.style.display = 'none';
    }

    // Push the formatted message directly into Chum's array memory!
    const resetMsg = `
        <div style="border: 2px solid var(--accent-yellow); background: var(--bg-card); padding: 12px; border-radius: 8px; color: var(--text-main); box-shadow: 0 0 15px rgba(250, 204, 21, 0.1);">
            <strong style="color: var(--accent-yellow);">🎉 Cycle Complete!</strong><br><br>
            You've been focusing hard. I highly recommend taking a quick 2-minute breathing break to clear your mind before the next quest. Up to you, though!
            <button id="chumBrainResetBtn" style="display: block; width: 100%; margin-top: 12px; padding: 10px; background: var(--accent-yellow); color: #000; border: none; border-radius: 8px; font-weight: 900; cursor: pointer; transition: transform 0.2s;">✨ Start Brain Reset</button>
        </div>
    `;

    chumChatHistory.push({ role: "assistant", content: resetMsg });
    sessionStorage.setItem('chumChatHistory', JSON.stringify(chumChatHistory));

    // Safely render the chat array to the screen
    renderChumChat();
}

// ✨ GLOBAL EVENT DELEGATION (Prevents the button from ever breaking)
document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'chumBrainResetBtn') {
        const modal = document.getElementById('brainResetModal');
        if (modal) modal.classList.add('active');
        resetBrainWidget();
    }
});

// ==================== SYSTEM NOTIFICATIONS ====================
function updateSystemNotifications() {
    const notifList = document.getElementById('notifList');
    const notifBadge = document.getElementById('notifBadge');
    if (!notifList || !notifBadge) return;

    let notifs = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysStr = threeDays.toISOString().split('T')[0];

    const activeTasks = tasks.filter(t => !t.completed);

    // Scan 1: Past Due (Click takes you to Garden)
    const overdue = activeTasks.filter(t => t.deadline && t.deadline < todayStr);
    if (overdue.length > 0) {
        notifs.push({
            icon: '🕰️',
            text: `You have <strong>${overdue.length} quest(s)</strong> waiting for you. Let's check the garden.`,
            color: '#fca5a5',
            link: 'crystal-garden.html'
        });
    }

    // Scan 2: Due Today (Click takes you to Garden)
    const dueToday = activeTasks.filter(t => t.deadline === todayStr);
    if (dueToday.length > 0) {
        notifs.push({
            icon: '🌅',
            text: `Good morning! You have <strong>${dueToday.length} quest(s)</strong> on today's agenda.`,
            color: '#fcd34d',
            link: 'crystal-garden.html'
        });
    }

    // Scan 3: Upcoming Quests (Click takes you to Calendar)
    const upcoming = activeTasks.filter(t => t.deadline && t.deadline >= tomorrowStr && t.deadline <= threeDaysStr);
    if (upcoming.length > 0) {
        notifs.push({
            icon: '🌱',
            text: `Looking ahead: <strong>${upcoming.length} upcoming quest(s)</strong>. You've got this!`,
            color: '#6ee7b7',
            link: 'calendar.html'
        });
    }

    // Scan 4: Burnout 
    if (totalSessions >= 4 && totalSessions % 4 === 0) {
        notifs.push({
            icon: '🎧',
            text: `You've done heavy focus. A <strong>Brain Reset</strong> is highly recommended.`,
            color: '#06b6d4',
            link: '#' // Can be wired to open the meditation modal later!
        });
    }

    // Render Logic
    if (notifs.length === 0) {
        notifList.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem; text-align:center; padding: 20px 0;">✨ You are completely caught up!</div>';
        notifBadge.style.display = 'none';
    } else {
        notifBadge.style.display = 'block';
        notifBadge.textContent = notifs.length;
        notifList.innerHTML = notifs.map(n => `
            <div onclick="window.location.href='${n.link}'" style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border-left:3px solid ${n.color}; display:flex; gap:12px; align-items:center; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(0,0,0,0.2)'">
                <span style="font-size: 1.3rem;">${n.icon}</span>
                <span style="font-size:0.9rem; color: #e0f7f0; line-height: 1.4;">${n.text}</span>
            </div>
        `).join('');
    }
}

// ✨ FIX: This makes the bell actually open the menu!
document.getElementById('notificationBell')?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevents the click from immediately closing it again
    const drop = document.getElementById('notifDropdown');
    if (drop) {
        drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
    }
});

// Close the dropdown if you click anywhere else on the screen
window.addEventListener('click', (e) => {
    const drop = document.getElementById('notifDropdown');
    if (drop && drop.style.display === 'block' && !e.target.closest('#notificationBell') && !e.target.closest('#notifDropdown')) {
        drop.style.display = 'none';
    }
});

// ==================== ACCOUNT PAGE LOGIC ====================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Account UI based on Status
    if (document.getElementById('accStatusBadge')) {
        if (isPremiumUser) {
            unlockPremiumFeatures();
        } else {
            document.getElementById('debugPremiumToggle').checked = false;
        }
    }

    // 2. Theme Selection Logic
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const themeId = e.currentTarget.getAttribute('data-theme-id');
            const isLocked = e.currentTarget.classList.contains('premium-locked');

            if (isLocked && !isPremiumUser) {
                showToast("🔒 This theme is for StudyBuddy+ members! Use the mock checkout to unlock.");
                document.getElementById('paymentModal').classList.add('active');
                return;
            }

            // Apply Theme
            currentTheme = themeId;
            localStorage.setItem('appTheme', themeId);
            document.documentElement.setAttribute('data-theme', themeId);

            // Visual highlight of selected button
            document.querySelectorAll('.theme-btn').forEach(b => b.style.borderColor = 'var(--border-color)');
            e.currentTarget.style.borderColor = 'var(--accent-teal)';

            showToast("✨ Theme updated!");
        });
    });

    // 3. Debug Toggle Logic
    document.getElementById('debugPremiumToggle')?.addEventListener('change', (e) => {
        if (e.target.checked) unlockPremiumFeatures();
        else revokePremiumFeatures();
    });

    // 4. Mock Payment Processing
    document.getElementById('processPaymentBtn')?.addEventListener('click', () => {
        document.getElementById('paymentForm').style.display = 'none';
        document.getElementById('paymentLoading').style.display = 'block';

        // Fake 2-second loading delay for realism
        setTimeout(() => {
            document.getElementById('paymentModal').classList.remove('active');
            document.getElementById('paymentForm').style.display = 'block';
            document.getElementById('paymentLoading').style.display = 'none';

            unlockPremiumFeatures();
            showToast("🎉 Payment Successful! Welcome to StudyBuddy+!");

            if (typeof interactWithChum === 'function') {
                interactWithChum(`The user just upgraded to StudyBuddy+ Premium! Welcome them to the club!`, true);
            }
        }, 2000);
    });
});

// ✨ GLOBAL: chumAddTaskBtn — works on dashboard, garden, and calendar
document.getElementById('chumAddTaskBtn')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];

    // Dashboard modal
    const dashModal = document.getElementById('addTaskModal');
    if (dashModal) {
        const dateInput = document.getElementById('taskDateInput');
        if (dateInput) dateInput.value = today;
        document.getElementById('chumChatContainer')?.classList.remove('active');
        dashModal.classList.add('active');
        return;
    }
    // Crystal Garden / Calendar — trigger their summon form/modal
    const summonBtn = document.getElementById('openAddTaskModalBtn') ||
        document.getElementById('addQuestBtn') ||
        document.querySelector('.summon-btn, .add-task-btn');
    if (summonBtn) {
        document.getElementById('chumChatContainer')?.classList.remove('active');
        summonBtn.click();
        return;
    }
    // Final fallback: navigate home
    window.location.href = 'index.html';
});

// ✨ Warn the user if they try to switch pages while Chum is generating!
window.addEventListener('beforeunload', function (e) {
    if (isChumTyping) {
        // Modern browsers will show a generic "Changes you made may not be saved" dialog
        e.preventDefault();
        e.returnValue = '';
    }
});

window.checkAIAvailability = async function () {
    // 1. Check Cloud Tier (Requires internet + API key)
    const hasCloudKey = AI_CONFIG.GEMINI_API_KEY || AI_CONFIG.GROQ_API_KEY || AI_CONFIG.OPENROUTER_API_KEY;
    if (navigator.onLine && hasCloudKey && hasCloudKey !== "YOUR_GEMINI_API_KEY_HERE") {
        return true;
    }

    // 2. Check Local Tier (Ping Ollama's tags endpoint fast)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s fast fail
        const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) return true;
    } catch (e) {
        return false; // Both offline and Ollama is unreachable
    }

    return false;
};