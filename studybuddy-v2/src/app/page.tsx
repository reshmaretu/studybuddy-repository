"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Sparkles, BrainCircuit, Network, Cpu, Coffee, Shield, CheckCircle2, Leaf } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // 2. ADD 'as const' so TS knows these are strict animation values
  const springTransition = { type: "spring" as const, stiffness: 100, damping: 20 };
  const expoEase = [0.16, 1, 0.3, 1] as const;

  // 3. TYPE the variants as 'Variants'
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: expoEase } }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    // Detect if hovering over clickable elements
    const handleMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  // 🔄 AUTH REDIRECT
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="relative w-full bg-[#1E1A1D] text-[#EFE6DD] font-sans selection:bg-[#789B8C] selection:text-[#141113]">

      {/* ✨ CUSTOM CURSOR */}
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 rounded-full pointer-events-none z-[9999] mix-blend-screen"
        animate={{
          x: mousePos.x - 12,
          y: mousePos.y - 12,
          scale: isHovering ? 2 : 1,
          backgroundColor: isHovering ? "rgba(232,195,125,0.4)" : "rgba(120,155,140,0.8)", // Gold when hovering, Sage default
          border: isHovering ? "1px solid rgba(232,195,125,0.8)" : "none"
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      >
        {/* Inner Glow */}
        <div className="w-full h-full rounded-full blur-[4px] bg-inherit opacity-50" />
      </motion.div>

      {/* 🌌 AMBIENT PARALLAX BACKGROUND (FIXED) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          style={{ y: bgY }}
          className="absolute inset-0 opacity-40"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#789B8C] mix-blend-screen filter blur-[150px] opacity-10 rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute top-[40%] right-[-10%] w-[60vw] h-[60vw] bg-[#CD9A5B] mix-blend-screen filter blur-[150px] opacity-[0.07] rounded-full animate-pulse" style={{ animationDuration: '15s' }} />
        </motion.div>
      </div>

      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 w-full h-[80px] flex justify-between items-center px-6 lg:px-[10%] bg-[#1E1A1D]/70 backdrop-blur-2xl border-b border-[#3E353B]/50 z-50">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="text-[#E8C37D] font-extrabold text-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2B2529] rounded-lg border border-[#3E353B] flex items-center justify-center shadow-[0_0_15px_rgba(232,195,125,0.1)]">
            <Sparkles size={16} className="text-[#E8C37D]" />
          </div>
          StudyBuddy
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="hidden md:flex items-center gap-8 font-medium text-sm">
          <a href="#philosophy" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Philosophy</a>
          <Link href="/login" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Login</Link>
          <Link href="/register" className="relative group bg-[#E8C37D] text-[#1E1A1D] px-6 py-2.5 rounded-xl font-bold overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(232,195,125,0.4)]">
            <span className="relative z-10">Join Free</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </Link>
        </motion.div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="pt-[180px] pb-24 px-6 lg:px-[10%] grid lg:grid-cols-2 gap-16 items-center min-h-[95vh] relative z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="inline-block px-5 py-2 bg-[#CD9A5B]/10 border border-[#CD9A5B]/30 text-[#CD9A5B] rounded-full text-xs font-bold mb-6 tracking-widest uppercase shadow-[0_0_20px_rgba(205,154,91,0.1)]">
            ✨ Hybrid AI & Multiplayer
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight">
            Focus deeper. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8C37D] to-[#CD9A5B]">Study Cozier.</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-[#A89F9A] text-lg lg:text-xl mb-10 max-w-lg leading-relaxed">
            The all-in-one sanctuary for your academic life. Forge knowledge shards, join quiet study rooms, and untangle complex ideas with your AI companion.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Link href="/register" className="group relative bg-[#789B8C] text-[#141113] px-8 py-4 rounded-2xl font-black text-center overflow-hidden hover:-translate-y-1 transition-all shadow-[0_10px_30px_rgba(120,155,140,0.2)] hover:shadow-[0_15px_40px_rgba(120,155,140,0.4)]">
              <span className="relative z-10 flex items-center justify-center gap-2">Get Started — It's Free</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </Link>
          </motion.div>
        </motion.div>

        {/* ─── HERO VISUAL (ANIMATED & EXTRAVAGANT) ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.2, ease: expoEase }}
          className="relative perspective-1000 w-full max-w-[500px] mx-auto lg:ml-auto"
        >
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="bg-[#2B2529]/80 backdrop-blur-3xl border border-[#3E353B] rounded-[2.5rem] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.6)] aspect-[4/3] flex items-center justify-center relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#789B8C]/20 via-transparent to-[#E8C37D]/10 opacity-60"></div>
            <BrainCircuit size={100} strokeWidth={1} className="text-[#3E353B] group-hover:text-[#789B8C] group-hover:scale-110 transition-all duration-700 ease-out" />

            {/* Orbiting Elements */}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border border-white/5 rounded-[2.5rem] border-dashed pointer-events-none" />

            {/* Floating Badge */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -left-8 bg-[#141113]/90 backdrop-blur-md border border-[#789B8C]/50 px-6 py-4 rounded-2xl font-bold text-sm flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-10"
            >
              <motion.span
                animate={{ boxShadow: ["0 0 0 0 rgba(120,155,140,0.6)", "0 0 0 15px rgba(120,155,140,0)", "0 0 0 0 rgba(120,155,140,0)"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="w-3 h-3 bg-[#789B8C] rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-[#EFE6DD]">324 Shards</span>
                <span className="text-[#A89F9A] text-[10px] uppercase tracking-widest">Forged Today</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── STATS BAR ─── */}
      <motion.section
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-3 bg-[#141113]/80 backdrop-blur-lg border-y border-[#3E353B]/50 text-center py-16 px-6 lg:px-[10%] gap-8 relative z-10"
      >
        {[
          { value: "Hybrid", label: "Cloud & Local AI" },
          { value: "Real-time", label: "Lantern Network" },
          { value: "0%", label: "Burnout Architecture" }
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants} className="group cursor-default">
            <h3 className="text-4xl font-black text-[#CD9A5B] mb-2 group-hover:scale-110 group-hover:text-[#E8C37D] transition-all duration-500 ease-out">{stat.value}</h3>
            <p className="text-[#A89F9A] text-xs font-bold uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-32 px-6 lg:px-[10%] space-y-40 relative z-10">

        {/* FEATURE 1: HYBRID AI */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-200px" }} variants={containerVariants} className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={itemVariants}>
            <span className="text-[#CD9A5B] font-extrabold text-sm tracking-widest uppercase mb-4 flex items-center gap-2"><Cpu size={16} /> Hybrid Intelligence</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Study with a Friend.</h2>
            <p className="text-[#A89F9A] text-lg leading-relaxed mb-6">
              Meet Chum, your AI companion. Powered by a lightning-fast cloud network out of the box, Chum helps you untangle complex nodes and forge knowledge shards instantly.
            </p>
            <div className="bg-[#2B2529]/50 border border-[#3E353B] p-5 rounded-2xl">
              <p className="text-[#A89F9A] text-sm leading-relaxed">
                <strong className="text-[#EFE6DD]">Power User?</strong> Connect your own local <span className="text-[#789B8C]">Ollama</span> node in the settings for 100% offline, private inference.
              </p>
            </div>
          </motion.div>

          {/* ✨ AI CHAT SNIPPET (Or Video) */}
          <motion.div variants={itemVariants} className="bg-[#141113] border border-[#3E353B] rounded-[2.5rem] aspect-square lg:aspect-video shadow-2xl relative overflow-hidden group">
            {/* 💡 TO USE A VIDEO LATER: Uncomment this and put 'ai-demo.mp4' in your public folder */}
            {/* <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" src="/ai-demo.mp4" /> */}

            <div className="absolute inset-0 bg-gradient-to-br from-[#789B8C]/10 to-transparent z-0" />
            <div className="absolute inset-0 flex flex-col p-6 lg:p-10 gap-4 justify-center z-10">
              {/* User Message */}
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="self-end bg-[#789B8C]/20 border border-[#789B8C]/30 text-[#EFE6DD] px-5 py-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%] shadow-lg">
                Can you explain the Pomodoro technique?
              </motion.div>
              {/* Chum Message */}
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="self-start bg-[#2B2529] border border-[#3E353B] text-[#A89F9A] px-5 py-4 rounded-2xl rounded-tl-sm text-sm max-w-[85%] flex flex-col gap-3 shadow-xl">
                <div className="flex gap-2 items-center text-[#E8C37D] font-bold"><Sparkles size={14} /> Chum</div>
                <p>Absolutely! It's a study method where you focus for 25 minutes, then take a 5-minute break. Want me to start a timer for you?</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* FEATURE 2: LANTERN NETWORK */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-200px" }} variants={containerVariants} className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ✨ LANTERN MAP SNIPPET (Or Video) */}
          <motion.div variants={itemVariants} className="order-2 lg:order-1 bg-[#05080c] border border-[#3E353B] rounded-[2.5rem] aspect-square lg:aspect-video shadow-2xl relative overflow-hidden group">
            {/* 💡 TO USE A VIDEO LATER: Uncomment this and put 'map-demo.mp4' in your public folder */}
            {/* <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" src="/map-demo.mp4" /> */}

            <div className="absolute inset-0 flex items-center justify-center">
              {/* Background Grid/Stars */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

              {/* Glowing Nodes */}
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute w-5 h-5 bg-[#00ffff] rounded-full shadow-[0_0_30px_#00ffff] top-[30%] left-[25%]" />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }} className="absolute w-4 h-4 bg-[#c084fc] rounded-full shadow-[0_0_20px_#c084fc] bottom-[30%] right-[30%]" />
              <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }} className="absolute w-3 h-3 bg-[#ffcc00] rounded-full shadow-[0_0_15px_#ffcc00] top-[50%] right-[15%]" />

              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <line x1="25%" y1="30%" x2="70%" y2="70%" stroke="#2dd4bf" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="25%" y1="30%" x2="85%" y2="50%" stroke="#2dd4bf" strokeWidth="1" strokeDasharray="4 4" />
              </svg>

              {/* UI Overlay Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="absolute bottom-6 left-6 bg-[#111111]/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl">
                <div className="text-xs font-black text-white mb-1">Architect's Sanctuary</div>
                <div className="text-[10px] text-[#00ffff] tracking-widest uppercase animate-pulse">● FlowState Active</div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="order-1 lg:order-2">
            <span className="text-[#E8C37D] font-extrabold text-sm tracking-widest uppercase mb-4 flex items-center gap-2"><Sparkles size={16} /> Lantern Network</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Study alone, together.</h2>
            <p className="text-[#A89F9A] text-lg leading-relaxed">
              Drop into the 3D Void and see other scholars in deep work. Join real-time Sanctuaries, share ambient focus timers, and feel the presence of a quiet library from anywhere.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── PROBLEM & SOLUTION ─── */}
      <section className="py-24 px-6 lg:px-[10%] bg-[#141113] text-center border-t border-[#3E353B]">
        <div className="inline-block px-4 py-1.5 border border-red-400/20 bg-red-400/5 text-red-400 rounded-full text-xs font-bold mb-6 tracking-wide uppercase">
          The Challenge
        </div>
        <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Studying is <span className="text-[#789B8C]">Broken.</span></h2>
        <p className="text-[#A89F9A] text-lg max-w-2xl mx-auto mb-16">
          The average student juggles 5+ apps just to get through a week. It’s not just work; it’s digital noise.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {[
            { icon: "📉", title: "Fragmented Focus", desc: "Notes in one app, tasks in another, and constant tab-switching kills your flow state." },
            { icon: "🤯", title: "Digital Burnout", desc: "Sterile, corporate interfaces make studying feel like a chore rather than a journey." },
            { icon: "🕵️", title: "Privacy Loss", desc: "Most AI tools treat your private study notes as data to be sold or used for training." }
          ].map((item, i) => (
            <div key={i} className="bg-red-400/5 border border-red-400/10 p-8 rounded-3xl text-left">
              <span className="text-4xl mb-6 block">{item.icon}</span>
              <h4 className="text-red-400 font-bold text-xl mb-4">{item.title}</h4>
              <p className="text-[#A89F9A] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* ─── THE SOLUTION CARD (RESTORED) ─── */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={containerVariants} className="bg-[#2B2529] border border-[#3E353B] rounded-[3rem] p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-12 shadow-2xl text-left relative overflow-hidden max-w-6xl mx-auto">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#789B8C]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex-1 relative z-10">
            <div className="inline-block px-4 py-1.5 border border-[#789B8C]/30 bg-[#789B8C]/10 text-[#789B8C] rounded-full text-xs font-bold mb-6 tracking-wide uppercase">
              The Solution
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Meet your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#789B8C] to-[#E8C37D]">Study Sanctuary.</span></h2>
            <p className="text-[#A89F9A] text-lg mb-8 leading-relaxed">
              StudyBuddy fixes the friction by unifying your workflow into a single, private, and cozy ecosystem.
            </p>
            <ul className="space-y-4">
              {[
                { title: "Unified Hub:", desc: "Canvas, Garden, and Archive in one tab." },
                { title: "Local Intelligence:", desc: "AI that runs on your hardware via Ollama." },
                { title: "Gamified Peace:", desc: "Turning stress into 'Quest Seeds' and Crystals." }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Sparkles size={20} className="text-[#789B8C] shrink-0 mt-1" />
                  <p className="text-[#A89F9A]"><strong className="text-[#EFE6DD]">{item.title}</strong> {item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:w-1/3 flex justify-center relative z-10">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <CheckCircle2 size={120} strokeWidth={1} className="text-[#789B8C] drop-shadow-[0_0_30px_rgba(120,155,140,0.4)]" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── PHILOSOPHY / ABOUT SECTION ─── */}
      <motion.section id="philosophy" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={containerVariants} className="py-32 px-6 lg:px-[10%] bg-gradient-to-b from-[#141113] to-[#1E1A1D] text-center border-t border-[#3E353B]">
        <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 border border-[#789B8C]/30 bg-[#789B8C]/10 text-[#789B8C] rounded-full text-xs font-bold mb-6 tracking-widest uppercase">
          The Philosophy
        </motion.div>
        <motion.h2 variants={itemVariants} className="text-4xl lg:text-5xl font-extrabold mb-6 max-w-3xl mx-auto leading-tight">
          A Living Workspace for the <span className="text-[#CD9A5B]">Digital Nomad.</span>
        </motion.h2>
        <motion.p variants={itemVariants} className="text-[#A89F9A] text-lg max-w-2xl mx-auto mb-20 leading-relaxed">
          Most tools are built for sterile offices. StudyBuddy was built for the late-night tea drinkers, the creative thinkers, and the students in San Jose del Monte who need a sanctuary, not just a list.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            { icon: <Leaf size={32} />, title: "Zero-Burnout Architecture", desc: "Environment-driven design that prioritizes your mental well-being and reduces digital eye-strain." },
            { icon: <Shield size={32} />, title: "Privacy by Default", desc: "Your thoughts aren't products. With hybrid local AI integration, your data stays in your control." }
          ].map((item, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -10 }} transition={springTransition} className="bg-[#2B2529] border border-[#3E353B] p-10 rounded-3xl text-left hover:border-[#789B8C]/50 shadow-xl group cursor-default">
              <div className="text-[#789B8C] mb-6 bg-[#141113] w-16 h-16 rounded-2xl flex items-center justify-center border border-[#3E353B] group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
              <h3 className="text-[#E8C37D] font-bold text-2xl mb-4">{item.title}</h3>
              <p className="text-[#A89F9A] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── FOUNDER CARD ─── */}
        <motion.div variants={itemVariants} className="mt-24 max-w-5xl mx-auto bg-[#2B2529] border border-[#3E353B] rounded-[3rem] p-8 md:p-16 text-left relative overflow-hidden shadow-2xl">
          <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-[#789B8C] filter blur-[150px] opacity-[0.15] rounded-full pointer-events-none" />
          <div className="grid md:grid-cols-[1.5fr_1fr] gap-12 items-center relative z-10">
            <div>
              <span className="text-[#CD9A5B] font-extrabold text-xs tracking-widest uppercase mb-4 block">The Developer</span>
              <h2 className="text-4xl font-extrabold mb-6">Productivity Pilots</h2>
              <p className="text-[#A89F9A] text-xl italic leading-relaxed mb-8 border-l-2 border-[#789B8C] pl-6 py-2">
                "We didn't want to build just another productivity app. We wanted to build a companion that understands the rhythm of deep work."
              </p>
              <div className="flex gap-12">
                <div><strong className="block text-2xl text-[#E8C37D]">100%</strong><span className="text-[#A89F9A] text-xs font-bold uppercase tracking-widest">Privacy Focus</span></div>
                <div><strong className="block text-2xl text-[#E8C37D]">SJDM</strong><span className="text-[#A89F9A] text-xs font-bold uppercase tracking-widest">Origin</span></div>
              </div>
            </div>
            <div className="hidden md:flex justify-center relative">
              <div className="w-64 h-64 rounded-full border border-[#3E353B] bg-[#141113] flex items-center justify-center text-7xl shadow-inner relative z-10">
                👩‍💻
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-32 pb-12 text-center border-t border-[#3E353B] bg-[#141113] relative overflow-x-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E8C37D] blur-[150px] opacity-[0.03] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-10 text-[#EFE6DD]">Ready to find your focus?</h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={springTransition}>
            <Link href="/register" className="inline-block bg-[#E8C37D] text-[#1E1A1D] px-12 py-5 rounded-2xl font-black text-xl hover:bg-[#d6b068] hover:shadow-[0_0_40px_rgba(232,195,125,0.4)] transition-all">
              Start Your Adventure
            </Link>
          </motion.div>
          <p className="mt-24 text-[#A89F9A] text-sm font-medium">
            &copy; 2026 StudyBuddy. Built for SHS Business Simulation.
          </p>
        </div>
      </footer>
    </div>
  );
}