"use client";
import React, { useState, FormEvent } from 'react';
import PasswordValidator from '@/components/PasswordValidator';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fName: '',
        lName: '',
        displayName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ text: '', show: false, type: '' });
    const [loading, setLoading] = useState(false);

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setMessage({ text: "Passwords do not match!", show: true, type: 'error' });
            return;
        }
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.fName,
                    last_name: formData.lName,
                    display_name: formData.displayName,
                    full_name: `${formData.fName} ${formData.lName}`
                }
            }
        });
        if (error) {
            setMessage({ text: error.message, show: true, type: 'error' });
        } else {
            setMessage({ text: "Success! Redirecting to login...", show: true, type: 'success' });
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        }
        setLoading(false);
    };
    return (
        <div className="full-page-container flex h-screen bg-[#05080c] text-white">
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h1 className="text-3xl font-black">Create Account</h1>
                        <p className="text-white/50 text-sm mt-2">Join <strong>StudyBuddy</strong> today and start organizing your workflow for free.</p>
                    </div>
                    {message.show && (
                        <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-[#84ccb9]/10 text-[#84ccb9]' : 'bg-red-500/10 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="First Name"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, fName: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, lName: e.target.value })}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Display Name (Optional)"
                            className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />

                        {/* Password with visibility toggle */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 pr-12 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                            />
                            <PasswordValidator password={formData.password} isVisible={isPasswordFocused} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Confirm Password with visibility toggle */}
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 pr-12 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#84ccb9] text-black rounded-xl font-black mt-4 hover:scale-[1.02] transition-transform disabled:opacity-50">
                            {loading ? "Creating Account..." : "Sign Up"}
                        </button>
                    </form>
                    <p className="text-center text-sm text-white/40">
                        Already a member? <Link href="/login" className="text-[#84ccb9] font-bold">Login here</Link>
                    </p>
                </div>
            </main>
            <section className="promo-section">
                <div className="promo-inner">
                    <Image
                        src="/your-illustration.png"
                        alt="Illustration"
                        className="hero-img"
                        width={400}
                        height={400}
                        priority
                    />
                    <h2>The smartest way to manage your studies.</h2>
                </div>
            </section>
        </div>
    );
}