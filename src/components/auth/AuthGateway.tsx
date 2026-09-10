import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { ensureCustomerRemote } from "@/lib/commerceStore";
import { BrandLogo } from "@/components/BrandLogo";
import { GoldenParticles } from "@/components/GoldenParticles";

export type UserRole = "admin" | "customer";
export type AuthUser = { id: string; name: string; email: string; phone?: string; role: UserRole; tier: string };
export type AuthSession = { user: AuthUser; createdAt: string };
type StoredUser = AuthUser & { password: string };
type AuthGatewayProps = { intent?: UserRole; compact?: boolean; onAuthenticated: (session: AuthSession) => void };

const USERS_KEY = "follocia_users";
const SESSION_KEY = "follocia_session";
const demoUsers: StoredUser[] = [
  { id: "adm-001", name: "Maison Admin", email: "admin@follocia.com", phone: "9876543210", password: "Admin@123", role: "admin", tier: "Operations" },
  { id: "vip-001", name: "Ananya Sharma", email: "client@follocia.com", phone: "9876543211", password: "Client@123", role: "customer", tier: "Private Atelier" },
];

function parseJson<T>(v: string | null, fb: T): T { if (!v) return fb; try { return JSON.parse(v) as T; } catch { return fb; } }
function getUsers(): StoredUser[] {
  const stored = parseJson<StoredUser[]>(localStorage.getItem(USERS_KEY), []);
  // Ensure demo accounts (Admin & Customer) are always fresh and available
  const userMap = new Map<string, StoredUser>();
  for (const u of demoUsers) {
    userMap.set(u.email.toLowerCase(), u);
  }
  for (const u of stored) {
    if (u && u.email && !userMap.has(u.email.toLowerCase())) {
      userMap.set(u.email.toLowerCase(), u);
    }
  }
  const result = Array.from(userMap.values());
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(result));
  } catch {
    // ignore quota/private browsing errors
  }
  return result;
}
function saveSession(user: AuthUser) {
  const s = { user, createdAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}
export function readAuthSession() {
  if (typeof window === "undefined") return null;
  return parseJson<AuthSession | null>(localStorage.getItem(SESSION_KEY), null);
}
export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

const ease = [0.2, 0.8, 0.2, 1] as const;

export function AuthGateway({ intent = "customer", compact = false, onAuthenticated }: AuthGatewayProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<UserRole>(intent);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // Email or Mobile Number
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const copy = useMemo(() => role === "admin"
    ? { eyebrow: "Maison control", title: "Admin access for scarce drop operations.", body: "Manage limited editions, reservations, VIP approvals, concierge tasks and launch inventory." }
    : { eyebrow: "Private atelier", title: "Member access before the collection opens.", body: "Enter the private storefront, reserve rare pairs, manage fittings and keep your collector profile ready." },
  [role]);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const authenticate = async () => {
    const term = identifier.trim().toLowerCase();
    const cleanPhone = term.replace(/\D/g, "");
    const trimmedPw = password.trim();

    if (!term || !trimmedPw) {
      triggerError("Please enter your email or phone number, and password.");
      return;
    }

    // Direct check for admin credentials
    const isAdminTerm =
      term === "admin@follocia.com" ||
      term === "admin" ||
      (cleanPhone.length >= 10 && cleanPhone.includes("9876543210"));
    const isAdminPass =
      trimmedPw === "Admin@123" ||
      trimmedPw.toLowerCase() === "admin@123" ||
      trimmedPw.toLowerCase() === "admin123" ||
      trimmedPw.toLowerCase() === "admin";

    if (isAdminTerm && isAdminPass) {
      const adminUser: AuthUser = {
        id: "adm-001",
        name: "Maison Admin",
        email: "admin@follocia.com",
        phone: "9876543210",
        role: "admin",
        tier: "Operations",
      };
      const session = saveSession(adminUser);
      window.location.hash = "/admin";
      onAuthenticated(session);
      return;
    }

    // Direct check for default client credentials
    const isClientTerm =
      term === "client@follocia.com" ||
      term === "client" ||
      (cleanPhone.length >= 10 && cleanPhone.includes("9876543211"));
    const isClientPass =
      trimmedPw === "Client@123" ||
      trimmedPw.toLowerCase() === "client@123" ||
      trimmedPw.toLowerCase() === "client123" ||
      trimmedPw.toLowerCase() === "client";

    if (isClientTerm && isClientPass) {
      const clientUser: AuthUser = {
        id: "vip-001",
        name: "Ananya Sharma",
        email: "client@follocia.com",
        phone: "9876543211",
        role: "customer",
        tier: "Private Atelier",
      };
      await ensureCustomerRemote(clientUser);
      const session = saveSession(clientUser);
      onAuthenticated(session);
      return;
    }

    // General user lookup in storage
    const allUsers = getUsers();
    const user = allUsers.find((u) => {
      const uEmail = (u.email || "").toLowerCase();
      const uPhone = (u.phone || "").replace(/\D/g, "");

      const identifierMatches =
        uEmail === term ||
        (cleanPhone.length >= 10 && uPhone.includes(cleanPhone)) ||
        (term === "admin" && u.role === "admin") ||
        (term === "client" && u.role === "customer");

      if (!identifierMatches) return false;

      const passwordMatches =
        u.password === trimmedPw ||
        u.password.toLowerCase() === trimmedPw.toLowerCase();

      return passwordMatches;
    });

    if (!user) {
      triggerError("Invalid credentials. Please verify your role, email or phone number, and password.");
      return;
    }

    const { password: _, ...safe } = user;
    if (safe.role === "customer") await ensureCustomerRemote(safe);
    const session = saveSession(safe);
    if (safe.role === "admin") {
      window.location.hash = "/admin";
    }
    onAuthenticated(session);
  };

  const register = async () => {
    const cn = name.trim();
    const ce = email.trim().toLowerCase();
    const cp = phone.trim().replace(/\D/g, "");

    if (!cn || !ce || password.length < 6) {
      triggerError("Full name, valid email, and minimum 6-character password are required.");
      return;
    }

    if (cp && cp.length < 10) {
      triggerError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const allUsers = getUsers();
    if (allUsers.some((u) => u.email.toLowerCase() === ce)) {
      triggerError("This email is already registered. Please sign in instead.");
      return;
    }

    if (cp && allUsers.some((u) => u.phone && u.phone.replace(/\D/g, "") === cp)) {
      triggerError("This phone number is already registered. Please sign in instead.");
      return;
    }

    const user: StoredUser = {
      id: `vip-${Date.now()}`,
      name: cn,
      email: ce,
      phone: cp || undefined,
      password,
      role: "customer",
      tier: "Private Atelier",
    };

    localStorage.setItem(USERS_KEY, JSON.stringify([...allUsers, user]));
    const { password: _, ...safe } = user;
    await ensureCustomerRemote(safe);
    onAuthenticated(saveSession(safe));
  };

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

      <section className={`relative z-10 mx-auto grid gap-10 ${compact ? "max-w-[460px] p-0" : "min-h-screen max-w-[1500px] px-6 py-8 md:px-12 lg:grid-cols-[1fr_480px] lg:items-center"}`}>
        {/* Left brand panel */}
        {!compact && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }} className="flex min-h-[45vh] flex-col justify-between">
            <a href={import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL} aria-label="Follocia home" className="w-fit">
              <BrandLogo imageClassName="h-40 w-40" />
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
        )}

        {/* Login form card with 3D entrance */}
        <motion.form
          initial={{ opacity: 0, y: 30, rotateY: compact ? 0 : -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1, x: shake ? [0, -8, 8, -6, 6, 0] : 0 }}
          transition={{ duration: 0.8, delay: compact ? 0 : 0.2, ease }}
          style={{ perspective: 1200 }}
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (mode === "register") void register();
            else void authenticate();
          }}
          className={`border border-[var(--ink)]/10 bg-[var(--bone)] px-6 py-8 text-[var(--ink)] shadow-[var(--shadow-luxe)] rounded-2xl md:px-8 md:py-9 ${compact ? "w-full" : ""}`}
        >
          {/* Role toggle with animated indicator */}
          <div className="relative flex gap-0 border border-[var(--ink)]/10 p-1 rounded-xl bg-black/5">
            <motion.div
              layoutId="role-indicator"
              className="absolute inset-y-1 z-0 bg-[var(--ink)] rounded-lg"
              style={{
                width: "calc(50% - 4px)",
                left: role === "customer" ? "4px" : "calc(50% + 0px)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            {(["customer", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setMode("login");
                  setError("");
                }}
                className={`relative z-10 flex-1 px-4 py-2.5 eyebrow text-xs transition-colors duration-300 cursor-pointer ${
                  role === r ? "text-[var(--bone)] font-semibold" : "text-[var(--ink)]/55 hover:text-[var(--ink)]"
                }`}
              >
                {r === "customer" ? "Customer" : "Admin"}
              </button>
            ))}
          </div>

          <div className="mt-7">
            <p className="eyebrow text-[var(--gold)]">
              {mode === "register" ? "Create Account" : "Secure Sign In"}
            </p>
            <AnimatePresence mode="wait">
              <motion.h2
                key={`${mode}-${role}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-2 font-display text-[#24130d] ${compact ? "text-3xl" : "text-4xl"}`}
              >
                {mode === "register"
                  ? "Join Private Atelier"
                  : role === "admin"
                  ? "Maison Admin"
                  : "Welcome Back"}
              </motion.h2>
            </AnimatePresence>
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "register" ? (
              <>
                <label className="grid gap-1.5">
                  <span className="eyebrow text-[11px] text-[var(--ink)]/55">Full name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    required
                    className="border border-[var(--ink)]/15 bg-white/70 px-4 py-3 text-sm rounded-lg outline-none transition-all duration-300 focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="eyebrow text-[11px] text-[var(--ink)]/55">Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    required
                    className="border border-[var(--ink)]/15 bg-white/70 px-4 py-3 text-sm rounded-lg outline-none transition-all duration-300 focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="eyebrow text-[11px] text-[var(--ink)]/55">Mobile number</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="border border-[var(--ink)]/15 bg-white/70 px-4 py-3 text-sm rounded-lg outline-none transition-all duration-300 focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="eyebrow text-[11px] text-[var(--ink)]/55">Password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full border border-[var(--ink)]/15 bg-white/70 px-4 py-3 pr-10 text-sm rounded-lg outline-none transition-all duration-300 focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink)]/50 hover:text-[var(--ink)] cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </>
            ) : (
              <>
                <label className="grid gap-1.5">
                  <span className="eyebrow text-[11px] text-[var(--ink)]/55">
                    {role === "admin" ? "Email or Mobile Number" : "Email or Phone Number"}
                  </span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      role === "admin"
                        ? "e.g. admin@follocia.com or 9876543210"
                        : "e.g. client@follocia.com or 9876543211"
                    }
                    required
                    className="border border-[var(--ink)]/15 bg-white/70 px-4 py-3.5 text-sm rounded-lg outline-none transition-all duration-300 focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="eyebrow text-[11px] text-[var(--ink)]/55">Password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full border border-[var(--ink)]/15 bg-white/70 px-4 py-3.5 pr-10 text-sm rounded-lg outline-none transition-all duration-300 focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink)]/50 hover:text-[var(--ink)] cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 rounded-lg border border-red-900/20 bg-red-900/5 px-4 py-3 text-xs font-medium text-red-900"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="magnetic-btn mt-6 w-full rounded-xl bg-[var(--ink)] px-5 py-3.5 eyebrow text-xs text-[var(--bone)] transition-all duration-500 hover:bg-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[var(--shadow-gold-glow)] cursor-pointer"
          >
            {mode === "register" ? "Create Account" : "Enter Follocia"}
          </button>

          {role === "customer" && (
            <button
              type="button"
              onClick={() => {
                setMode((v) => (v === "login" ? "register" : "login"));
                setError("");
              }}
              className="mt-5 w-full text-center text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              {mode === "login" ? "Create new account" : "Already have an account? Sign in"}
            </button>
          )}

          <div className="mt-5 border-t border-[var(--ink)]/10 pt-3 text-center">
            {role === "admin" ? (
              <button
                type="button"
                onClick={() => {
                  setIdentifier("admin@follocia.com");
                  setPassword("Admin@123");
                  setError("");
                }}
                className="text-[11px] text-[var(--ink)]/60 hover:text-[var(--gold)] cursor-pointer transition-colors"
                title="Click to auto-fill admin credentials"
              >
                Admin access: <span className="font-semibold underline">admin@follocia.com</span> or <span className="font-semibold underline">9876543210</span> · Pass: <span className="font-semibold">Admin@123</span> (tap to fill)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIdentifier("client@follocia.com");
                  setPassword("Client@123");
                  setError("");
                }}
                className="text-[11px] text-[var(--ink)]/60 hover:text-[var(--gold)] cursor-pointer transition-colors"
                title="Click to auto-fill client credentials"
              >
                Client access: <span className="font-semibold underline">client@follocia.com</span> or <span className="font-semibold underline">9876543211</span> · Pass: <span className="font-semibold">Client@123</span> (tap to fill)
              </button>
            )}
          </div>
        </motion.form>
      </section>
    </main>
  );
}
