import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages, user_id, openrouter_key, gemini_key } = await req.json();
        const geminiKey = gemini_key || process.env.GEMINI_AI_API_KEY;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
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

                // 1. Dynamic Import SDK (Notice TaskType is gone!)
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(geminiKey!);

                // 2. THE MAGIC COMBO: 'embedding-001' on 'v1'
                const embeddingModel = genAI.getGenerativeModel({
                    model: "gemini-embedding-001"
                });

                // 3. Generate Embedding (Simple string bypasses TypeScript errors)
                const result = await embeddingModel.embedContent(latestUserMessage); // 👈 Much simpler!
                const query_embedding = result.embedding.values;

                // 4. Search Supabase with the vector
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
            const orKey = openrouter_key || process.env.OPENROUTER_AI_API_KEY;
            if (orKey) {
                // We'll try Llama 3.1 8B first as it's often more reliable on the free tier than Gemma
                const models = ["meta-llama/llama-3.1-8b-instruct:free", "google/gemma-2-9b-it:free"];
                
                for (const model of models) {
                    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${orKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://studybuddy-v2.vercel.app",
                            "X-Title": "StudyBuddy"
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: formattedMessages
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        return NextResponse.json({
                            response: data.choices[0].message.content,
                            node: `OpenRouter (${model.split('/')[1].split(':')[0]})`
                        });
                    } else {
                        const errorData = await res.json().catch(() => ({}));
                        console.warn(`OpenRouter model ${model} failed:`, errorData);
                    }
                }
            }
        } catch (e: any) { console.warn("OpenRouter critical failure:", e.message); }

        // 2. SECONDARY: Groq
        try {
            const groqKey = openrouter_key || process.env.GROQ_AI_API_KEY;
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
                } else {
                    const err = await res.json().catch(() => ({}));
                    console.warn("Groq API error:", err);
                }
            } else {
                console.warn("Groq skipped: No API key provided.");
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