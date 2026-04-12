import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, user_id, openrouter_key, groq_key, gemini_key, selected_model, stream } = body;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 🗝️ Centralized Key Logic
        const orKey = (openrouter_key?.trim() || process.env.OPENROUTER_AI_API_KEY)?.trim();
        const groqKey = (groq_key?.trim() || process.env.GROQ_AI_API_KEY)?.trim();
        const geminiKey = (gemini_key?.trim() || process.env.GEMINI_AI_API_KEY)?.trim();

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
        // STEP 2: THE WATERFALL ENGINE (OR MANUAL)
        // ==========================================
        // ==========================================
        // STEP 2: DYNAMIC WATERFALL ENGINE
        // ==========================================
        let result = null;
        let usedNode = "";
        const shouldStream = stream !== false;
        const primaryNode = body.primary_node || 'openrouter';

        // Define the attempts in order: Primary first, then others.
        const order = [primaryNode];
        if (!order.includes('openrouter')) order.push('openrouter');
        if (!order.includes('groq')) order.push('groq');
        if (!order.includes('gemini')) order.push('gemini');

        for (const node of order) {
            if (result) break;

            try {
                if (node === 'openrouter' && orKey) {
                    const modelToUse = (primaryNode === 'openrouter' && selected_model) ? selected_model : "meta-llama/llama-3.1-8b-instruct:free";
                    const openrouter = createOpenRouter({ 
                        apiKey: orKey,
                        headers: { "HTTP-Referer": "https://studybuddy-v2.vercel.app", "X-Title": "StudyBuddy" }
                    });
                    const config = { model: openrouter(modelToUse), messages: formattedMessages, maxTokens: 600, temperature: 0.7 };
                    
                    if (shouldStream) result = await streamText(config);
                    else { const res = await generateText(config); result = res.text; }
                    usedNode = `OpenRouter: ${modelToUse}`;
                } 
                else if (node === 'groq' && groqKey) {
                    const modelToUse = (primaryNode === 'groq' && selected_model) ? selected_model : "llama-3.3-70b-versatile";
                    const groq = createGroq({ apiKey: groqKey });
                    const config = { model: groq(modelToUse), messages: formattedMessages };
                    
                    if (shouldStream) result = await streamText(config);
                    else { const res = await generateText(config); result = res.text; }
                    usedNode = `Groq: ${modelToUse}`;
                }
                else if (node === 'gemini' && geminiKey) {
                    const modelToUse = (primaryNode === 'gemini' && selected_model) ? selected_model : "gemini-1.5-flash";
                    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
                    const config = { model: google(modelToUse), messages: formattedMessages };
                    
                    if (shouldStream) result = await streamText(config);
                    else { const res = await generateText(config); result = res.text; }
                    usedNode = `Gemini: ${modelToUse}`;
                }
            } catch (e: any) {
                console.warn(`${node} failed in waterfall: ${e.message}`);
            }
        }

        if (!result) {
            throw new Error("All Cloud AI nodes failed or keys are missing. Check Settings.");
        }

        if (result && shouldStream) {
            return (result as any).toTextStreamResponse({
                headers: { 'X-Node-Used': usedNode }
            });
        } else if (result) {
            return NextResponse.json({ response: result }, { headers: { 'X-Node-Used': usedNode } });
        }

        return NextResponse.json({ response: result, node: usedNode });

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