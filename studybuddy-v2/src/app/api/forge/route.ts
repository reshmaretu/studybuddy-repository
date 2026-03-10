import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Essential for long document processing

export async function POST(req: Request) {
    try {
        const { title, content, files, user_id } = await req.json();
        const authHeader = req.headers.get('Authorization');
        const geminiKey = process.env.GEMINI_AI_API_KEY;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader || '' } } }
        );

        let finalContent = content || "";
        let finalTitle = title || "Untitled Shard";

        // ==========================================
        // 1. GEMINI PARSE: Replaces LlamaParse
        // ==========================================
        if (files && files.length > 0 && files[0].content) {
            const base64Data = files[0].content.split(',')[1];
            const mimeType = files[0].type || "application/pdf";

            const parseRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: mimeType, data: base64Data } },
                            { text: "Extract all text and data from this document. Format it cleanly in Markdown. Do not add any conversational filler." }
                        ]
                    }]
                })
            });

            if (!parseRes.ok) {
                const errorData = await parseRes.json();
                throw new Error(`Gemini Parse Failed: ${errorData.error?.message}`);
            }

            const parseData = await parseRes.json();
            const extractedText = parseData.candidates[0].content.parts[0].text;

            if (extractedText) {
                const separator = finalContent ? "\n\n--- DOCUMENT CONTENT ---\n\n" : "";
                finalContent = finalContent + separator + extractedText;
                if (!title) finalTitle = files[0].name;
            }
        }

        if (finalContent.trim() === "") finalContent = "Empty note";

        // ==========================================
        // 2. GEMINI EMBEDDINGS (768-dim): Replaces Xenova
        // ==========================================
        const embedRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/text-embedding-004",
                content: { parts: [{ text: finalContent }] }
            })
        });

        const embedData = await embedRes.json();
        if (!embedRes.ok) throw new Error(`Embedding Failed: ${embedData.error?.message}`);

        const embedding = embedData.embedding.values;

        // ==========================================
        // 3. SUPABASE: Save Shard & Vector
        // ==========================================
        const { data: shard, error: shardError } = await supabase
            .from('shards')
            .insert([{ user_id, title: finalTitle, content: finalContent }])
            .select()
            .single();

        if (shardError) throw shardError;

        const { error: vectorError } = await supabase
            .from('shard_embeddings')
            .insert([{ shard_id: shard.id, embedding }]);

        if (vectorError) throw vectorError;

        return NextResponse.json({ success: true, shard });

    } catch (error: any) {
        console.error("Forge Error:", error.message);
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

export async function GET() {
    return NextResponse.json({
        status: "success",
        message: "The Forge API is alive and serverless-friendly!"
    });
}