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
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations are encrypted and protected. Privacy by design.",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    icon: Users,
    title: "Group Chats",
    description: "Create groups with admin controls, invite links, and media galleries.",
    color: "bg-blue-50 text-[#6d7af7] dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    icon: ImageIcon,
    title: "Rich Media",
    description: "Share images, videos, and files seamlessly with smart previews.",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    icon: Mic,
    title: "Voice Notes",
    description: "Record and send voice messages with a beautiful waveform player.",
    color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
  },
  {
    icon: Moon,
    title: "Focus Mode",
    description: "Smart notifications that respect your flow state. No more chaos.",
    color: "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div className="surface-panel rounded-3xl p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className={`mb-5 inline-flex rounded-2xl p-3.5 ${feature.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="soft-heading mb-2 text-lg text-slate-900 dark:text-slate-100">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{feature.description}</p>
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
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
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
    <div className="relative min-h-dvh overflow-y-auto" style={{ backgroundColor: 'var(--bg-soft)' }}>
      {/* Subtle ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#6d7af7]/8 blur-[100px]" />
        <div className="absolute -right-32 top-48 h-[500px] w-[500px] rounded-full bg-[#6d7af7]/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-400/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl shadow-md shadow-[#6d7af7]/20 bg-white">
            <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
          </div>
          <span className="soft-heading text-xl tracking-tight text-slate-900 dark:text-slate-100">LinkUp</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden items-center gap-6 sm:flex"
        >
          <a href="/docs" className="text-sm font-medium text-slate-400 transition-colors hover:text-[#6d7af7]">Docs</a>
        </motion.div>
      </nav>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-6"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d7af7]/15 bg-[#6d7af7]/5 px-5 py-2.5 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#6d7af7]" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#6d7af7]">
              Now in Beta
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-6 text-center"
        >
          <span className="soft-heading block text-5xl tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
            Chat that feels
          </span>
          <span className="soft-heading block text-5xl tracking-tight sm:text-6xl lg:text-7xl" style={{ color: 'var(--primary-blue)' }}>
            effortless.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mb-12 max-w-lg text-center text-lg text-slate-500 dark:text-slate-400"
        >
          A clean, focused space for real-time conversations.
          <br />
          No clutter. No noise. Just you and your people.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
          className="mb-20"
        >
          <GoogleLogin
            theme="filled_blue"
            shape="pill"
            size="large"
            text="signin_with"
            onSuccess={handleGoogleSuccess}
            onError={() => console.error("Login failed")}
          />
        </motion.div>

        {/* Chat Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, type: "spring", stiffness: 60 }}
          className="w-full max-w-3xl"
        >
          <div className="surface-panel overflow-hidden rounded-3xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <div className="h-3 w-3 rounded-full bg-red-400/70" />
              <div className="h-3 w-3 rounded-full bg-amber-400/70" />
              <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
              <div className="ml-3 flex h-7 items-center rounded-lg bg-slate-50 px-3 dark:bg-slate-800">
                <span className="text-[11px] font-medium text-slate-400">linkup.chat</span>
              </div>
            </div>

            <div className="flex h-72 sm:h-80">
              {/* Sidebar mock */}
              <div className="hidden w-56 flex-col border-r border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 sm:flex">
                <div className="p-4">
                  <div className="mb-4 h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                  {[
                    { name: "Design Team", unread: 3, active: true },
                    { name: "Sarah Chen", unread: 0, active: false },
                    { name: "Dev Channel", unread: 12, active: false },
                  ].map((chat, i) => (
                    <motion.div
                      key={chat.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className={`mb-1 flex items-center justify-between rounded-xl px-3 py-2.5 ${
                        chat.active ? "bg-white shadow-sm dark:bg-slate-800" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6d7af7] to-[#8b96f9]" />
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{chat.name}</span>
                      </div>
                      {chat.unread > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6d7af7] px-1.5 text-[10px] font-bold text-white">
                          {chat.unread}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Chat area mock */}
              <div className="flex flex-1 flex-col justify-end p-5">
                <div className="space-y-3">
                  {[
                    { name: "Alex", msg: "The new UI is looking amazing! 🎨", time: "2:34 PM", sent: false },
                    { name: "You", msg: "Thanks! Just pushed the final tweaks", time: "2:35 PM", sent: true },
                    { name: "Alex", msg: "Can't wait to ship this 🚀", time: "2:36 PM", sent: false },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + i * 0.2 }}
                      className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.sent
                            ? "rounded-br-lg bg-[#6d7af7] text-white"
                            : "rounded-bl-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {msg.msg}
                      </div>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                    className="flex items-center gap-2 text-sm text-slate-400"
                  >
                    <span className="font-semibold text-[#6d7af7]">Alex</span>
                    <span>is typing</span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-1.5 w-1.5 rounded-full bg-[#6d7af7]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                        />
                      ))}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="soft-heading mb-4 text-3xl text-slate-900 dark:text-white sm:text-4xl">
              Everything you need,{" "}
              <span style={{ color: 'var(--primary-blue)' }}>nothing you don't.</span>
            </h2>
            <p className="mx-auto max-w-md text-slate-500 dark:text-slate-400">
              Built for clarity. Designed to get out of your way.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <div className="surface-panel overflow-hidden rounded-[32px] p-10 text-center sm:p-14">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl blue-gradient-header shadow-lg shadow-[#6d7af7]/20">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h2 className="soft-heading mb-3 text-3xl text-slate-900 dark:text-white sm:text-4xl">
              Ready to start?
            </h2>
            <p className="mx-auto mb-10 max-w-sm text-slate-500 dark:text-slate-400">
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
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 py-10 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
            </div>
            <span className="soft-heading text-slate-900 dark:text-white">LinkUp</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <a href="#" className="transition-colors hover:text-[#6d7af7]">Privacy</a>
            <a href="#" className="transition-colors hover:text-[#6d7af7]">Terms</a>
            <a href="#" className="transition-colors hover:text-[#6d7af7]">Contact</a>
          </div>
          <p className="text-sm text-slate-300 dark:text-slate-600">
            &copy; {new Date().getFullYear()} LinkUp
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
