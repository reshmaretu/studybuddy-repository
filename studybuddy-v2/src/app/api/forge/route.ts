import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@huggingface/transformers';
export const maxDuration = 60;
export async function POST(req: Request) {
    try {
        const { title, content, files, user_id } = await req.json();
        const authHeader = req.headers.get('Authorization');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader || '' } } }
        );

        let finalContent = content || "";
        let finalTitle = title || "Untitled Shard";

        // ==========================================
        // 1. LLAMAPARSE: High-Accuracy PDF Extraction
        // ==========================================
        if (files && files.length > 0 && files[0].content) {
            // Convert Base64 to a Blob for LlamaParse
            const base64Data = files[0].content.split(',')[1];
            const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: files[0].type });

            const formData = new FormData();
            formData.append('file', blob, files[0].name);

            // Upload to LlamaParse
            const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
                body: formData
            });

            if (!uploadRes.ok) throw new Error("LlamaParse upload failed");
            const { id: jobId } = await uploadRes.json();

            // Simple Poll for Results (In production, use a more robust retry loop)
            let markdownText = "";
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 2000)); // Wait 2s per poll
                const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
                    headers: { "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` }
                });
                if (resultRes.ok) {
                    const jsonResponse = await resultRes.json(); // 👈 Parse as JSON first
                    markdownText = jsonResponse.markdown;        // 👈 Extract ONLY the markdown string

                    // Clean up those extra \n\n characters
                    markdownText = markdownText.replace(/\\n/g, '\n').trim();
                    break;
                }
            }

            if (markdownText) {
                // Only add a separator if there was already existing manual content
                const separator = finalContent ? "\n\n--- DOCUMENT CONTENT ---\n\n" : "";
                finalContent = finalContent + separator + markdownText;

                if (!title) finalTitle = files[0].name;
            }
        }

        if (finalContent.trim() === "") finalContent = "Empty note";

        // ==========================================
        // 2. LOCAL EMBEDDINGS: Free & Private
        // ==========================================
        // This runs a tiny model on your server/Vercel instance
        // ✅ Optimized for 2026 CPU performance
        const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            // ⚡ Forced quantization (q8) makes it 4x faster and clears the 'dtype' warning
            dtype: 'q8',
            device: 'cpu'
        });

        const output = await embedder(finalContent, {
            pooling: 'mean',
            normalize: true
        });

        // Extract the raw array from the Tensor
        const embedding = Array.from(output.data);
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
        message: "The Forge API is alive on Vercel!"
    });
}