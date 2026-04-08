import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages, user_id, openrouter_key, groq_key, gemini_key } = await req.json();

        // 🗝️ Centralized Key Logic
        const orKey = (openrouter_key?.trim() || process.env.OPENROUTER_AI_API_KEY)?.trim();
        const groqKey = (groq_key?.trim() || process.env.GROQ_AI_API_KEY)?.trim();
        const geminiKey = (gemini_key?.trim() || process.env.GEMINI_AI_API_KEY)?.trim();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Premium & Profile Check
        const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user_id).single();
        const isPremium = profile?.is_premium === true;
        const isTutorRequest = messages.some((m: any) => m.content.includes("You are Chum, a cozy lo-fi tutor AI"));

        if (isTutorRequest && !isPremium) {
            return NextResponse.json({ error: "Premium subscription required to access the Pro Tutor." }, { status: 403 });
        }

        // ==========================================
        // STEP 1: CLOUD RAG SEARCH (768-dim)
        // ==========================================
        let contextSnippet = "";

        if (user_id && geminiKey) {
            try {
                const latestUserMessage = messages[messages.length - 1].content;
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(geminiKey);

                const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
                const result = await embeddingModel.embedContent(latestUserMessage);
                const query_embedding = result.embedding.values;

                const { data: matchedShards, error } = await supabase.rpc('match_shards', {
                    query_embedding, match_threshold: 0.4, match_count: 3, p_user_id: user_id
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
            if (m.role === 'system' && contextSnippet) return { ...m, content: m.content + contextSnippet };
            return m;
        });

        // ==========================================
        // STEP 2: THE STREAMING WATERFALL
        // ==========================================
        let streamResult;
        let usedNode = "";

        // 🌊 PRIMARY: OpenRouter (Using Native Provider)
        if (!streamResult && orKey) {
            try {
                const openrouter = createOpenRouter({ 
                    apiKey: orKey,
                    headers: {
                        "HTTP-Referer": "https://studybuddy-v2.vercel.app",
                        "X-Title": "StudyBuddy",
                    }
                });

                streamResult = await streamText({
                    model: openrouter("meta-llama/llama-3.2-3b-instruct:free"),
                    messages: formattedMessages
                });
                usedNode = "OpenRouter (Llama 3.2)";
            } catch (e: any) {
                console.warn(`OpenRouter failed: ${e.message}. Falling back to Groq...`);
            }
        }

        // 🌊 SECONDARY: Groq (Using Native Provider)
        if (!streamResult && groqKey) {
            try {
                const groq = createGroq({ apiKey: groqKey });

                streamResult = await streamText({
                    model: groq("llama-3.3-70b-versatile"),
                    messages: formattedMessages
                });
                usedNode = "Groq (Llama 3.3)";
            } catch (e: any) {
                console.warn(`Groq failed: ${e.message}. Falling back to Gemini...`);
            }
        }

        // 🌊 TERTIARY: Gemini (Using Native Provider)
        if (!streamResult && geminiKey) {
            try {
                const google = createGoogleGenerativeAI({ apiKey: geminiKey });

                streamResult = await streamText({
                    model: google('gemini-2.0-flash'),
                    messages: formattedMessages
                });
                usedNode = "Gemini 2.0";
            } catch (e: any) {
                console.warn(`Gemini failed: ${e.message}.`);
            }
        }

        if (!streamResult) {
            throw new Error("All Cloud AI nodes failed or keys are missing. Check Settings.");
        }

        // Send the stream back to ChumWidget
        return streamResult.toTextStreamResponse({
            headers: { 'X-Node-Used': usedNode }
        });

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