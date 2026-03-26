import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Essential for LlamaParse wait times

export async function POST(req: Request) {
    try {
        const { title, content, files, user_id } = await req.json();

        // 🔥 BACKEND SECURITY: Verify the user via Bearer token
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) return NextResponse.json({ error: "Missing Neural Key." }, { status: 401 });

        const supabaseAnon = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

        if (authError || !user || user.id !== user_id) {
            return NextResponse.json({ error: "Neural Ident Mismatch." }, { status: 403 });
        }

        const llamaKey = process.env.LLAMA_CLOUD_API_KEY;
        const geminiKey = process.env.GEMINI_AI_API_KEY;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // 👈 Service Role for admin writes
        );

        let finalContent = content || "";
        let finalTitle = title || "Untitled Shard";

        // ==========================================
        // 1. LLAMAPARSE: Document Extraction
        // ==========================================
        if (files && files.length > 0 && files[0].content) {
            const base64Data = files[0].content.split(',')[1];
            const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: files[0].type });

            const formData = new FormData();
            formData.append('file', blob, files[0].name);

            // Upload
            const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${llamaKey}` },
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                throw new Error(`LlamaParse Upload Failed: ${err}`);
            }

            const { id: jobId } = await uploadRes.json();

            // Poll for result (Max 30 seconds)
            let markdownText = "";
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const res = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
                    headers: { "Authorization": `Bearer ${llamaKey}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    markdownText = data.markdown;
                    break;
                }
            }

            if (markdownText) {
                const separator = finalContent ? "\n\n--- DOCUMENT CONTENT ---\n\n" : "";
                finalContent = finalContent + separator + markdownText;
                if (!title) finalTitle = files[0].name;
            }
        }

        // ==========================================
        // 2. GEMINI EMBEDDINGS (2026 Standard)
        // ==========================================

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey!);

        // 👇 The new, live 2026 model
        const embeddingModel = genAI.getGenerativeModel({
            model: "gemini-embedding-001"
        });

        // 👇 Simple string bypasses strict TypeScript errors
        const result = await embeddingModel.embedContent(finalContent);
        // ⚠️ NOTE: In api/chat/route.ts, use 'latestUserMessage' instead of 'finalContent'

        const embedding = result.embedding.values;

        // ==========================================
        // 3. SUPABASE: Save
        // ==========================================
        const { data: shard, error: shardError } = await supabase
            .from('shards')
            .insert([{ user_id, title: finalTitle, content: finalContent }])
            .select().single();

        if (shardError) throw shardError;

        await supabase.from('shard_embeddings').insert([{ shard_id: shard.id, embedding }]);

        return NextResponse.json({ success: true, shard });

    } catch (error: any) {
        console.error("Forge Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}