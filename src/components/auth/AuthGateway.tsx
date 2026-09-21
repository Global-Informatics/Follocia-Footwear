import { motion } from "framer-motion";
import { useState, useRef, useEffect, useMemo, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { ensureCustomerRemote } from "@/lib/commerceStore";
import logo from "@/assets/follocia-logo-new.png";

export type UserRole = "admin" | "customer";
export type AuthUser = { id: string; name: string; email: string; phone?: string; role: UserRole; tier: string };
export type AuthSession = { user: AuthUser; createdAt: string };
export type StoredUser = AuthUser & { password: string };
export type AuthGatewayProps = {
  intent?: UserRole;
  compact?: boolean;
  onClose?: () => void;
  onAuthenticated: (session: AuthSession) => void;
};

const USERS_KEY = "follocia_users";
const SESSION_KEY = "follocia_session";
const ADMIN_PIN_KEY = "follocia_admin_pin";

export function getAdminPin(): string {
  if (typeof window === "undefined") return "1234";
  return localStorage.getItem(ADMIN_PIN_KEY) || "1234";
}

export function setAdminPin(pin: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_PIN_KEY, pin);
  }
}

const demoUsers: StoredUser[] = [
  { id: "adm-001", name: "Follicia Admin", email: "admin@follicia.com", phone: "9876543210", password: "Admin@123", role: "admin", tier: "Operations" },
  { id: "vip-001", name: "Ananya Sharma", email: "client@follicia.com", phone: "9876543211", password: "Client@123", role: "customer", tier: "Follicia Private" },
];

function parseJson<T>(v: string | null, fb: T): T {
  if (!v) return fb;
  try { return JSON.parse(v) as T; } catch { return fb; }
}

export function getUsers(): StoredUser[] {
  const stored = parseJson<StoredUser[]>(localStorage.getItem(USERS_KEY), []);
  const userMap = new Map<string, StoredUser>();
  for (const u of demoUsers) {
    userMap.set(u.email.toLowerCase(), u);
  }
  for (const u of stored) {
    if (u && u.email && !userMap.has(u.email.toLowerCase())) {
      if (u.tier === "Private Footwear") {
        u.tier = "Follicia Member";
      }
      userMap.set(u.email.toLowerCase(), u);
    }
  }
  const result = Array.from(userMap.values());
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(result));
  } catch {
    // ignore quota
  }
  return result;
}

