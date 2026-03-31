"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  MessageSquare,
  Moon,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Real-time messaging with zero lag. Built for speed.",
    gradient: "from-amber-400 to-ember",
  },
  {
    icon: Shield,
    title: "End-to-End Encrypted",
    description: "Your conversations are private and secure.",
    gradient: "from-jade to-teal",
  },
  {
    icon: Moon,
    title: "Focus Mode",
    description: "Smart notifications that respect your flow state.",
    gradient: "from-violet-400 to-purple-500",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, type: "spring", stiffness: 100 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative"
    >
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-lagoon/40 via-teal/40 to-jade/40 opacity-0 blur transition duration-500 group-hover:opacity-100" />
      <div className="surface-card relative rounded-3xl p-8">
        <div className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <h3 className="soft-heading mb-3 text-xl font-semibold text-slate-100">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
        <div className="mt-6 h-1 w-0 rounded-full bg-gradient-to-r from-lagoon to-teal transition-all duration-500 group-hover:w-16" />
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
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/");
    }
  }, [status, navigate]);

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    void loginWithGoogleCredential(credentialResponse);
  };

  return (
    <div className="ambient-grid relative min-h-dvh overflow-hidden">
      {/* Ambient background orbs — match ChatApp */}
      <div className="animate-drift absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/15" />
      <div className="animate-drift absolute right-[-8rem] top-24 h-80 w-80 rounded-full bg-teal-400/18 blur-3xl [animation-delay:1.2s] dark:bg-teal-400/14" />
      <div className="animate-drift absolute bottom-[-8rem] left-[20%] h-72 w-72 rounded-full bg-orange-300/18 blur-3xl [animation-delay:2.2s] dark:bg-orange-400/12" />
      <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),transparent)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),transparent)]" />

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lagoon to-teal shadow-lg shadow-lagoon/30 sm:h-12 sm:w-12">
            <MessageSquare className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <span className="soft-heading text-xl font-semibold tracking-tight text-ink dark:text-slate-100 sm:text-2xl">Vaani</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden items-center gap-4 sm:flex"
        >
          <a href="/docs" className="text-sm font-medium text-ink/50 transition-colors hover:text-ink dark:text-slate-400 dark:hover:text-slate-100">Docs</a>
        </motion.div>
      </nav>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative z-10 flex min-h-[75vh] flex-col items-center justify-center px-6"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-64 w-64 rounded-full bg-gradient-to-br from-lagoon/15 to-teal/15 blur-3xl" />
        </div>

        {/* Logo with glow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 60px rgba(21, 94, 117, 0.3)",
                "0 0 100px rgba(13, 148, 136, 0.35)",
                "0 0 60px rgba(21, 94, 117, 0.3)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-lagoon to-teal shadow-2xl shadow-lagoon/40 sm:h-20 sm:w-20"
          >
            <MessageSquare className="h-8 w-8 text-white sm:h-10 sm:w-10" />
          </motion.div>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-lagoon/20 bg-lagoon/5 px-5 py-2.5">
            <Sparkles className="h-4 w-4 text-lagoon" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon">
              Now in Beta
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 text-center"
        >
          <span className="soft-heading text-5xl font-semibold tracking-tight text-ink dark:text-slate-100 sm:text-6xl lg:text-7xl">
            <span className="text-gradient">Vaani</span>
          </span>
          <br />
          <span className="mt-2 block text-2xl font-light text-ink/60 dark:text-slate-300 sm:text-3xl lg:text-4xl">
            where conversations feel right
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-10 max-w-xl text-center text-base text-ink/55 dark:text-slate-400 sm:text-lg"
        >
          A calmer, smarter space for real-time conversations.
          <br />
          Built for focus. Designed with purpose.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
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

        {/* Chat preview mockup */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-16 w-full max-w-3xl px-4"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="surface-panel relative mx-auto overflow-hidden rounded-3xl"
          >
            <div className="flex h-56 sm:h-64">
              {/* Sidebar mock */}
              <div className="hidden w-16 flex-col items-center gap-3 border-r border-white/5 bg-white/3 py-4 dark:border-white/5 dark:bg-white/[0.02] sm:flex">
                {["bg-lagoon", "bg-teal", "bg-ember", "bg-jade"].map((bg, i) => (
                  <div key={i} className={`h-10 w-10 rounded-xl ${bg} opacity-40`} />
                ))}
              </div>
              {/* Chat mock */}
              <div className="flex-1 p-4">
                <div className="space-y-3">
                  {[
                    { name: "Sarah", color: "from-pink-500 to-rose-500", msg: "Hey! How's the new design coming?", time: "2:34 PM", sent: false },
                    { name: "You", color: "from-lagoon to-teal", msg: "Almost done! It's looking great", time: "2:35 PM", sent: true },
                    { name: "Sarah", color: "from-pink-500 to-rose-500", msg: "Can't wait to see it!", time: "2:36 PM", sent: false },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: msg.sent ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.2 }}
                      className={`flex items-start gap-3 ${msg.sent ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`h-8 w-8 shrink-0 rounded-full bg-gradient-to-br ${msg.color}`} />
                      <div className={`max-w-[65%] ${msg.sent ? "text-right" : ""}`}>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-ink dark:text-slate-200">{msg.name}</span>
                          <span className="text-xs text-ink/40 dark:text-slate-500">{msg.time}</span>
                        </div>
                        <div className={`mt-1 inline-block rounded-2xl px-3 py-2 text-sm ${
                          msg.sent
                            ? "bg-gradient-to-br from-lagoon to-teal text-white rounded-br-md"
                            : "bg-white/60 text-ink/80 dark:bg-white/5 dark:text-slate-300 rounded-bl-md"
                        }`}>
                          {msg.msg}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                    className="flex items-center gap-2 text-sm text-ink/50 dark:text-slate-400"
                  >
                    <span className="font-medium text-lagoon dark:text-teal">Sarah</span>
                    <span>is typing</span>
                    <div className="typing-indicator inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-lagoon dark:bg-teal" />
                      <span className="h-1.5 w-1.5 rounded-full bg-lagoon dark:bg-teal" />
                      <span className="h-1.5 w-1.5 rounded-full bg-lagoon dark:bg-teal" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/60 to-transparent dark:from-slate-900/60" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-5xl text-center"
        >
          <h2 className="soft-heading mb-4 text-3xl font-semibold text-ink dark:text-slate-100 sm:text-4xl lg:text-5xl">
            Built different.
            <br />
            <span className="text-gradient">Designed for you.</span>
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-ink/50 dark:text-slate-400">
            Experience communication without the noise.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20 sm:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl"
        >
          <div className="surface-panel relative overflow-hidden rounded-[40px] p-8 sm:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-lagoon/5 via-transparent to-teal/5 pointer-events-none" />
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lagoon/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal/10 blur-3xl pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative text-center"
            >
              <h2 className="soft-heading text-3xl font-semibold text-ink dark:text-slate-100 sm:text-4xl lg:text-5xl">
                Ready to communicate
                <br />
                <span className="text-gradient">without the chaos?</span>
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-ink/50 dark:text-slate-400">
                Join the beta and be among the first to experience a calmer way to connect.
              </p>

              <motion.div
                className="mt-10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-ink/8 py-10 backdrop-blur-xl dark:border-white/5 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-lagoon to-teal">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="soft-heading font-semibold text-ink dark:text-slate-100">Vaani</span>
          </div>
          <div className="flex gap-8 text-sm text-ink/40 dark:text-slate-400">
            <a href="#" className="transition-colors hover:text-lagoon dark:hover:text-teal">Privacy</a>
            <a href="#" className="transition-colors hover:text-lagoon dark:hover:text-teal">Terms</a>
            <a href="#" className="transition-colors hover:text-lagoon dark:hover:text-teal">Contact</a>
          </div>
          <p className="text-sm text-ink/30 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Vaani
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
