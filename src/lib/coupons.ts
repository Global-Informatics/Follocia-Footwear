import { getLaunchPrivilegeState } from "./launchDiscounts";

export type CouponQuote = {
  code: string;
  title: string;
  meta: string;
  discount: number;
  message: string;
};

type AdminCoupon = { title: string; meta: string; status: string };

function getActiveEmail(overrideEmail?: string): string {
  if (overrideEmail) return overrideEmail.trim().toLowerCase();
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("follocia_session");
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.user?.email) return String(s.user.email).trim().toLowerCase();
    }
  } catch {}
  return "";
}

function readCoupons() {
  try {
    const stored = JSON.parse(localStorage.getItem("follocia_admin_coupons") || "[]") as AdminCoupon[];
    return stored.length ? stored : [{ title: "FOLLICIA10", meta: "10% off - Live editions", status: "Active" }];
  } catch {
    return [{ title: "FOLLICIA10", meta: "10% off - Live editions", status: "Active" }];
  }
}

export function validateCoupon(
  code: string,
  subtotal: number,
  userEmail?: string
): { quote: CouponQuote | null; error?: string } {
  const clean = code.trim().toUpperCase();
  if (!clean) return { quote: null, error: "Please enter a coupon code." };

  // 1. Check LAUNCH35 (first 10 users only)
  if (clean === "LAUNCH35") {
    const email = getActiveEmail(userEmail);
    const state = getLaunchPrivilegeState();
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const hasAlreadyUsed = cleanEmail
      ? state.completedUsers.some((u) => u.email.trim().toLowerCase() === cleanEmail)
      : false;

    if (hasAlreadyUsed) {
      return {
        quote: null,
        error: "You have already redeemed your 35% launch offer. Please use WELCOME15 for 15% off!",
      };
    }

    if (state.is35Retired || state.completedUsers.length >= state.max35Users) {
      return {
        quote: null,
        error: "The 35% launch offer is now complete for the first 10 clients. Please use WELCOME15 for 15% off!",
      };
    }

    const spotsRemaining = Math.max(0, state.max35Users - state.completedUsers.length);
    const discount = Math.round(subtotal * 0.35);
    return {
      quote: {
        code: "LAUNCH35",
        title: "LAUNCH35 (35% OFF)",
        meta: `35% Early-Bird Privilege · ${spotsRemaining} spots left`,
        discount: Math.min(discount, subtotal),
        message: "35% Launch Discount Applied!",
      },
    };
  }

  // 2. Check WELCOME15 (for subsequent users or after first 10)
  if (clean === "WELCOME15") {
    const discount = Math.round(subtotal * 0.15);
    return {
      quote: {
        code: "WELCOME15",
        title: "WELCOME15 (15% OFF)",
        meta: "15% Member Welcome Privilege",
        discount: Math.min(discount, subtotal),
        message: "15% Welcome Discount Applied!",
      },
    };
  }

  // 3. Check admin / custom coupons
  const coupon = readCoupons().find((item) => {
    const t = item.title.trim().toUpperCase();
    return (
      (t === clean || (clean === "FOLLOCIA10" && t === "FOLLICIA10") || (clean === "FOLLICIA10" && t === "FOLLOCIA10")) &&
      !["Paused", "Draft"].includes(item.status)
    );
  });
  if (!coupon) return { quote: null, error: "Invalid coupon code." };

  const percent = Number(coupon.meta.match(/(\d+)\s*%/)?.[1] || 0);
  const money = Number(coupon.meta.match(/(?:EUR|INR|RS\.?|₹|€)\s*(\d+)/i)?.[1] || 0);
  const discount = percent > 0 ? Math.round(subtotal * (percent / 100)) : money;
  return {
    quote: {
      code: clean,
      title: coupon.title,
      meta: coupon.meta,
      discount: Math.min(discount, subtotal),
      message: discount > 0 ? `${coupon.title} applied` : `${coupon.title} benefit saved for concierge`,
    },
  };
}

export function quoteCoupon(code: string, subtotal: number, userEmail?: string): CouponQuote | null {
  return validateCoupon(code, subtotal, userEmail).quote;
}

export function saveCheckoutCoupon(quote: CouponQuote | null) {
  if (!quote) {
    localStorage.removeItem("follocia_checkout_coupon");
    return;
  }
  localStorage.setItem("follocia_checkout_coupon", JSON.stringify(quote));
}

export function readCheckoutCoupon(subtotal: number, userEmail?: string) {
  try {
    const quote = JSON.parse(localStorage.getItem("follocia_checkout_coupon") || "null") as CouponQuote | null;
    if (!quote) return null;
    return quoteCoupon(quote.code, subtotal, userEmail);
  } catch {
    return null;
  }
}
