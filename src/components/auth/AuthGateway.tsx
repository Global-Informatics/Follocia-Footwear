import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { ensureCustomerRemote } from "@/lib/commerceStore";
import { BrandLogo } from "@/components/BrandLogo";
import { GoldenParticles } from "@/components/GoldenParticles";

export type UserRole = "admin" | "customer";
export type AuthUser = { id: string; name: string; email: string; role: UserRole; tier: string };
export type AuthSession = { user: AuthUser; createdAt: string };
type StoredUser = AuthUser & { password: string };
type AuthGatewayProps = { intent?: UserRole; compact?: boolean; onAuthenticated: (session: AuthSession) => void };

const USERS_KEY = "follocia_users";
const SESSION_KEY = "follocia_session";
const demoUsers: StoredUser[] = [
  { id: "adm-001", name: "Maison Admin", email: "admin@follocia.com", password: "Admin@123", role: "admin", tier: "Operations" },
  { id: "vip-001", name: "Ananya Sharma", email: "client@follocia.com", password: "Client@123", role: "customer", tier: "Private Atelier" },
];

function parseJson<T>(v: string | null, fb: T): T { if (!v) return fb; try { return JSON.parse(v) as T; } catch { return fb; } }
function getUsers() { const u = parseJson<StoredUser[]>(localStorage.getItem(USERS_KEY), []); if (u.length > 0) return u; localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers)); return demoUsers; }
function saveSession(user: AuthUser) { const s = { user, createdAt: new Date().toISOString() }; localStorage.setItem(SESSION_KEY, JSON.stringify(s)); return s; }
export function readAuthSession() { if (typeof window === "undefined") return null; return parseJson<AuthSession | null>(localStorage.getItem(SESSION_KEY), null); }
export function clearAuthSession() { localStorage.removeItem(SESSION_KEY); }

const ease = [0.2, 0.8, 0.2, 1] as const;

