"use client"; // Required in Next.js for components that use hooks or handle user interaction

import { useState, FormEvent } from 'react';
import Image from 'next/image'; // Next.js optimized image component
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStudyStore } from '@/store/useStudyStore';

export default function Login() {
    const router = useRouter();
    const resetStore = useStudyStore((state) => state.reset);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [message, setMessage] = useState<{ text: string; show: boolean }>({ text: '', show: false });
    const [loading, setLoading] = useState<boolean>(false);

    // 3. Type the event parameter as a FormEvent
    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // Check if account exists but isn't confirmed (if they didn't toggle the dashboard setting)
            if (error.message.includes("Email not confirmed")) {
                setMessage({ text: "Check your email inbox or verify later in your profile.", show: true });
            } else {
                setMessage({ text: "Invalid credentials. Try again.", show: true });
            }
            setLoading(false);
        } else {
            // 🔒 SECURITY: Wipe previous session state before entering the sanctuary
            resetStore();
            router.push("/dashboard");
        }
    };

    return (
        <div className="full-page-container flex h-screen bg-[#05080c] text-white overflow-hidden">
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-black italic tracking-tighter">WELCOME BACK</h1>
                        <p className="text-white/40 text-sm mt-3 uppercase tracking-widest font-bold font-mono">Resyncing Neural Link...</p>
                    </div>

                    {message.show && (
                        <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-wider border-2 bg-red-500/10 border-red-500/30 text-red-400`}>
                             ⚠️ {message.text}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20"
                            required
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Cipher (Password)"
                            className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20"
                            required
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="submit" className="w-full py-5 bg-[#84ccb9] text-black rounded-2xl font-black mt-4 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(132,204,185,0.2)]" disabled={loading}>
                            {loading ? "AUTHENTICATING..." : "ENTER THE LAB"}
                        </button>
                    </form>

                    <p className="text-center text-xs font-bold text-white/30 uppercase tracking-widest">
                        Not a member? <Link href="/register" className="text-[#84ccb9] hover:underline">
                            Register now
                        </Link>
                    </p>
                </div>
            </main>

            <section className="hidden lg:flex w-[45%] bg-[#0b1211] border-l border-white/5 items-center justify-center p-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-[#84ccb9]/5 to-transparent pointer-events-none" />
                <div className="text-center relative z-10">
                    <div className="w-full aspect-square bg-[#111111] rounded-[40px] border-2 border-white/10 flex items-center justify-center mb-10 shadow-2xl relative">
                        {/* Fallback pattern for the illustration */}
                        <div className="absolute inset-10 border-2 border-dashed border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
                        <span className="text-6xl grayscale opacity-40">🔐</span>
                    </div>
                    <h2 className="text-4xl font-black italic tracking-tighter leading-tight">THE SMARTEST WAY <br/> TO EVOLVE YOUR FLOW.</h2>
                </div>
            </section>
        </div>
    );
}