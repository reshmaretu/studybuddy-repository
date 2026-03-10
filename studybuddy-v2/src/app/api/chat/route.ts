import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages, user_id } = await req.json();
        const geminiKey = process.env.GEMINI_AI_API_KEY;
        const authHeader = req.headers.get('Authorization');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader || '' } } }
        );

        // 1. Premium & Profile Check
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user_id)
            .single();

        const isPremium = profile?.is_premium === true;
        const isTutorRequest = messages.some((m: any) => m.content.includes("You are Chum, a cozy lo-fi tutor AI"));

        if (isTutorRequest && !isPremium) {
            return NextResponse.json(
                { error: "Premium subscription required to access the Pro Tutor." },
                { status: 403 }
            );
        }

        // ==========================================
        // STEP 1: CLOUD RAG SEARCH (768-dim)
        // ==========================================
        let contextSnippet = "";

        if (user_id) {
            try {
                const latestUserMessage = messages[messages.length - 1].content;

                // 👇 1. DYNAMIC IMPORT OF SDK
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(geminiKey!);

                // 👇 2. GENERATE EMBEDDING
                // Using 'text-embedding-004' ensures 768 dimensions
                const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
                const result = await model.embedContent(latestUserMessage);
                const query_embedding = result.embedding.values;

                // 3. Search Supabase with the vector
                const { data: matchedShards, error } = await supabase.rpc('match_shards', {
                    query_embedding,
                    match_threshold: 0.4,
                    match_count: 3,
                    p_user_id: user_id
                });

                if (!error && matchedShards && matchedShards.length > 0) {
                    contextSnippet = "\n\n--- RELEVANT NOTES FROM USER'S DATABASE ---\n";
                    contextSnippet += matchedShards.map((s: any) => `Title: ${s.title}\nContent: ${s.content}`).join('\n\n');
                    contextSnippet += "\n-------------------------------------------\n";
                }
            } catch (e: any) {
                console.warn("RAG failed, proceeding without context.", e.message);
            }
        }

        const formattedMessages = messages.map((m: any) => {
            if (m.role === 'system' && contextSnippet) {
                return { ...m, content: m.content + contextSnippet };
            }
            return m;
        });

        // ==========================================
        // STEP 2: The LLM Waterfall
        // ==========================================

        // 1. PRIMARY: OpenRouter
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

        // 2. SECONDARY: Groq
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

        // 3. TERTIARY: Gemini 2.0 Flash
        try {
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
                }
            }
        } catch (e: any) { console.warn("Gemini failed:", e.message); }

        throw new Error("Critical: All AI nodes are currently unreachable.");

    } catch (error: any) {
        console.error("Chat API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function GET() {
    return NextResponse.json({ status: "success", message: "The Chat API is 768-dim ready!" });
}