export function AuthGateway({ intent = "customer", compact = false, onAuthenticated }: AuthGatewayProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<UserRole>(intent);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(intent === "admin" ? "admin@follocia.com" : "client@follocia.com");
  const [password, setPassword] = useState(intent === "admin" ? "Admin@123" : "Client@123");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const copy = useMemo(() => role === "admin"
    ? { eyebrow: "Maison control", title: "Admin access for scarce drop operations.", body: "Manage limited editions, reservations, VIP approvals, concierge tasks and launch inventory." }
    : { eyebrow: "Private atelier", title: "Member access before the collection opens.", body: "Enter the private storefront, reserve rare pairs, manage fittings and keep your collector profile ready." },
  [role]);

  const triggerError = (msg: string) => { setError(msg); setShake(true); setTimeout(() => setShake(false), 600); };

  const authenticate = async (e = email, p = password, r = role) => {
    const user = getUsers().find(u => u.email.toLowerCase() === e.trim().toLowerCase() && u.password === p && u.role === r);
    if (!user) { triggerError("Access details match nahi ho rahe. Role, email aur password check karo."); return; }
    const { password: _, ...safe } = user;
    if (safe.role === "customer") await ensureCustomerRemote(safe);
    onAuthenticated(saveSession(safe));
  };

  const register = async () => {
    const ce = email.trim().toLowerCase(), cn = name.trim();
    if (!cn || !ce || password.length < 6) { triggerError("Name, email aur minimum 6 character password required hai."); return; }
    if (getUsers().some(u => u.email.toLowerCase() === ce)) { triggerError("Ye email already registered hai. Login use karo."); return; }
    const user: StoredUser = { id: `vip-${Date.now()}`, name: cn, email: ce, password, role: "customer", tier: "Private Atelier" };
    localStorage.setItem(USERS_KEY, JSON.stringify([...getUsers(), user]));
    const { password: _, ...safe } = user;
    await ensureCustomerRemote(safe);
    onAuthenticated(saveSession(safe));
  };

  const useDemo = (r: UserRole) => { const u = demoUsers.find(u => u.role === r)!; setRole(r); setMode("login"); setEmail(u.email); setPassword(u.password); setError(""); };

  return (
    <main className={`relative overflow-hidden text-[var(--bone)] ${compact ? "bg-transparent" : "min-h-screen bg-[var(--ink)]"}`}>
      {!compact && (
        <>
          <div className="absolute inset-0 animate-aurora opacity-25" style={{ background: "linear-gradient(135deg, oklch(0.2 0.08 60), oklch(0.12 0.1 80), oklch(0.18 0.06 40))", backgroundSize: "300% 300%" }} />
          <GoldenParticles count={35} className="z-[1] opacity-50" />
          <div className="absolute inset-0 luxe-grain z-[2]" />
          <div className="vignette absolute inset-0 z-[2]" />
          <motion.div animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[20%] top-[30%] h-[40vh] w-[40vh] rounded-full bg-[var(--gold)]/10 blur-[120px]" />
          <motion.div animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} className="absolute right-[15%] bottom-[20%] h-[35vh] w-[35vh] rounded-full bg-[oklch(0.7_0.1_40)]/8 blur-[100px]" />
        </>
      )}

      <section className={`relative z-10 mx-auto grid gap-10 ${compact ? "max-w-[480px] p-0" : "min-h-screen max-w-[1500px] px-6 py-8 md:px-12 lg:grid-cols-[1fr_480px] lg:items-center"}`}>
        {/* Left brand panel */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }} className={compact ? "hidden" : "flex min-h-[45vh] flex-col justify-between"}>
          <a href={import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL} aria-label="Follocia home" className="w-fit">
            <BrandLogo imageClassName="h-24 w-24 border border-white/10" />
          </a>
          <div className="max-w-4xl">
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="eyebrow text-[var(--gold)]">{copy.eyebrow}</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 40, rotateX: -10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.5, duration: 1.2, ease }} className="mt-6 font-display text-[clamp(4rem,10vw,9.5rem)] leading-[0.86] text-balance" style={{ perspective: 1200 }}>{copy.title}</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }} className="mt-8 max-w-xl text-base leading-relaxed text-[var(--bone)]/65">{copy.body}</motion.p>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }} className="hidden gap-3 text-[var(--bone)]/55 md:flex">
            {["Limited annual pairs", "VIP reservations", "White-glove dispatch"].map((t, i) => (
              <motion.span key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 + i * 0.1 }} className="border border-[var(--bone)]/12 px-4 py-3 eyebrow hover:border-[var(--gold)]/40 transition-colors">{t}</motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Login form card with 3D entrance */}
        <motion.form
          initial={{ opacity: 0, y: 30, rotateY: compact ? 0 : -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1, x: shake ? [0, -8, 8, -6, 6, 0] : 0 }}
          transition={{ duration: 0.8, delay: compact ? 0 : 0.2, ease }}
          style={{ perspective: 1200 }}
          onSubmit={e => { e.preventDefault(); setError(""); if (mode === "register") void register(); else void authenticate(); }}
          className={`border border-[var(--bone)]/12 bg-[var(--bone)] px-5 py-6 text-[var(--ink)] shadow-[var(--shadow-luxe)] md:px-8 md:py-8 ${compact ? "w-full" : ""}`}
        >
          {/* Role toggle with animated golden indicator */}
          <div className="relative flex gap-0 border border-[var(--ink)]/10 p-1">
            <motion.div layoutId="role-indicator" className="absolute inset-y-1 z-0 bg-[var(--ink)]" style={{ width: "50%", left: role === "customer" ? "4px" : "calc(50% - 0px)" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            {(["customer", "admin"] as const).map(r => (
              <button key={r} type="button" onClick={() => { setRole(r); setMode("login"); useDemo(r); }}
                className={`relative z-10 flex-1 px-4 py-3 eyebrow transition-colors duration-300 ${role === r ? "text-[var(--bone)]" : "text-[var(--ink)]/55 hover:bg-[var(--ink)]/5"}`}>
                {r === "customer" ? "Customer" : "Admin"}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <p className="eyebrow text-[var(--gold)]">{mode === "register" ? "Create account" : "Secure sign in"}</p>
            <AnimatePresence mode="wait">
              <motion.h2 key={`${mode}-${role}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`mt-3 font-display ${compact ? "text-4xl" : "text-5xl"}`}>
                {mode === "register" ? "Join Private Atelier" : role === "admin" ? "Maison Admin" : "Welcome Back"}
              </motion.h2>
            </AnimatePresence>
          </div>

          <div className="mt-8 grid gap-4">
            <AnimatePresence>
              {mode === "register" && (
                <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid gap-2 overflow-hidden">
                  <span className="eyebrow text-[var(--ink)]/45">Full name</span>
                  <input value={name} onChange={e => setName(e.target.value)} className="border border-[var(--ink)]/15 bg-transparent px-4 py-4 outline-none transition-all duration-500 focus:border-[var(--gold)] focus:shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]" />
                </motion.label>
              )}
            </AnimatePresence>
            <label className="grid gap-2">
              <span className="eyebrow text-[var(--ink)]/45">Email</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="border border-[var(--ink)]/15 bg-transparent px-4 py-4 outline-none transition-all duration-500 focus:border-[var(--gold)] focus:shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]" />
            </label>
            <label className="grid gap-2">
              <span className="eyebrow text-[var(--ink)]/45">Password</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border border-[var(--ink)]/15 bg-transparent px-4 py-4 outline-none transition-all duration-500 focus:border-[var(--gold)] focus:shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]" />
            </label>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 border border-red-900/20 bg-red-900/5 px-4 py-3 text-sm font-medium text-red-900">{error}</motion.p>
            )}
          </AnimatePresence>

          <button type="submit" className="magnetic-btn mt-6 w-full bg-[var(--ink)] px-5 py-4 eyebrow text-[var(--bone)] transition-all duration-500 hover:bg-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[var(--shadow-gold-glow)]">
            {mode === "register" ? "Create Account" : "Enter Follocia"}
          </button>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(["customer", "admin"] as const).map(r => (
              <button key={r} type="button" onClick={() => useDemo(r)} className="group border border-[var(--ink)]/12 px-3 py-3 eyebrow text-[var(--ink)]/60 transition-all hover:border-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[0_0_15px_oklch(0.78_0.12_80/0.1)]">
                Demo {r === "customer" ? "Client" : "Admin"}
              </button>
            ))}
          </div>

          {role === "customer" && (
            <button type="button" onClick={() => { setMode(v => v === "login" ? "register" : "login"); setError(""); }}
              className="mt-5 w-full text-center text-sm font-semibold text-[var(--ink)]/60 hover:text-[var(--ink)] transition-colors">
              {mode === "login" ? "New collector account create karo" : "Existing account se login karo"}
            </button>
          )}
        </motion.form>
      </section>
    </main>
  );
}
