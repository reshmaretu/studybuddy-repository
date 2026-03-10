import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@huggingface/transformers';

export async function POST(req: Request) {
    try {
        const { messages, user_id } = await req.json();
        const geminiKey = process.env.GEMINI_AI_API_KEY;

        // 1. Catch the VIP Pass sent from the frontend
        const authHeader = req.headers.get('Authorization');

        // 2. Create a secure client that acts exactly like you
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader || '' } } }
        );

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user_id)
            .single();

        const isPremium = profile?.is_premium === true;

        // 2. Check if they are trying to access a Pro feature (like Tutor Mode)
        const isTutorRequest = messages.some((m: any) => m.content.includes("You are Chum, a cozy lo-fi tutor AI"));

        if (isTutorRequest && !isPremium) {
            // Drop the hammer! Block the request completely.
            return NextResponse.json(
                { error: "Premium subscription required to access the Pro Tutor." },
                { status: 403 }
            );
        }

        // ==========================================
        // STEP 1: RAG (Retrieval-Augmented Generation)
        // ==========================================
        let contextSnippet = "";

        if (user_id) {
            try {
                const latestUserMessage = messages[messages.length - 1].content;

                // ==========================================
                // 🔄 STEP 1: SWITCH TO LOCAL EMBEDDINGS (384)
                // ==========================================
                const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                    dtype: 'q8', // Fast math for 2026 CPUs
                    device: 'cpu'
                });

                const output = await embedder(latestUserMessage, { pooling: 'mean', normalize: true });
                const query_embedding = Array.from(output.data); // 👈 Now 384 dimensions!

                // Search the DB using the correctly shaped vector
                const { data: matchedShards, error } = await supabase.rpc('match_shards', {
                    query_embedding,
                    match_threshold: 0.5,
                    match_count: 3,
                    p_user_id: user_id
                });

                if (!error && matchedShards && matchedShards.length > 0) {
                    contextSnippet = "\n\n--- RELEVANT NOTES FROM USER'S DATABASE ---\n";
                    contextSnippet += matchedShards.map((s: any) => `Title: ${s.title}\nContent: ${s.content}`).join('\n\n');
                    contextSnippet += "\n-------------------------------------------\n";
                }
            } catch (e) {
                console.warn("RAG failed, proceeding without context.", e);
            }
        }

        // ==========================================
        // STEP 2: Inject Context into the System Prompt
        // ==========================================
        const formattedMessages = messages.map((m: any) => {
            if (m.role === 'system' && contextSnippet) {
                return { ...m, content: m.content + contextSnippet };
            }
            return m;
        });

        // ==========================================
        // STEP 3: The 2026 Cloud Waterfall
        // ==========================================

        // 1. PRIMARY: OpenRouter (Gemma 2 9B)
        // Gemma 2 is excellent at roleplay and strict instruction following.
        try {
            const orKey = process.env.OPENROUTER_AI_API_KEY;
            if (orKey) {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${orKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://studybuddy-v2.vercel.app",
                        "X-Title": "StudyBuddy"
                    },
                    body: JSON.stringify({
                        model: "google/gemma-2-9b-it:free",
                        messages: formattedMessages
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    return NextResponse.json({
                        response: data.choices[0].message.content,
                        node: "OpenRouter (Gemma)"
                    });
                }
            }
        } catch (e: any) { console.warn("OpenRouter failed:", e.message); }

        // 2. SECONDARY: Groq (Llama 3.3 70B)
        // Llama 3.3 is the 2026 standard for high-speed, high-intelligence chat.
        try {
            const groqKey = process.env.GROQ_AI_API_KEY;
            if (groqKey) {
                const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: formattedMessages
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    return NextResponse.json({
                        response: data.choices[0].message.content,
                        node: "Groq (Llama 3.3)"
                    });
                }
            }
        } catch (e: any) { console.warn("Groq failed:", e.message); }

        // 3. TERTIARY: Gemini (2.0 Flash) - THE 2026 STABLE BUILD
        // We use 2.0-flash here to avoid the 404/429 errors from the retired 2.5 build.
        try {
            const geminiKey = process.env.GEMINI_AI_API_KEY;
            if (geminiKey) {
                const systemMessage = formattedMessages.find((m: any) => m.role === 'system')?.content || "";

                const geminiMessages = formattedMessages
                    .filter((m: any) => m.role !== 'system')
                    .map((m: any) => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.content }]
                    }));

                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: systemMessage }] },
                        contents: geminiMessages
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    return NextResponse.json({
                        response: data.candidates[0].content.parts[0].text,
                        node: "Gemini 2.0"
                    });
                } else {
                    const errorData = await res.json();
                    console.error("Gemini API Error:", errorData);
                }
            }
        } catch (e: any) { console.warn("Gemini failed:", e.message); }

        throw new Error("Critical: All AI nodes are currently unreachable.");

    } catch (error: any) {
        console.error("Chat Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}