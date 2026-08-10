export type CouponQuote = {
  code: string;
  title: string;
  meta: string;
  discount: number;
  message: string;
};

type AdminCoupon = { title: string; meta: string; status: string };

function readCoupons() {
  try {
    const stored = JSON.parse(localStorage.getItem("follocia_admin_coupons") || "[]") as AdminCoupon[];
    return stored.length ? stored : [{ title: "FOLLOCIA10", meta: "10% off - Live editions", status: "Active" }];
  } catch {
    return [{ title: "FOLLOCIA10", meta: "10% off - Live editions", status: "Active" }];
  }
}

export function quoteCoupon(code: string, subtotal: number): CouponQuote | null {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  const coupon = readCoupons().find((item) => item.title.trim().toUpperCase() === clean && !["Paused", "Draft"].includes(item.status));
  if (!coupon) return null;
  const percent = Number(coupon.meta.match(/(\d+)\s*%/)?.[1] || 0);
  const money = Number(coupon.meta.match(/(?:EUR|INR|RS\.?|₹|€)\s*(\d+)/i)?.[1] || 0);
  const discount = percent > 0 ? Math.round(subtotal * (percent / 100)) : money;
  return {
    code: clean,
    title: coupon.title,
    meta: coupon.meta,
    discount: Math.min(discount, subtotal),
    message: discount > 0 ? `${coupon.title} applied` : `${coupon.title} benefit saved for concierge`,
  };
}

export function saveCheckoutCoupon(quote: CouponQuote | null) {
  if (!quote) {
    localStorage.removeItem("follocia_checkout_coupon");
    return;
  }
  localStorage.setItem("follocia_checkout_coupon", JSON.stringify(quote));
}

export function readCheckoutCoupon(subtotal: number) {
  try {
    const quote = JSON.parse(localStorage.getItem("follocia_checkout_coupon") || "null") as CouponQuote | null;
    if (!quote) return null;
    return quoteCoupon(quote.code, subtotal);
  } catch {
    return null;
  }
}
