import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Bot, Briefcase, Landmark, Microscope, LineChart, Megaphone, Stethoscope } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import MiniNoteAgentChat from "@/components/MiniNoteAgentChat";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface WelcomeLandingProps {
  onDocumentSelect?: (id: Id<"documents">) => void;
}

export function WelcomeLanding({ onDocumentSelect }: WelcomeLandingProps) {
  const { signIn } = useAuthActions();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  const user = useQuery(api.auth.loggedInUser);
  const [pendingInlinePrompt, setPendingInlinePrompt] = useState<string | undefined>(undefined);
  const [prefillInput, setPrefillInput] = useState<string | undefined>(undefined);
  const [guestActive, setGuestActive] = useState(false);

  // Keep latest user in a ref for stable event handler
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const lastQuickPromptRef = useRef<{ text: string; at: number } | null>(null);

  // Seamless: pre-authenticate as anonymous on mount if no user
  useEffect(() => {
    if (user === null) {
      void signIn('anonymous').then(() => setGuestActive(true)).catch(() => {});
    }
  }, [user, signIn]);

  // Micro-interactions: collage parallax & marquee slow resume
  const collageRef = useRef<HTMLDivElement>(null);
  const handleCollageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!collageRef.current) return;
    const rect = collageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const max = 6; // px movement cap
    collageRef.current.style.setProperty('--tx', `${(x * max).toFixed(2)}px`);
    collageRef.current.style.setProperty('--ty', `${(y * max).toFixed(2)}px`);
  };
  const handleCollageLeave = () => {
    if (!collageRef.current) return;
    collageRef.current.style.setProperty('--tx', '0px');
    collageRef.current.style.setProperty('--ty', '0px');
  };


  // Listen for quick prompt from top bar (auto-send). Register once; dedupe repeats briefly.
  useEffect(() => {
    const handleTopBarPrompt = async (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      const text = customEvent.detail?.prompt?.trim();
      if (!text) return;
      const now = Date.now();
      const last = lastQuickPromptRef.current;
      if (last && last.text === text && now - last.at < 4000) {
        console.log('[WelcomeLanding] Dedupe quickPrompt', text);
        return;
      }
      lastQuickPromptRef.current = { text, at: now };
      if (!userRef.current) {
        try {
          await signIn('anonymous');
          setGuestActive(true);
        } catch (err) {
          console.warn('[WelcomeLanding] anonymous sign-in failed', err);
        }
      }
      setPendingInlinePrompt(text);
    };
    window.addEventListener('welcome:quickPrompt', handleTopBarPrompt as EventListener);
    return () => window.removeEventListener('welcome:quickPrompt', handleTopBarPrompt as EventListener);
  }, [signIn]);

  const benefitCards = [
    { icon: <Briefcase className='h-3.5 w-3.5' />, title: 'Investors', prompt: 'Summarize today\'s seed and Series A funding in healthcare, life sciences, and tech. Include sources.' },
    { icon: <Landmark className='h-3.5 w-3.5' />, title: 'Bankers', prompt: 'Fetch notable SEC 8-K and 10-K updates for major biotech tickers and summarize key changes.' },
    { icon: <Megaphone className='h-3.5 w-3.5' />, title: 'Marketing', prompt: 'Compile competitor news and social signals for ACME Corp and 3 top peers. Include links.' },
    { icon: <Microscope className='h-3.5 w-3.5' />, title: 'Researchers', prompt: 'List new arXiv papers on retrieval-augmented generation (RAG) this week with short abstracts.' },
    { icon: <Stethoscope className='h-3.5 w-3.5' />, title: 'Healthcare', prompt: 'Summarize new FDA approvals and device clearances in diabetes tech; add sources.' },
    { icon: <LineChart className='h-3.5 w-3.5' />, title: 'Founders', prompt: 'Create a dossier of recent PR, job postings, and product announcements for ACME Corp.' },
  ];

  const titleA = ["Your", "AI", "research", "assistant"];
  const titleB = ["for", "dossiers", "&", "newsletters"];

  return (
    <div className="h-[100svh] landing-gradient-bg grid grid-rows-[auto,1fr,auto] overflow-hidden relative">


      {/* Hero Section - Centered, minimal, animated */}
      <div className="relative max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10 pb-3 sm:pb-4 pointer-events-none">
        {/* Subtle radial gradient backdrop inspired by Vercel/Stripe */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(600px_280px_at_50%_0%,rgba(26,115,232,0.18)_0%,rgba(26,115,232,0)_70%)]" />
        <div className="text-center space-y-4 sm:space-y-6 pointer-events-none">
          {/* Icon with subtle animation */}
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[var(--accent-primary)]/5 rounded-2xl transition-transform hover:scale-105 duration-300 opacity-0 animate-[scaleIn_0.8s_ease-out_forwards] reveal-visible">
            <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--accent-primary)]" />
          </div>

          {/* Hero headline - word-by-word reveal with gradient text */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1]">
              {titleA.map((w, i) => (
                <span key={`t1-${i}`} className={`hero-word wdelay-${i} mr-2 inline-block`}>{w}</span>
              ))}
              <br />
              <span className="gradient-text text-glow accent-shimmer">
                {titleB.map((w, i) => (
                  <span key={`t2-${i}`} className={`hero-word wdelay-${i + titleA.length} mr-2 inline-block`}>{w}</span>
                ))}
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed opacity-0 animate-[fadeUp_0.8s_ease-out_0.8s_forwards] reveal-visible">
              Capture notes, search knowledge, and curate personalized digests.
              <br className="hidden sm:block" />
              No sign-in required to start.
            </p>
          </div>

          {/* CTA Button - Clean, prominent with glow effect */}
          <div className="flex flex-col items-center justify-center gap-2 opacity-0 animate-[fadeUp_0.8s_ease-out_0.4s_forwards] reveal-visible pointer-events-auto">
            <button
              type="button"
              onClick={() => void signIn("google", { redirectTo: typeof window !== 'undefined' ? window.location.href : '/' })}
              className="px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-all duration-200 text-sm sm:text-base font-medium shadow-sm hover:shadow-md hover:scale-[1.02] pressable focus-bloom glow-accent"
            >
              Continue with Google
            </button>
            <div className="text-xs text-[var(--text-muted)]">
              or try as guest — no account needed
            </div>
          </div>

          {/* Who benefits - Pill-style tags */}
          <div className="pt-2 sm:pt-3 opacity-0 animate-[fadeUp_0.8s_ease-out_0.6s_forwards] reveal-visible pointer-events-auto">
            <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-3 sm:mb-4">
              Built for
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 reveal-children-visible">
              {benefitCards.map((c, idx) => (
                <button
                  key={c.title}
                  type="button"
                  onClick={async () => {
                    if (!user) {
                      await signIn('anonymous');
                      setGuestActive(true);
                    }
                    setPrefillInput(c.prompt);
                  }}
                  className={`group px-3.5 py-1.5 rounded-full bg-[var(--bg-secondary)]/60 hover:bg-[var(--accent-primary)]/10 border border-[var(--border-color)]/50 hover:border-[var(--accent-primary)]/30 transition-all duration-200 cursor-pointer opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] anim-delay-${Math.min(idx, 9)} magnet-hover pressable`}
                  title="Click to try this prompt"
                >
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    <span className="opacity-60 group-hover:opacity-100 transition-opacity">{c.icon}</span>
                    <span className="text-xs sm:text-sm font-medium">{c.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collage + Chat Section - resides in 1fr row */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-4 sm:pb-6 opacity-0 animate-[fadeUp_0.8s_ease-out_1s_forwards] min-h-0 h-full flex flex-col gap-2 md:gap-3 reveal-visible pointer-events-auto">
        {/* Simple collage preview (click to prefill prompt) */}
        <div
          ref={collageRef}
          onMouseMove={handleCollageMove}
          onMouseLeave={handleCollageLeave}
          className="hidden md:grid grid-cols-3 gap-2 md:gap-3 h-24 md:h-28 lg:h-32 parallax-container"
        >
          {/* Dossier Preview */}
          <button
            type="button"
            onClick={async () => {
              if (!user) {
                await signIn('anonymous');
                setGuestActive(true);
              }
              setPrefillInput('Create a dossier for ACME Corp: product, team, funding, and the latest news with sources.');
            }}
            className="group relative rounded-xl border border-[var(--border-color)]/40 overflow-hidden parallax-card pressable focus-bloom parallax-d-06 collage-card-dossier"
            title="Prefill a dossier prompt"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-3 flex items-end h-full">
              <p className="text-xs font-medium text-white">Dossier Preview</p>
            </div>
          </button>

          {/* Newsletter Digest */}
          <button
            type="button"
            onClick={async () => {
              if (!user) {
                await signIn('anonymous');
                setGuestActive(true);
              }
              setPrefillInput('Draft a weekly digest on AI news: top stories, notable papers, and key links.');
            }}
            className="group relative rounded-xl border border-[var(--border-color)]/40 overflow-hidden parallax-card pressable focus-bloom parallax-d-10 collage-card-newsletter"
            title="Prefill a newsletter prompt"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-3 flex items-end h-full">
              <p className="text-xs font-medium text-white">Newsletter Digest</p>
            </div>
          </button>

          {/* Media Collage */}
          <button
            type="button"
            onClick={async () => {
              if (!user) {
                await signIn('anonymous');
                setGuestActive(true);
              }
              setPrefillInput('Find and summarize 3 recent images/videos on Retrieval-Augmented Generation. Include source URLs.');
            }}
            className="group relative rounded-xl border border-[var(--border-color)]/40 overflow-hidden parallax-card pressable focus-bloom parallax-d-08 collage-card-media"
            title="Prefill a media prompt"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-3 flex items-end h-full">
              <p className="text-xs font-medium text-white">Media Collage</p>
            </div>
          </button>
        </div>

        {/* Chat Panel - Borderless, modern, fills remaining space */}
        <div className="flex-1 min-h-0 bg-[var(--bg-secondary)]/30 rounded-2xl shadow-sm backdrop-blur-sm overflow-hidden border border-[var(--border-color)]/30">
          <MiniNoteAgentChat
            user={user}
            pendingPrompt={pendingInlinePrompt}
            onPromptConsumed={() => setPendingInlinePrompt(undefined)}
            prefillInput={prefillInput}
            onPrefillConsumed={() => setPrefillInput(undefined)}
            onSignInRequired={async () => {
              await signIn('anonymous');
              setGuestActive(true);
            }}
          />
        </div>
      </div>

      {/* Trust indicators - Subtle, bottom */}
      <div className="hidden md:block max-w-5xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 opacity-0 animate-[fadeIn_0.8s_ease-out_1.4s_forwards] reveal-visible">
        <div
          className="relative overflow-hidden marquee-container marquee-32s"
        >
          <p className="text-xs text-[var(--text-muted)] mb-2 text-center">Trusted by professionals at</p>
          {/* Edge fade masks */}
          <div className="marquee-fade-left" aria-hidden="true" />
          <div className="marquee-fade-right" aria-hidden="true" />
          {/* Animated logo/name row */}
          <div className="animate-marquee opacity-50 hover:opacity-70 transition-opacity">
            {(["Mercor", "Cognition", "SevenAI", "Greylock", "Turing", "Augment", "Vercel", "Stripe", "Linear"]).concat(["Mercor", "Cognition", "SevenAI", "Greylock", "Turing", "Augment", "Vercel", "Stripe", "Linear"]).map((name, idx) => (
              <span
                key={`${name}-${idx}`}
                className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge: toggles between guest/sign-in CTAs */}
      {(!user || guestActive) && (
        <div className="fixed bottom-6 right-6 opacity-0 animate-[scaleIn_0.6s_ease-out_2s_forwards] reveal-visible">
          {!guestActive ? (
            <button
              type="button"
              onClick={async () => { await signIn('anonymous'); setGuestActive(true); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-lg hover:bg-[var(--bg-secondary)]/40 transition-colors pressable focus-bloom"
              aria-label="Sign in later and start a guest session"
            >
              Sign in later
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-lg">
              <span className="text-xs text-[var(--text-secondary)]">Guest session active</span>
              <button
                type="button"
                onClick={() => void signIn('google', { redirectTo: typeof window !== 'undefined' ? window.location.href : '/' })}
                className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WelcomeLanding;

