import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import type { AuthSession } from "@/components/auth/AuthGateway";
import "@/components/home/follicia.css";

async function saveContactQuery(name: string, email: string, requestType: string, message: string, phone: string = "") {
  const key = "follocia_admin_contact";
  const existing = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ id: string; title: string; meta: string; status: string }>;
  const ticketData = {
    name,
    email,
    phone: phone || "",
    subject: requestType,
    message,
    createdAt: new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: "Open",
    replies: [],
  };
  const next = [
    {
      id: `contact-${Date.now()}`,
      title: `${requestType} from ${name}`,
      meta: JSON.stringify(ticketData),
      status: "Open",
    },
    ...existing,
  ];
  localStorage.setItem(key, JSON.stringify(next));
  try {
    await fetch("/api/commerce/admin-records/contact", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next.map((record) => ({ ...record, module: "contact" }))),
    });
  } catch {
    // Keeps working offline / mock mode
  }
}

export function ContactPage({
  session,
  onLogout,
  onLogin,
}: {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setSubmitting(true);
    try {
      await saveContactQuery(formData.name, formData.email, formData.subject, formData.message, formData.phone);
      void fetch("/api/commerce/notify-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
        }),
      }).catch(() => {});
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="follicia-home flex flex-col min-h-screen bg-white">
      <Navigation
        userName={session?.user?.name}
        onLogout={session ? onLogout : undefined}
        onLogin={onLogin}
        solid
      />

      <main className="flex-1 bg-white text-[var(--ink)]">
        {/* Banner Section */}
        <section className="border-b border-[#4b261a]/10 bg-[#f9f3e9] py-14 px-6 md:px-12 text-center">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block text-[0.68rem] tracking-[0.24em] font-semibold text-[var(--gold)] uppercase mb-3">
              Contact Us
            </span>
            <h1 className="font-serif text-3xl md:text-5xl text-[var(--ink)] tracking-tight mb-4 font-normal">
              Get in Touch with Follicia
            </h1>
            <p className="text-sm md:text-base text-[var(--ink)]/75 max-w-xl mx-auto leading-relaxed">
              We are here to help you with your orders, size guidance, shipping questions, or any feedback.
            </p>
          </div>
        </section>

        {/* Content Section: 2 Columns */}
        <section className="max-w-6xl mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Contact Information */}
            <div className="lg:col-span-5 space-y-6">
              {/* Store Address Card */}
              <div className="bg-[#fbf6ed] border-l-4 border-[var(--gold)] p-8 shadow-xs border-y border-r border-[#4b261a]/10">
                <span className="text-[0.62rem] uppercase tracking-[0.2em] font-semibold text-[var(--gold)] block mb-1">
                  Our Location
                </span>
                <h2 className="font-serif text-2xl text-[var(--ink)] mb-4 font-normal">
                  Follicia Studio
                </h2>
                <div className="space-y-3 text-sm text-[var(--ink)]/80 leading-relaxed">
                  <p>
                    First Floor, 513/8 Chhunipura, Kirpal Nagar,<br />
                    Rohtak, Haryana 124001, India
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--gold)] font-semibold">
                    Powered by Groupe Ras Mondial
                  </p>
                  <p className="pt-2 border-t border-[#4b261a]/10">
                    <strong className="text-[var(--ink)] font-medium">Phone Support:</strong>{" "}
                    <a href="tel:+917082216801" className="text-[var(--chocolate)] hover:text-[var(--gold)] transition-colors">
                      +91 7082216801
                    </a>
                  </p>
                  <p>
                    <strong className="text-[var(--ink)] font-medium">Email Support:</strong>{" "}
                    <a href="mailto:info@follicia.in" className="text-[var(--chocolate)] hover:text-[var(--gold)] transition-colors">
                      info@follicia.in
                    </a>
                  </p>
                  <p>
                    <strong className="text-[var(--ink)] font-medium">Working Hours:</strong>{" "}
                    Monday – Saturday (10:00 AM – 7:00 PM IST)
                  </p>
                </div>
              </div>

              {/* Customer Support Card */}
              <div className="bg-[#fbf6ed] p-8 border border-[#4b261a]/10">
                <span className="text-[0.62rem] uppercase tracking-[0.2em] font-semibold text-[var(--gold)] block mb-1">
                  Customer Support
                </span>
                <h3 className="font-serif text-xl text-[var(--ink)] mb-3 font-normal">
                  Order &amp; Delivery Help
                </h3>
                <p className="text-sm text-[var(--ink)]/75 leading-relaxed">
                  Our support team is happy to assist you with order status, easy returns, exchanges, and doorstep delivery updates.
                </p>
              </div>

              {/* Sizing Guidance Card */}
              <div className="bg-[#fbf6ed] p-8 border border-[#4b261a]/10">
                <span className="text-[0.62rem] uppercase tracking-[0.2em] font-semibold text-[var(--gold)] block mb-1">
                  Size Help
                </span>
                <h3 className="font-serif text-xl text-[var(--ink)] mb-3 font-normal">
                  Need Fit Recommendations?
                </h3>
                <p className="text-sm text-[var(--ink)]/75 leading-relaxed">
                  Not sure about your size? Send us your queries or foot dimensions, and our team will recommend the perfect size for you.
                </p>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7 bg-[#fbf6ed] p-8 md:p-12 border border-[#4b261a]/15 shadow-xs">
              {submitted ? (
                <div className="py-12 px-6 text-center space-y-5">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[var(--champagne)]/60 border border-[var(--gold)] flex items-center justify-center text-[var(--gold)]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[0.65rem] uppercase tracking-[0.22em] font-semibold text-[var(--gold)] block">
                    Message Sent
                  </span>
                  <h3 className="font-serif text-2xl md:text-3xl text-[var(--ink)] font-normal">
                    Thank You for Contacting Us
                  </h3>
                  <p className="text-sm md:text-base text-[var(--ink)]/75 max-w-md mx-auto leading-relaxed">
                    We have received your message. Our team will review your request and get back to you within 24 hours.
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          name: "",
                          email: "",
                          phone: "",
                          subject: "General Inquiry",
                          message: "",
                        });
                      }}
                      className="inline-flex items-center justify-center px-6 py-3 border border-[var(--chocolate)] text-[var(--chocolate)] hover:bg-[var(--chocolate)] hover:text-[#fffaf0] transition-colors text-xs uppercase tracking-[0.16em] font-semibold"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.22em] font-semibold text-[var(--gold)] block mb-1">
                      Send Us a Message
                    </span>
                    <h2 className="font-serif text-2xl md:text-3xl text-[var(--ink)] font-normal">
                      How Can We Help You?
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[0.66rem] font-semibold tracking-[0.18em] uppercase text-[var(--ink)]/80 mb-2">
                        Full Name <span className="text-[var(--gold)]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Priya Sharma"
                        className="w-full bg-white border border-[#4b261a]/20 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 focus:outline-none focus:border-[var(--gold)] transition-colors rounded-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.66rem] font-semibold tracking-[0.18em] uppercase text-[var(--ink)]/80 mb-2">
                        Email Address <span className="text-[var(--gold)]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@example.com"
                        className="w-full bg-white border border-[#4b261a]/20 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 focus:outline-none focus:border-[var(--gold)] transition-colors rounded-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[0.66rem] font-semibold tracking-[0.18em] uppercase text-[var(--ink)]/80 mb-2">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 7082216801"
                        className="w-full bg-white border border-[#4b261a]/20 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 focus:outline-none focus:border-[var(--gold)] transition-colors rounded-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.66rem] font-semibold tracking-[0.18em] uppercase text-[var(--ink)]/80 mb-2">
                        Topic / Subject
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-white border border-[#4b261a]/20 px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--gold)] transition-colors rounded-xs"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Order &amp; Delivery Query">Order &amp; Delivery Query</option>
                        <option value="Size &amp; Fit Assistance">Size &amp; Fit Assistance</option>
                        <option value="Returns &amp; Exchange">Returns &amp; Exchange</option>
                        <option value="Customization &amp; Bulk Request">Customization &amp; Bulk Request</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.66rem] font-semibold tracking-[0.18em] uppercase text-[var(--ink)]/80 mb-2">
                      Your Message <span className="text-[var(--gold)]">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Write your message or question here..."
                      className="w-full bg-white border border-[#4b261a]/20 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 focus:outline-none focus:border-[var(--gold)] transition-colors rounded-xs resize-y"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#351c13] hover:bg-[#4b261a] text-[#fffaf0] py-4 px-8 text-xs uppercase tracking-[0.2em] font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Sending Message..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>
      </main>

      <Footer />
      <CartDrawer session={session} onLogin={onLogin} />
    </div>
  );
}

