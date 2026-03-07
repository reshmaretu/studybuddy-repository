import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages, aiTier } = await req.json();

        // Securely pull the keys from your .env.local file
        // (Make sure your .env variables exactly match these names, e.g., GROQ_API_KEY)
        const groqKey = process.env.GROQ_API_KEY;

        if (aiTier === 'cloud') {
            if (!groqKey) {
                return NextResponse.json({ error: "Server missing Groq API Key" }, { status: 500 });
            }

            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192", // Or whichever Groq model you prefer
                    messages: messages
                })
            });

            if (!res.ok) throw new Error("Cloud API rejected the request.");

            const data = await res.json();
            return NextResponse.json({ response: data.choices[0].message.content });
        }

        return NextResponse.json({ error: "Invalid AI Tier" }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}