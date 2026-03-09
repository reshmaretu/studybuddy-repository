"use client"; // Required in Next.js for components that use hooks or handle user interaction

import { useState, FormEvent } from 'react';
import Image from 'next/image'; // Next.js optimized image component
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
    const router = useRouter();
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
            setMessage({ text: "Invalid email or password.", show: true });
            setLoading(false);
        } else {
            // Note: In Next.js, you might want to use the useRouter hook from 'next/navigation' 
            // instead of window.location.href for faster, client-side routing.
            router.push("/dashboard");
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
                        <input
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            required
                            onChange={(e) => setPassword(e.target.value)}
                        />
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
                    {/* 4. Use Next.js Image for automatic optimization */}
                    <Image
                        src="/your-illustration.png"
                        alt="Illustration"
                        className="hero-img"
                        width={400}
                        height={400}
                        priority // Add priority since this image is visible immediately on load
                    />
                    <h2>Make your work easier with <strong>StudyBuddy</strong></h2>
                </div>
            </section>
        </div>
    );
}