export function saveSession(user: AuthUser): AuthSession {
  if (user && user.tier === "Private Footwear") {
    user.tier = "Follicia Member";
  }
  const s = { user, createdAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const sess = parseJson<AuthSession | null>(localStorage.getItem(SESSION_KEY), null);
  if (sess && sess.user && sess.user.tier === "Private Footwear") {
    sess.user.tier = "Follicia Member";
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    } catch {
      // ignore
    }
  }
  return sess;
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

type AuthStage = "email" | "otp" | "details" | "password_login" | "forgot_password" | "signup";

export function AuthGateway({ intent = "customer", compact = false, onClose, onAuthenticated }: AuthGatewayProps) {
  const [stage, setStage] = useState<AuthStage>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  // Detect admin email
  const isAdminInput = useMemo(() => {
    const t = email.trim().toLowerCase();
    return t === "admin" || t.startsWith("admin@") || t.includes("admin@");
  }, [email]);

  // 6-digit OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(45);
  const [timerActive, setTimerActive] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: number | undefined;
    if (timerActive && otpTimer > 0) {
      interval = window.setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, otpTimer]);

  const dispatchEmailOtp = async (targetEmail: string): Promise<boolean> => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpTimer(45);
    setTimerActive(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const res = await fetch("/api/commerce/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (res.ok && (!data || data.success !== false)) {
        setSuccessMsg(data?.message || `A 6-digit verification code has been dispatched to ${targetEmail}. Please check your inbox or spam folder.`);
        setLoading(false);
        return true;
      } else {
        const errorMsg = data?.message || `Unable to send verification OTP (Status ${res.status}). Please check your email and try again.`;
        setError(errorMsg);
        setLoading(false);
        return false;
      }
    } catch (err: any) {
      setError(
        err?.name === "AbortError"
          ? "Request timed out while sending OTP email. Please check your network connection and try again."
          : "Unable to reach the verification service. Please verify your connection and try again."
      );
      setLoading(false);
      return false;
    }
  };

  // Step 1: Submit Email (or Admin Direct Auth with Password + PIN)
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanIdentifier = email.trim().toLowerCase();
    if (!cleanIdentifier) {
      setError("Please enter your Email ID to continue.");
      return;
    }

    // Direct check for admin email with Password only
    if (cleanIdentifier === "admin" || cleanIdentifier.startsWith("admin@") || cleanIdentifier.includes("admin@")) {
      const trimmedPw = password.trim();

      if (!trimmedPw) {
        setError("Please enter the Admin Password.");
        return;
      }

      const isPasswordValid =
        trimmedPw === "Admin@123" ||
        trimmedPw.toLowerCase() === "admin@123" ||
        trimmedPw.toLowerCase() === "admin123" ||
        trimmedPw.toLowerCase() === "admin";

      if (isPasswordValid) {
        setLoading(true);
        const adminUser: AuthUser = {
          id: "adm-001",
          name: "Follicia Admin",
          email: cleanIdentifier.includes("@") ? cleanIdentifier : "admin@follicia.com",
          phone: "9876543210",
          role: "admin",
          tier: "Operations",
        };
        const session = saveSession(adminUser);
        window.location.hash = "/admin";
        onAuthenticated(session);
        return;
      }

      setError("Invalid Admin Password. Please try again.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanIdentifier)) {
      setError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    const sent = await dispatchEmailOtp(cleanIdentifier);
    if (!sent) {
      return;
    }
    setStage("otp");
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 100);
  };

  // OTP inputs handling
  const handleOtpChange = (value: string, index: number) => {
    const cleanDigits = value.replace(/\D/g, "");

    // Mobile autofill or multi-digit paste
    if (cleanDigits.length > 1) {
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (cleanDigits[i]) {
          nextDigits[i] = cleanDigits[i];
        }
      }
      setOtpDigits(nextDigits);
      setError("");
      const focusIndex = Math.min(cleanDigits.length, 5);
      otpInputsRef.current[focusIndex]?.focus();
      return;
    }

    const cleanDigit = cleanDigits.slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = cleanDigit;
    setOtpDigits(nextDigits);
    setError("");

    // Auto advance to next box
    if (cleanDigit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = "";
        setOtpDigits(nextDigits);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        const nextDigits = [...otpDigits];
        nextDigits[index] = "";
        setOtpDigits(nextDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;
    const nextDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pastedData[i] || "";
    }
    setOtpDigits(nextDigits);
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[focusIndex]?.focus();
  };

  // Step 2: Verify OTP
  const handleOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code sent to your email.");
      return;
    }

    setLoading(true);
    setError("");

    let isVerified = false;
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch("/api/commerce/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: enteredOtp }),
      });

      if (res.ok) {
        isVerified = true;
      } else {
        const data = await res.json().catch(() => null);
        if (data && data.message) {
          setError(`❌ ${data.message}`);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Backend not running / static preview
    }

    if (!isVerified) {
      setError("❌ Incorrect OTP code. The code entered does not match the 6-digit OTP sent to your email. Please check your inbox and try again.");
      setLoading(false);
      return;
    }

    setError("");
    setLoading(false);

    // If in forgot password flow, move to reset password stage
    if (stage === "forgot_password") {
      return;
    }

    // Check if user already exists
    const allUsers = getUsers();
    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      setLoading(true);
      const { password: _, ...safe } = existing;
      if (safe.role === "customer") await ensureCustomerRemote(safe);
      const session = saveSession(safe);
      if (safe.role === "admin") {
        window.location.hash = "/admin";
      } else {
        window.location.hash = "/account/my-orders";
      }
      onAuthenticated(session);
    } else if (stage === "signup" && (firstName.trim() || lastName.trim())) {
      setLoading(true);
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || cleanEmail.split("@")[0];
      const newUser: StoredUser = {
        id: `vip-${Date.now()}`,
        name: fullName,
        email: cleanEmail,
        phone: phone.trim() || undefined,
        password: "",
        role: "customer",
        tier: "Follicia Member",
      };
      localStorage.setItem(USERS_KEY, JSON.stringify([...allUsers, newUser]));
      const { password: _, ...safe } = newUser;
      await ensureCustomerRemote(safe);
      const session = saveSession(safe);
      window.location.hash = "/account/my-orders";
      onAuthenticated(session);
    } else {
      setStage("details");
    }
  };

  // Step 3: Complete registration / profile with First Name & Last Name (Passwordless)
  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!fn || !ln) {
      setError("Please enter both First Name and Last Name.");
      return;
    }

    setLoading(true);
    const fullName = `${fn} ${ln}`;
    const cleanEmail = email.trim().toLowerCase();

    const allUsers = getUsers();
    const newUser: StoredUser = {
      id: `vip-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      phone: phone.trim() || undefined,
      password: "",
      role: "customer",
      tier: "Follicia Member",
    };

    localStorage.setItem(USERS_KEY, JSON.stringify([...allUsers, newUser]));
    const { password: _, ...safe } = newUser;
    await ensureCustomerRemote(safe);
    const session = saveSession(safe);
    window.location.hash = "/account/my-orders";
    onAuthenticated(session);
  };

  // Password Login Submit
  const handlePasswordLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const term = email.trim().toLowerCase();
    const pw = password.trim();

    if (!term || !pw) {
      setError("Please enter your Email ID and Password.");
      return;
    }

    if (
      (term === "admin@follicia.com" || term === "admin@follocia.com" || term === "admin") &&
      (pw === "Admin@123" || pw.toLowerCase() === "admin@123" || pw.toLowerCase() === "admin")
    ) {
      const adminUser: AuthUser = {
        id: "adm-001",
        name: "Follicia Admin",
        email: "admin@follicia.com",
        phone: "9876543210",
        role: "admin",
        tier: "Operations",
      };
      const session = saveSession(adminUser);
      window.location.hash = "/admin";
      onAuthenticated(session);
      return;
    }

    const allUsers = getUsers();
    const matched = allUsers.find(
      (u) =>
        u.email.toLowerCase() === term &&
        (u.password === pw || u.password.toLowerCase() === pw.toLowerCase())
    );

    if (matched) {
      const { password: _, ...safe } = matched;
      if (safe.role === "customer") await ensureCustomerRemote(safe);
      const session = saveSession(safe);
      if (safe.role === "admin") {
        window.location.hash = "/admin";
      } else {
        window.location.hash = "/account/my-orders";
      }
      onAuthenticated(session);
      return;
    }

    setError("Invalid email or password. Please try again or log in with OTP.");
  };

  // Reset Password Submit
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code sent to your email.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let isOtpValid = false;

    try {
      const res = await fetch("/api/commerce/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: enteredOtp }),
      });
      if (res.ok) {
        isOtpValid = true;
      }
    } catch {
      // offline fallback
    }

    if (!isOtpValid) {
      setError("❌ Invalid OTP code. The OTP does not match the code sent to your email. Password reset denied.");
      return;
    }

    const pw = password.trim();
    if (pw.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (pw !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    const allUsers = getUsers();
    let target = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!target) {
      target = {
        id: `vip-${Date.now()}`,
        name: cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        email: cleanEmail,
        password: pw,
        role: "customer",
        tier: "Follicia Member",
      };
      allUsers.push(target);
    } else {
      target.password = pw;
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    setSuccessMsg("Password successfully reset!");
    const { password: _, ...safe } = target;
    await ensureCustomerRemote(safe);
    const session = saveSession(safe);
    setTimeout(() => {
      onAuthenticated(session);
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      transition={{ duration: 0.3 }}
      className="relative w-full max-w-[420px] rounded-3xl bg-white text-[#24130d] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] border border-[#4b261a15] p-6 sm:p-7 overflow-hidden font-sans"
    >
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-base font-light text-[#4b261a60] hover:bg-[#4b261a10] hover:text-[#24130d] transition-colors cursor-pointer z-20"
        >
          ✕
        </button>
      )}

      {/* Header with Follicia Brand Logo */}
      <div className="text-center pt-1 pb-3 border-b border-[#4b261a10] flex flex-col items-center">
        <img
          src={logo}
          alt="FOLLICIA - Every Step, A Statement."
          className="h-16 sm:h-20 w-auto max-w-[200px] object-contain mx-auto transition-transform duration-300 hover:scale-105"
        />
      </div>

      {/* Error notification */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
          <span className="text-sm leading-none">⚠️</span>
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Success notification (for stages other than otp) */}
      {successMsg && stage !== "otp" && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-start gap-2">
          <span className="text-sm leading-none">✓</span>
          <span className="flex-1">{successMsg}</span>
        </div>
      )}

      {/* STAGE 1: Email Input */}
      {stage === "email" && (
        <form onSubmit={handleEmailSubmit} autoComplete="off" className="mt-5 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#24130d] tracking-tight">
              {isAdminInput ? "Follicia Administrator Access" : "Log in for the best experience"}
            </h2>
            <p className="text-xs sm:text-sm text-[#4b261a80] mt-1">
              {isAdminInput ? "Enter admin password to continue" : "Enter your Email ID to continue"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#24130d] mb-1.5">
              Email ID
            </label>
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Enter your Email ID"
              className="w-full px-4 py-3 rounded-xl border border-[#4b261a25] bg-white text-sm font-medium text-[#24130d] placeholder:text-[#4b261a50] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none transition-all shadow-2xs"
              autoFocus
            />



          </div>

          {/* Admin Password input if admin email entered */}
          {isAdminInput && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-1.5"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#24130d]">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 pr-14 rounded-xl border border-[#4b261a25] bg-white text-sm font-medium text-[#24130d] placeholder:text-[#4b261a50] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#4b261a80] hover:text-[#24130d] cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Legal Terms Disclaimer */}
          <p className="text-[11px] leading-relaxed text-[#4b261a80] pt-1">
            By continuing, you confirm that you are above 18 years of age, and you agree to Follicia's{" "}
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className="text-[#a87648] hover:text-[#24130d] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Terms of Use
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className="text-[#a87648] hover:text-[#24130d] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </p>

          {/* Continue / Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-[#24130d] hover:bg-[#381e14] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>Sending Code...</span>
              </>
            ) : (
              isAdminInput ? "Submit Admin Login" : "Continue"
            )}
          </button>

          {loading && !isAdminInput && (
            <p className="text-center text-xs text-[#a87648] font-medium animate-pulse">
              Sending 6-digit code to {email}...
            </p>
          )}

          {/* Sign Up / Create new account */}
          <div className="pt-4 border-t border-[#4b261a15] text-center">
            <p className="text-xs text-[#4b261a80]">
              New to Follicia?{" "}
              <button
                type="button"
                onClick={() => setStage("signup")}
                className="font-bold text-[#a87648] hover:text-[#24130d] hover:underline cursor-pointer transition-colors"
              >
                Sign up / Create your new account
              </button>
            </p>
          </div>
        </form>
      )}

      {/* STAGE 2: 6-Digit OTP Verification */}
      {stage === "otp" && (
        <form onSubmit={handleOtpVerify} className="mt-5 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#24130d] tracking-tight">
              Verify with OTP
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-[#4b261a80]">
                Code sent to <span className="font-semibold text-[#24130d]">{email}</span>
              </p>
              <button
                type="button"
                onClick={() => setStage("email")}
                className="text-xs font-semibold text-[#a87648] hover:text-[#24130d] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          {/* Notification box */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#4b261a15] text-xs text-[#24130d] shadow-2xs flex items-center gap-2">
            <span className="text-sm shrink-0">📧</span>
            <p className="text-[11px] sm:text-xs text-[#4b261a80] truncate">
              Code sent to <strong className="text-[#24130d] font-semibold">{email}</strong> — check inbox or spam.
            </p>
          </div>

          {/* 6 Individual Digit Input Boxes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#24130d] mb-1.5">
              Enter 6-Digit Verification Code
            </label>
            <div className="flex justify-between gap-1.5 sm:gap-2 my-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputsRef.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={6}
                  value={otpDigits[index] || ""}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={handleOtpPaste}
                  className="w-10 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold rounded-xl border-2 border-[#4b261a20] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white transition-all shadow-2xs font-mono"
                />
              ))}
            </div>
          </div>

          {/* Resend OTP info */}
          <div className="flex justify-between items-center text-xs">
            {timerActive ? (
              <span className="text-[#4b261a60]">Resend code in <strong className="text-[#24130d]">{otpTimer}s</strong></span>
            ) : (
              <button
                type="button"
                onClick={() => dispatchEmailOtp(email.trim().toLowerCase())}
                className="font-bold text-[#a87648] hover:text-[#24130d] hover:underline cursor-pointer"
              >
                Resend OTP
              </button>
            )}
            <span className="text-[11px] text-[#4b261a60]">Direct Email Dispatch</span>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-[#24130d] hover:bg-[#381e14] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              "Verify & Continue"
            )}
          </button>
        </form>
      )}

      {/* STAGE 3: Details & Password */}
      {stage === "details" && (
        <form onSubmit={handleDetailsSubmit} className="mt-5 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#24130d] tracking-tight">
              Complete Your Account
            </h2>
            <p className="text-xs text-[#4b261a80] mt-1">
              Email <span className="font-semibold text-[#24130d]">{email}</span> verified. Enter your details to complete your account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ananya"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white transition-all shadow-2xs"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white transition-all shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-[#24130d] hover:bg-[#381e14] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            {loading ? "Creating Account..." : "Complete Account & Sign In"}
          </button>
        </form>
      )}

      {/* STAGE 4: Direct Password Login */}
      {stage === "password_login" && (
        <form onSubmit={handlePasswordLoginSubmit} className="mt-5 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#24130d] tracking-tight">
              Log in with Password
            </h2>
            <p className="text-xs text-[#4b261a80] mt-1">
              Enter your password to access your Follicia profile
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
              Email ID *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white transition-all shadow-2xs"
              autoFocus
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d]">
                Password *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs text-[#4b261a70] hover:text-[#24130d] cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={async () => {
                const targetEmail = email.trim().toLowerCase();
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(targetEmail)) {
                  setError("Please enter your valid Email ID first to reset password.");
                  return;
                }
                await dispatchEmailOtp(targetEmail);
                setStage("forgot_password");
              }}
              className="text-xs font-semibold text-[#a87648] hover:text-[#24130d] hover:underline cursor-pointer transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-[#24130d] hover:bg-[#381e14] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            Log In
          </button>

          <div className="pt-4 border-t border-[#4b261a15] flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setStage("email")}
              className="text-[#a87648] font-semibold hover:text-[#24130d] hover:underline cursor-pointer"
            >
              ← Log in with OTP instead
            </button>
            <button
              type="button"
              onClick={() => setStage("signup")}
              className="text-[#4b261a80] hover:text-[#24130d] cursor-pointer font-medium"
            >
              Create new account
            </button>
          </div>
        </form>
      )}

      {/* STAGE 5: Forgot Password */}
      {stage === "forgot_password" && (
        <form onSubmit={handleResetPasswordSubmit} className="mt-5 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#24130d] tracking-tight">
              Reset Your Password
            </h2>
            <p className="text-xs text-[#4b261a80] mt-1">
              Enter the 6-digit OTP code sent to <strong className="text-[#24130d]">{email}</strong> and set your new password.
            </p>
          </div>

          {/* Email Notification Banner */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#4b261a15] text-xs text-[#24130d] shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-lg">📧</span>
              <div className="flex-1">
                <p className="font-bold text-[#24130d]">Password Reset Code Dispatched</p>
                <p className="text-[11px] text-[#4b261a80] mt-0.5 leading-relaxed">
                  We've sent a 6-digit reset code to <strong className="text-[#24130d]">{email}</strong>. Please check your inbox or spam folder.
                </p>
              </div>
            </div>
          </div>

          {/* 6 Individual Digit Boxes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1.5">
              Enter 6-Digit OTP *
            </label>
            <div className="flex justify-between gap-1.5 sm:gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputsRef.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otpDigits[index] || ""}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={handleOtpPaste}
                  className="w-10 h-12 text-center text-lg font-bold rounded-xl border-2 border-[#4b261a20] focus:border-[var(--gold)] outline-none text-[#24130d] bg-white font-mono shadow-2xs"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white shadow-2xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-[#24130d] hover:bg-[#381e14] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            Reset Password &amp; Log In
          </button>

          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={() => setStage("email")}
              className="text-xs text-[#4b261a70] hover:text-[#24130d] cursor-pointer"
            >
              ← Back to login
            </button>
          </div>
        </form>
      )}

      {/* STAGE 6: Sign Up / Create New Account */}
      {stage === "signup" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const cleanEmail = email.trim().toLowerCase();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!firstName.trim() || !lastName.trim() || !cleanEmail) {
              setError("Please enter your full name and email address.");
              return;
            }
            if (!emailPattern.test(cleanEmail)) {
              setError("Please enter a valid email address.");
              return;
            }
            await dispatchEmailOtp(cleanEmail);
            setStage("otp");
            setTimeout(() => {
              otpInputsRef.current[0]?.focus();
            }, 100);
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#24130d] tracking-tight">
              Create Your New Account
            </h2>
            <p className="text-xs text-[#4b261a80] mt-1">
              Join Follicia Private Access for bespoke handcrafted luxury
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white shadow-2xs"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#24130d] mb-1">
              Email ID *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#4b261a25] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none text-[#24130d] bg-white shadow-2xs"
            />
          </div>

          {/* Legal Terms Disclaimer */}
          <p className="text-[11px] leading-relaxed text-[#4b261a80]">
            By registering, you confirm that you are above 18 years of age, and you agree to Follicia's{" "}
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className="text-[#a87648] hover:text-[#24130d] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Terms of Use
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className="text-[#a87648] hover:text-[#24130d] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </p>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-[#24130d] hover:bg-[#381e14] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            Verify with OTP &amp; Sign Up
          </button>

          <div className="pt-4 border-t border-[#4b261a15] text-center">
            <p className="text-xs text-[#4b261a80]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setStage("email")}
                className="font-bold text-[#a87648] hover:text-[#24130d] hover:underline cursor-pointer transition-colors"
              >
                Log in
              </button>
            </p>
          </div>
        </form>
      )}

      {/* In-Modal Legal Content Viewer for Terms of Use & Privacy Policy */}
      {legalModal && (
        <div className="absolute inset-0 z-40 bg-[#fffaf0] p-6 sm:p-7 flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex items-start justify-between pb-3 border-b border-[#4b261a]/15 shrink-0">
            <div>
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[var(--gold)] block">
                {legalModal === "terms" ? "Boutique Client Agreement" : "Confidentiality & Client Vows"}
              </span>
              <h3 className="font-serif text-2xl font-normal text-[var(--ink)] mt-0.5">
                {legalModal === "terms" ? "Terms of Use" : "Privacy Policy"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLegalModal(null)}
              className="w-8 h-8 rounded-full border border-[#4b261a]/20 hover:bg-[#4b261a]/10 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors text-base cursor-pointer shrink-0 ml-2"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Quick tab switcher */}
          <div className="flex gap-2 py-3 shrink-0">
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide transition-colors cursor-pointer ${
                legalModal === "terms"
                  ? "bg-[#351c13] text-[#fffaf0]"
                  : "bg-white border border-[#4b261a]/15 text-[var(--ink)]/70 hover:text-[var(--ink)]"
              }`}
            >
              Terms of Use
            </button>
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide transition-colors cursor-pointer ${
                legalModal === "privacy"
                  ? "bg-[#351c13] text-[#fffaf0]"
                  : "bg-white border border-[#4b261a]/15 text-[var(--ink)]/70 hover:text-[var(--ink)]"
              }`}
            >
              Privacy Policy
            </button>
          </div>

          {/* Scrollable Terms & Privacy Policy Content */}
          <div className="flex-1 overflow-y-auto pr-1.5 text-xs text-[var(--ink)]/80 space-y-4 py-2 leading-relaxed custom-scrollbar">
            {legalModal === "terms" ? (
              <>
                <div className="bg-[#f7efe3] p-3 rounded border-l-2 border-[var(--gold)] text-[var(--ink)]/90">
                  <p className="font-medium">
                    These terms govern the reservation, purchase, bespoke consultation, and white-glove delivery of Follicia footwear.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">1. Eligibility &amp; Age Requirement</h4>
                  <p>By creating an account, reserving an edition, or using this digital boutique, you confirm that you are at least 18 years of age and legally competent to enter into binding agreements.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">2. Limited Numbered Editions</h4>
                  <p>Every Follicia footwear silhouette is released in strictly limited numbered batches and never mass-reissued. Placing an order confirms that sizing details, delivery destination, and payment credentials will be verified by our Follicia concierge.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">3. Pricing, Taxes &amp; Payment Security</h4>
                  <p>All prices, applicable GST/VAT, and insured delivery tariffs are confirmed prior to order authorization. Transactions are processed through encrypted payment gateways with two-factor authentication.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">4. White-Glove Delivery &amp; Sizing Exchanges</h4>
                  <p>Deliveries are handled by insured luxury courier partners. We provide complimentary size exchanges and returns for unworn footwear in original packaging with physical numbered parchment certificates intact within 14 days.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">5. Proprietary Rights &amp; Intellectual Property</h4>
                  <p>All trademarks, designs, sculptural shoe silhouettes, campaign imagery, and branding belong exclusively to Follicia. Unauthorized scraping, reproduction, or resale is strictly prohibited.</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#f7efe3] p-3 rounded border-l-2 border-[var(--gold)] text-[var(--ink)]/90">
                  <p className="font-medium italic">
                    "Follicia adheres to strict private client confidentiality for all reservations, bespoke fittings, and white-glove deliveries."
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">1. Private Client Confidentiality</h4>
                  <p>All client information, size profiles, reservation records, and delivery locations are treated with absolute discretion. We do not sell, exchange, or share private patron data with third-party tracking networks or advertisers.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">2. Certificate &amp; Authenticity Tracking</h4>
                  <p>Each edition is bound to a physical numbered parchment certificate. Ownership transfers and limited reservations are securely cataloged upon private concierge verification to protect limited-edition provenance.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">3. White-Glove Courier Data</h4>
                  <p>Delivery parameters are transmitted exclusively to our insured private courier partners for the sole purpose of hand-executing your reservation shipment with white-glove security.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">4. Information We Collect</h4>
                  <p>We collect only the details needed for an exquisite boutique experience: patron name, email, contact telephone, delivery address, sizing history, wishlist activity, and concierge correspondence.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">5. Client Rights &amp; Data Discretion</h4>
                  <p>You may request access, correction, export, or deletion of personal information at any time, unsubscribe from drop notifications, or contact our private concierge at concierge@follicia.com.</p>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-[#4b261a]/15 flex items-center justify-between gap-3 shrink-0">
            <a
              href={legalModal === "terms" ? "#/legal/terms" : "#/legal/privacy"}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[var(--gold)] hover:underline font-medium"
            >
              Open dedicated page ↗
            </a>
            <button
              type="button"
              onClick={() => setLegalModal(null)}
              className="bg-[#351c13] hover:bg-[#4b261a] text-[#fffaf0] px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}

    </motion.div>
  );
}
