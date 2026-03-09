"use client"; // Required for components using hooks and user interactions

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Register() {
    // 2. Add TypeScript types to your state
    const [formData, setFormData] = useState({
        fName: '',
        lName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState<{ text: string; show: boolean; type: string }>({
        text: '',
        show: false,
        type: ''
    });
    const [loading, setLoading] = useState<boolean>(false);

    // 3. Type the event parameter as a FormEvent
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return alert("Passwords do not match!");
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.fName,
                    last_name: formData.lName
                }
            }
        });

        if (error) {
            setMessage({ text: error.message, show: true, type: 'error' });
        } else {
            setMessage({ text: "Success! Check your email.", show: true, type: 'success' });
        }
        setLoading(false);
    };

    return (
        <div className="full-page-container">
            <main className="login-section">
                <div className="form-wrapper">
                    <h1>Create Account</h1>
                    <p className="subtitle">Join <strong>StudyBuddy</strong> today and start organizing your workflow for free.</p>

                    {message.show && (
                        <div className="messageDiv" style={{ color: message.type === 'success' ? '#14b8a6' : '#f87171' }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="First Name"
                            className="input-field"
                            required
                            onChange={(e) => setFormData({ ...formData, fName: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            className="input-field"
                            required
                            onChange={(e) => setFormData({ ...formData, lName: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="input-field"
                            required
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            required
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            className="input-field"
                            required
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? "Creating Account..." : "Sign Up"}
                        </button>
                    </form>

                    <div className="divider">or continue with</div>
                    <div className="social-icons">
                        <div className="icon-circle">G</div>
                        <div className="icon-circle">A</div>
                        <div className="icon-circle">F</div>
                    </div>

                    <p className="footer-text">
                        Already a member? <Link href="/login" style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: '600' }}>
                            Login here
                        </Link>
                    </p>
                </div>
            </main>

            <section className="promo-section">
                <div className="promo-inner">
                    {/* 4. Swapped to Next.js Image component */}
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