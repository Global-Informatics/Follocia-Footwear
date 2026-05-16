import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ensureCustomerRemote } from "@/lib/commerceStore";
import { BrandLogo } from "@/components/BrandLogo";

export type UserRole = "admin" | "customer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier: string;
};

export type AuthSession = {
  user: AuthUser;
  createdAt: string;
};

type StoredUser = AuthUser & { password: string };

type AuthGatewayProps = {
  intent?: UserRole;
  compact?: boolean;
  onAuthenticated: (session: AuthSession) => void;
};

const USERS_KEY = "follocia_users";
const SESSION_KEY = "follocia_session";

const demoUsers: StoredUser[] = [
  { id: "adm-001", name: "Maison Admin", email: "admin@follocia.com", password: "Admin@123", role: "admin", tier: "Operations" },
  { id: "vip-001", name: "Ananya Sharma", email: "client@follocia.com", password: "Client@123", role: "customer", tier: "Private Atelier" },
];

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getUsers() {
  const users = parseJson<StoredUser[]>(localStorage.getItem(USERS_KEY), []);
  if (users.length > 0) return users;
  localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
  return demoUsers;
}

function saveSession(user: AuthUser) {
  const session = { user, createdAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readAuthSession() {
  if (typeof window === "undefined") return null;
  return parseJson<AuthSession | null>(localStorage.getItem(SESSION_KEY), null);
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function AuthGateway({ intent = "customer", compact = false, onAuthenticated }: AuthGatewayProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<UserRole>(intent);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(intent === "admin" ? "admin@follocia.com" : "client@follocia.com");
  const [password, setPassword] = useState(intent === "admin" ? "Admin@123" : "Client@123");
  const [error, setError] = useState("");

  const copy = useMemo(
    () =>
      role === "admin"
        ? {
            eyebrow: "Maison control",
            title: "Admin access for scarce drop operations.",
            body: "Manage limited editions, reservations, VIP approvals, concierge tasks and launch inventory.",
          }
        : {
            eyebrow: "Private atelier",
            title: "Member access before the collection opens.",
            body: "Enter the private storefront, reserve rare pairs, manage fittings and keep your collector profile ready.",
          },
    [role],
  );

  const authenticate = async (selectedEmail = email, selectedPassword = password, selectedRole = role) => {
    const users = getUsers();
    const user = users.find(
      (item) =>
        item.email.toLowerCase() === selectedEmail.trim().toLowerCase() &&
        item.password === selectedPassword &&
        item.role === selectedRole,
    );

    if (!user) {
      setError("Access details match nahi ho rahe. Role, email aur password check karo.");
      return;
    }

    const { password: _password, ...safeUser } = user;
    if (safeUser.role === "customer") await ensureCustomerRemote(safeUser);
    onAuthenticated(saveSession(safeUser));
  };

  const register = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanName || !cleanEmail || password.length < 6) {
      setError("Name, email aur minimum 6 character password required hai.");
      return;
    }

    const users = getUsers();
    if (users.some((user) => user.email.toLowerCase() === cleanEmail)) {
      setError("Ye email already registered hai. Login use karo.");
      return;
    }

    const user: StoredUser = {
      id: `vip-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password,
      role: "customer",
      tier: "Private Atelier",
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    const { password: _password, ...safeUser } = user;
    await ensureCustomerRemote(safeUser);
    onAuthenticated(saveSession(safeUser));
  };

  const useDemo = (selectedRole: UserRole) => {
    const user = demoUsers.find((item) => item.role === selectedRole)!;
    setRole(selectedRole);
    setMode("login");
    setEmail(user.email);
    setPassword(user.password);
    setError("");
  };

  return (
    <main className={`relative overflow-hidden text-[var(--bone)] luxe-grain ${compact ? "bg-transparent" : "min-h-screen bg-[var(--ink)]"}`}>
      {!compact && <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,oklch(0.78_0.12_80_/_0.22),transparent_26rem)]" />}
      <section className={`relative mx-auto grid gap-10 ${compact ? "max-w-[480px] p-0" : "min-h-screen max-w-[1500px] px-6 py-8 md:px-12 lg:grid-cols-[1fr_480px] lg:items-center"}`}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className={`${compact ? "hidden" : "flex min-h-[45vh] flex-col justify-between"}`}>
          <a href={import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL} aria-label="Follocia home" className="w-fit">
            <BrandLogo imageClassName="h-24 w-24 border border-white/10" />
          </a>
          <div className="max-w-4xl">
            <p className="eyebrow text-[var(--gold)]">{copy.eyebrow}</p>
            <h1 className="mt-6 font-display text-[clamp(4rem,10vw,9.5rem)] leading-[0.86] text-balance">{copy.title}</h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--bone)]/65">{copy.body}</p>
          </div>
          <div className="hidden gap-3 text-[var(--bone)]/55 md:flex">
            {["Limited annual pairs", "VIP reservations", "White-glove dispatch"].map((item) => (
              <span key={item} className="border border-[var(--bone)]/12 px-4 py-3 eyebrow">{item}</span>
            ))}
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            if (mode === "register") void register();
            else void authenticate();
          }}
          className={`border border-[var(--bone)]/12 bg-[var(--bone)] px-5 py-6 text-[var(--ink)] shadow-[var(--shadow-luxe)] md:px-8 md:py-8 ${compact ? "w-full" : ""}`}
        >
          <div className="flex gap-2 border border-[var(--ink)]/10 p-1">
            {(["customer", "admin"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setRole(item);
                  setMode("login");
                  useDemo(item);
                }}
                className={`flex-1 px-4 py-3 eyebrow transition-colors ${role === item ? "bg-[var(--ink)] text-[var(--bone)]" : "text-[var(--ink)]/55 hover:bg-[var(--ink)]/5"}`}
              >
                {item === "customer" ? "Customer" : "Admin"}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <p className="eyebrow text-[var(--gold)]">{mode === "register" ? "Create account" : "Secure sign in"}</p>
            <h2 className={`mt-3 font-display ${compact ? "text-4xl" : "text-5xl"}`}>{mode === "register" ? "Join Private Atelier" : role === "admin" ? "Maison Admin" : "Welcome Back"}</h2>
          </div>

          <div className="mt-8 grid gap-4">
            {mode === "register" && (
              <label className="grid gap-2">
                <span className="eyebrow text-[var(--ink)]/45">Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="border border-[var(--ink)]/15 bg-transparent px-4 py-4 outline-none focus:border-[var(--gold)]" />
              </label>
            )}
            <label className="grid gap-2">
              <span className="eyebrow text-[var(--ink)]/45">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="border border-[var(--ink)]/15 bg-transparent px-4 py-4 outline-none focus:border-[var(--gold)]" />
            </label>
            <label className="grid gap-2">
              <span className="eyebrow text-[var(--ink)]/45">Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="border border-[var(--ink)]/15 bg-transparent px-4 py-4 outline-none focus:border-[var(--gold)]" />
            </label>
          </div>

          {error && <p className="mt-4 border border-red-900/20 bg-red-900/5 px-4 py-3 text-sm font-medium text-red-900">{error}</p>}

          <button type="submit" className="mt-6 w-full bg-[var(--ink)] px-5 py-4 eyebrow text-[var(--bone)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">
            {mode === "register" ? "Create Account" : "Enter Follocia"}
          </button>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => useDemo("customer")} className="border border-[var(--ink)]/12 px-3 py-3 eyebrow text-[var(--ink)]/60 hover:border-[var(--gold)] hover:text-[var(--ink)]">
              Demo Client
            </button>
            <button type="button" onClick={() => useDemo("admin")} className="border border-[var(--ink)]/12 px-3 py-3 eyebrow text-[var(--ink)]/60 hover:border-[var(--gold)] hover:text-[var(--ink)]">
              Demo Admin
            </button>
          </div>

          {role === "customer" && (
            <button
              type="button"
              onClick={() => {
                setMode((value) => (value === "login" ? "register" : "login"));
                setError("");
              }}
              className="mt-5 w-full text-center text-sm font-semibold text-[var(--ink)]/60 hover:text-[var(--ink)]"
            >
              {mode === "login" ? "New collector account create karo" : "Existing account se login karo"}
            </button>
          )}
        </motion.form>
      </section>
    </main>
  );
}
