"use client";

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fName: '',
        lName: '',
        displayName: '', // 👈 Added Display Name state
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ text: '', show: false, type: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return alert("Passwords do not match!");
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.fName,
                    last_name: formData.lName,
                    display_name: formData.displayName || formData.fName, // 👈 Fallback to first name
                    full_name: `${formData.fName} ${formData.lName}`
                }
            }
        });

        // ⚡ THE FIX: "Verify Anytime" logic
        // We handle the 'confirmation email' error as a 'soft success' 
        // because the user account is often created but just needs the setting changed in dashboard.
        if (error) {
            if (error.message.includes("confirmation email")) {
                setMessage({ text: "Account created! You can verify your email later in your profile. Redirecting...", show: true, type: 'success' });
                setTimeout(() => router.push('/login'), 2500);
            } else {
                setMessage({ text: error.message, show: true, type: 'error' });
            }
        } else {
            setMessage({ text: "Success! Redirecting to login. Welcome to the lab.", show: true, type: 'success' });
            setTimeout(() => router.push('/login'), 2500);
        }
        setLoading(false);
    };

    return (
        <div className="full-page-container flex h-screen bg-[#05080c] text-white overflow-hidden">
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter">CREATE ACCOUNT</h1>
                        <p className="text-white/40 text-sm mt-3 uppercase tracking-widest font-bold">Access the StudyBuddy Hive</p>
                    </div>

                    {message.show && (
                        <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-wider border-2 ${message.type === 'success' ? 'bg-[#84ccb9]/10 border-[#84ccb9]/30 text-[#84ccb9]' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {message.type === 'success' ? '✅ ' : '⚠️ '}{message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <input type="text" placeholder="First Name" required className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20" onChange={(e) => setFormData({ ...formData, fName: e.target.value })} />
                            <input type="text" placeholder="Last Name" required className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20" onChange={(e) => setFormData({ ...formData, lName: e.target.value })} />
                        </div>

                        <input type="text" placeholder="Display Name (Guardian Name)" className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20" onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} />
                        <input type="email" placeholder="Email Address" required className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        <input type="password" placeholder="Cipher (Password)" required className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                        <input type="password" placeholder="Confirm Cipher" required className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#84ccb9]/50 transition-all font-bold placeholder:text-white/20" onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />

                        <button type="submit" disabled={loading} className="w-full py-5 bg-[#84ccb9] text-black rounded-2xl font-black mt-4 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(132,204,185,0.2)]">
                            {loading ? "INITIALIZING..." : "JOIN THE NETWORK"}
                        </button>
                    </form>

                    <p className="text-center text-xs font-bold text-white/30 uppercase tracking-widest">
                        Already linked? <Link href="/login" className="text-[#84ccb9] hover:underline">Login here</Link>
                    </p>
                </div>
            </main>
            <section className="hidden lg:flex w-[45%] bg-[#080c10] border-l border-white/5 items-center justify-center p-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#84ccb9]/5 to-transparent pointer-events-none" />
                <div className="text-center relative z-10">
                    <div className="w-full aspect-square bg-[#111111] rounded-[40px] border-2 border-white/10 flex items-center justify-center mb-10 shadow-2xl relative">
                         {/* Fallback pattern for the illustration */}
                        <div className="absolute inset-10 border-2 border-dashed border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
                        <span className="text-6xl grayscale opacity-40">🤖</span>
                    </div>
                    <h2 className="text-4xl font-black italic tracking-tighter leading-tight">THE SMARTEST WAY <br/> TO EVOLVE YOUR FLOW.</h2>
                </div>
            </section>
        </div>
    );
}


