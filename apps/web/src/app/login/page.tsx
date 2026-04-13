"use client";

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStudyStore } from '@/store/useStudyStore';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const resetStore = useStudyStore((state) => state.reset);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [message, setMessage] = useState<{ text: string; show: boolean }>({ text: '', show: false });
    const [loading, setLoading] = useState<boolean>(false);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);

    const triggerChumToast = (text: string, type: 'success' | 'warning') => {
        setMessage({ text, show: true });
        // Auto-hide after 3 seconds
        setTimeout(() => setMessage({ text: '', show: false }), 3000);
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setMessage({ text: "Invalid email or password.", show: true });
            setLoading(false);
        } else {
            resetStore();
            router.push("/dashboard");
        }
    };

    const handleForgotPassword = async (emailInput: string) => {
        if (!emailInput) {
            return triggerChumToast("Email coordinate required for relay.", "warning");
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-secure-otp', {
                body: {
                    userEmail: emailInput,
                    action: 'reset_password'
                }
            });

            if (error || !data?.success) {
                throw new Error(data?.error || "Relay transmission failed.");
            }

            triggerChumToast("Recovery link dispatched to your coordinates.", "success");
        } catch (err: any) {
            triggerChumToast(err.message, "warning");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="full-page-container">
            <main className="login-section">
                <div className="form-wrapper">
                    <h1>Welcome back!</h1>
                    <p className="subtitle">Simplify your workflow with <strong>StudyBuddy</strong>.</p>

                    {message.show && <div className="messageDiv">{message.text}</div>}

                    <form onSubmit={handleLogin}>
                        <input
                            type="email"
                            placeholder="Email"
                            className="input-field"
                            required
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        {/* Password with visibility toggle */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                className="input-field pr-12"
                                required
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleForgotPassword(email)} // Changed from formData.email to email
                            className="text-[9px] font-black uppercase tracking-widest text-(--accent-teal) hover:underline"
                        >
                            Lost your key? Dispatch recovery relay
                        </button>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>

                    <div className="divider">or continue with</div>
                    <div className="social-icons">
                        <div className="icon-circle">G</div>
                        <div className="icon-circle">A</div>
                        <div className="icon-circle">F</div>
                    </div>

                    <p className="footer-text">
                        Not a member? <Link href="/register" style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: '600' }}>
                            Register now
                        </Link>
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
                    <h2>Make your work easier with <strong>StudyBuddy</strong></h2>
                </div>
            </section>
        </div>
    );
}
