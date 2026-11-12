"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  MessageSquare,
  Moon,
  Zap,
  Shield,
  Sparkles,
  Users,
  Image as ImageIcon,
  Mic,
  ArrowRight,
  Check,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: Zap,
    title: "Real-time Messaging",
    description: "Instant delivery powered by WebSockets. Your messages arrive before you blink.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations are encrypted and protected. Privacy by design.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Users,
    title: "Group Chats",
    description: "Create groups with admin controls, invite links, and shared media galleries.",
    color: "bg-brand/10 text-brand",
  },
  {
    icon: ImageIcon,
    title: "Rich Media",
    description: "Share images, videos and files seamlessly with smart inline previews.",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: Mic,
    title: "Voice Notes",
    description: "Record and send voice messages with a beautiful waveform player.",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Moon,
    title: "Focus Mode",
    description: "Smart notifications that respect your flow state. No more chaos.",
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="group"
    >
      <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-soft-lg">
        <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-brand/[0.06] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
        <div className={`mb-4 inline-flex rounded-xl p-3 ${feature.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mb-1.5 text-[15px] font-bold tracking-tight text-fg">{feature.title}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{feature.description}</p>
      </div>
    </motion.div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { loginWithGoogleCredential, status } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/");
    }
  }, [status, navigate]);

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    void loginWithGoogleCredential(credentialResponse);
  };

  return (
    <div className="relative min-h-dvh overflow-y-auto bg-canvas">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-brand/20 blur-[120px] dark:bg-brand/15" />
        <div className="absolute -right-40 top-32 h-[520px] w-[520px] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-violet-400/10 blur-[110px]" />
        <div className="absolute inset-0 bg-paper-grid opacity-[0.35] [background-size:28px_28px]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-line/70 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
              <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-fg">LinkUp</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <a
              href="/docs"
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-subtle hover:text-fg"
            >
              Docs
            </a>
            <a
              href="#get-started"
              className="hidden items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95 xs:inline-flex"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative z-10 flex min-h-[82vh] flex-col items-center justify-center px-6 pb-10 pt-16"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-7"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.07] px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
              Now in Beta
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="mb-5 max-w-3xl text-center"
        >
          <span className="block text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl lg:text-7xl">
            Chat that feels
          </span>
          <span className="text-gradient mt-1 block font-display text-[3rem] italic leading-[1.05] sm:text-6xl lg:text-7xl">
            effortless.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22 }}
          className="mb-9 max-w-lg text-center text-[15px] leading-relaxed text-muted sm:text-base"
        >
          A clean, focused space for real-time conversations.
          <br className="hidden sm:block" />
          No clutter. No noise. Just you and your people.
        </motion.p>

        {/* CTA */}
        <motion.div
          id="get-started"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.32, type: "spring" }}
          className="mb-6 flex flex-col items-center gap-4"
        >
          <div className="rounded-2xl bg-surface/60 p-1.5 shadow-soft ring-1 ring-line/80 backdrop-blur-sm">
            <GoogleLogin
              theme="filled_blue"
              shape="pill"
              size="large"
              text="signin_with"
              onSuccess={handleGoogleSuccess}
              onError={() => console.error("Login failed")}
            />
          </div>
          <button
            type="button"
            onClick={() => handleGoogleSuccess({ credential: "demo-token" } as CredentialResponse)}
            className="group inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-brand hover:underline"
          >
            Or explore instant preview as Demo User
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-16 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-faint"
        >
          {["End-to-end feel", "No ads, ever", "Free during beta"].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              {item}
            </span>
          ))}
        </motion.div>

        {/* Chat Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, type: "spring", stiffness: 60 }}
          className="relative w-full max-w-3xl"
        >
          <div className="absolute -inset-x-8 -bottom-8 top-10 rounded-[40px] bg-brand/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-panel">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-line bg-subtle/50 px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <div className="ml-3 flex h-6 items-center rounded-md border border-line bg-surface px-2.5">
                <span className="text-[10px] font-medium text-faint">linkup.chat</span>
              </div>
            </div>

            <div className="flex h-72 sm:h-80">
              {/* Sidebar mock */}
              <div className="hidden w-56 flex-col border-r border-line bg-subtle/40 sm:flex">
                <div className="p-3.5">
                  <div className="mb-3 h-8 w-full rounded-lg border border-line bg-surface" />
                  {[
                    { name: "Design Team", unread: 3, active: true },
                    { name: "Sarah Chen", unread: 0, active: false },
                    { name: "Dev Channel", unread: 12, active: false },
                  ].map((chat, i) => (
                    <motion.div
                      key={chat.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className={`mb-0.5 flex items-center justify-between rounded-lg px-2.5 py-2 ${
                        chat.active ? "bg-surface shadow-sm ring-1 ring-line/70" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-brand-400" />
                        <span className="text-[12px] font-semibold text-fg/90">{chat.name}</span>
                      </div>
                      {chat.unread > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                          {chat.unread}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Chat area mock */}
              <div className="flex flex-1 flex-col justify-end p-4 sm:p-5">
                <div className="space-y-2.5">
                  {[
                    { msg: "The new UI is looking amazing! 🎨", sent: false },
                    { msg: "Thanks! Just pushed the final tweaks", sent: true },
                    { msg: "Can't wait to ship this 🚀", sent: false },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + i * 0.18 }}
                      className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[76%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                          msg.sent
                            ? "rounded-br-md bg-brand-gradient text-white shadow-sm"
                            : "rounded-bl-md border border-line bg-surface text-fg/90"
                        }`}
                      >
                        {msg.msg}
                      </div>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                    className="flex items-center gap-1.5 text-[11px] text-faint"
                  >
                    <span className="font-semibold text-brand">Alex</span>
                    <span>is typing</span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-1 w-1 rounded-full bg-brand"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                        />
                      ))}
                    </span>
                  </motion.div>
                </div>

                {/* Composer mock */}
                <div className="mt-4 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
                  <PlusDot />
                  <div className="h-2 flex-1 rounded-full bg-subtle" />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand">
                    <ArrowRight className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Features</p>
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
              Everything you need,{" "}
              <span className="font-display italic text-brand">nothing you don't.</span>
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted">
              Built for clarity. Designed to get out of your way.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-brand/15 bg-surface p-10 text-center shadow-soft-lg sm:p-14">
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h2 className="mb-2.5 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
                Ready to start?
              </h2>
              <p className="mx-auto mb-9 max-w-sm text-sm text-muted">
                Join the beta and experience conversations without the chaos.
              </p>
              <motion.div
                className="inline-flex"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GoogleLogin
                  theme="filled_blue"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error("Login failed")}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line py-9">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-surface ring-1 ring-line">
              <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-sm font-bold text-fg">LinkUp</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-muted">
            <a href="#" className="transition-colors hover:text-brand">Privacy</a>
            <a href="#" className="transition-colors hover:text-brand">Terms</a>
            <a href="#" className="transition-colors hover:text-brand">Contact</a>
          </div>
          <p className="text-xs text-faint">
            &copy; {new Date().getFullYear()} LinkUp
          </p>
        </div>
      </footer>

      {/* Floating hint */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-[11px] font-medium text-faint shadow-sm backdrop-blur-md">
          <Sparkles className="h-3 w-3 text-brand" />
          Built for thoughtful conversations
        </span>
      </div>
    </div>
  );
};

const PlusDot = () => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-faint">
    <span className="text-sm leading-none">+</span>
  </span>
);

export default LandingPage;
