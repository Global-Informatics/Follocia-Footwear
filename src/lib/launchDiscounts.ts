import { COMMERCE_EVENT } from "./commerceStore";

export interface LaunchPatron {
  email: string;
  name: string;
  orderId: string;
  orderedAt: string;
  discount: number;
}

export interface LaunchPrivilegeState {
  completedUsers: LaunchPatron[];
  max35Users: number;
  is35Retired: boolean;
}

const STORAGE_KEY = "follicia_launch_privilege";
const DEFAULT_MAX_USERS = 10;

export function getLaunchPrivilegeState(): LaunchPrivilegeState {
  if (typeof window === "undefined") {
    return { completedUsers: [], max35Users: DEFAULT_MAX_USERS, is35Retired: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: LaunchPrivilegeState = {
        completedUsers: [],
        max35Users: DEFAULT_MAX_USERS,
        is35Retired: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as LaunchPrivilegeState;
    const completed = Array.isArray(parsed.completedUsers) ? parsed.completedUsers : [];
    const is35Retired = completed.length >= DEFAULT_MAX_USERS || Boolean(parsed.is35Retired);
    return {
      completedUsers: completed,
      max35Users: DEFAULT_MAX_USERS,
      is35Retired,
    };
  } catch {
    return { completedUsers: [], max35Users: DEFAULT_MAX_USERS, is35Retired: false };
  }
}

export function saveLaunchPrivilegeState(state: LaunchPrivilegeState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(COMMERCE_EVENT));
  } catch {}
}

export interface UserDiscountEligibility {
  code: "LAUNCH35" | "WELCOME15";
  percent: 35 | 15;
  title: string;
  badge: string;
  spotsRemaining: number;
  hasAlreadyUsed35: boolean;
  is35Retired: boolean;
}

export function getUserDiscountEligibility(userEmail?: string): UserDiscountEligibility {
  const state = getLaunchPrivilegeState();
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : "";

  const hasAlreadyUsed35 = cleanEmail
    ? state.completedUsers.some((u) => u.email.trim().toLowerCase() === cleanEmail)
    : false;

  const spotsRemaining = Math.max(0, state.max35Users - state.completedUsers.length);
  const is35Active = spotsRemaining > 0 && !hasAlreadyUsed35 && !state.is35Retired;

  if (is35Active) {
    return {
      code: "LAUNCH35",
      percent: 35,
      title: "35% OFF Your Order",
      badge: `First 10 Clients Exclusive · ${spotsRemaining} of ${state.max35Users} spots left`,
      spotsRemaining,
      hasAlreadyUsed35: false,
      is35Retired: false,
    };
  }

  return {
    code: "WELCOME15",
    percent: 15,
    title: "15% OFF Your Order",
    badge: hasAlreadyUsed35
      ? "Welcome Privilege (35% Launch Discount Already Redeemed)"
      : "Welcome Privilege (First 10 Launch Spots Full)",
    spotsRemaining: 0,
    hasAlreadyUsed35,
    is35Retired: state.is35Retired || spotsRemaining === 0,
  };
}

export function recordLaunchOrder(
  email: string,
  name: string,
  orderId: string,
  couponCode?: string
): { success: boolean; justCompleted10: boolean } {
  if (typeof window === "undefined") return { success: false, justCompleted10: false };

  const cleanCode = (couponCode || "").trim().toUpperCase();
  if (cleanCode !== "LAUNCH35") {
    return { success: false, justCompleted10: false };
  }

  const state = getLaunchPrivilegeState();
  const cleanEmail = (email || "").trim().toLowerCase();

  // If already used by this email or 10 spots already full, do not re-add
  if (state.completedUsers.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
    return { success: false, justCompleted10: false };
  }

  if (state.completedUsers.length >= state.max35Users) {
    return { success: false, justCompleted10: false };
  }

  const newPatron: LaunchPatron = {
    email: cleanEmail,
    name: name || "Private Client",
    orderId,
    orderedAt: new Date().toISOString(),
    discount: 35,
  };

  const updatedUsers = [...state.completedUsers, newPatron];
  const justCompleted10 = updatedUsers.length >= state.max35Users;

  const newState: LaunchPrivilegeState = {
    completedUsers: updatedUsers,
    max35Users: state.max35Users,
    is35Retired: justCompleted10,
  };

  saveLaunchPrivilegeState(newState);

  // Add notification/audit record in admin logs
  try {
    const auditLogs = JSON.parse(localStorage.getItem("follocia_admin_audit") || "[]");
    const logEntry = {
      id: `audit-launch-${Date.now()}`,
      title: justCompleted10
        ? `🔔 MILESTONE: 10/10 Launch Orders Completed (35% Retired)`
        : `Launch 35% Order #${updatedUsers.length}/10 Placed by ${name}`,
      meta: `Order ${orderId} by ${email} · 35% Launch Privilege (${updatedUsers.length}/${state.max35Users} completed)`,
      status: "Logged",
    };
    localStorage.setItem("follocia_admin_audit", JSON.stringify([logEntry, ...auditLogs]));
  } catch {}

  return { success: true, justCompleted10 };
}
