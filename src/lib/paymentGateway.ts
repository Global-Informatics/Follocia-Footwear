import { COMMERCE_EVENT } from "./commerceStore";

export interface RazorpayGatewaySettings {
  keyId: string;
  isConfigured: boolean;
  mode: "test" | "live" | "unconfigured";
  maskedSecret?: string;
}

export interface GatewaySettings {
  mode: "test" | "live";
  testKeyId: string;
  liveKeyId: string;
  allowClientFallback: boolean;
}

const SETTINGS_KEY = "follicia_gateway_settings";

export const DEFAULT_GATEWAY_SETTINGS: GatewaySettings = {
  mode: "live",
  testKeyId: "",
  liveKeyId: "",
  allowClientFallback: true,
};

export function getGatewaySettings(): GatewaySettings {
  if (typeof window === "undefined") return DEFAULT_GATEWAY_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_GATEWAY_SETTINGS));
      return DEFAULT_GATEWAY_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GATEWAY_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_GATEWAY_SETTINGS;
  }
}

export function saveGatewaySettings(settings: Partial<GatewaySettings>) {
  if (typeof window === "undefined") return;
  try {
    const current = getGatewaySettings();
    const updated: GatewaySettings = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(COMMERCE_EVENT));
  } catch {}
}

export async function fetchRemoteRazorpayConfig(): Promise<RazorpayGatewaySettings | null> {
  try {
    const res = await fetch("/api/commerce/razorpay/config");
    if (!res.ok) return null;
    const data = await res.json();
    return {
      keyId: data.keyId || "",
      isConfigured: !!data.isConfigured,
      mode: data.mode || "unconfigured",
      maskedSecret: data.maskedSecret || "",
    };
  } catch {
    return null;
  }
}

export async function saveRemoteRazorpayConfig(keyId: string, keySecret: string): Promise<boolean> {
  try {
    const res = await fetch("/api/commerce/razorpay/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, keySecret }),
    });
    if (!res.ok) return false;
    window.dispatchEvent(new CustomEvent(COMMERCE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function getActiveRazorpayKey(): string {
  const settings = getGatewaySettings();
  return settings.mode === "live" ? settings.liveKeyId : settings.testKeyId;
}

export function isTestGateway(): boolean {
  return getGatewaySettings().mode === "test";
}
