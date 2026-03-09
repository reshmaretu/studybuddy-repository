import Link from "next/link";
import { Brain, Sparkles, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-dark)] flex flex-col items-center justify-center relative overflow-hidden z-[100] fixed inset-0">
      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-teal)]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl px-6">
        <div className="w-20 h-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl">
          <span className="font-black text-3xl text-[var(--accent-teal)]">SB</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-main)] mb-6 tracking-tight">
          Your cozy <span className="text-[var(--accent-teal)]">productivity sanctuary.</span>
        </h1>

        <p className="text-lg text-[var(--text-muted)] mb-10 leading-relaxed">
          Escape the noise. StudyBuddy is a data-driven, lo-fi environment designed to optimize your flow state and protect your well-being.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 bg-[var(--accent-teal)] text-[#0b1211] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-400 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.2)]">
            <Sparkles size={18} /> Start Your Journey
          </Link>
          <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl font-bold flex items-center justify-center gap-2 hover:border-[var(--accent-teal)] transition-colors">
            Login <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}