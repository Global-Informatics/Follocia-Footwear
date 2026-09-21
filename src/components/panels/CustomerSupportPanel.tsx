import { useState, useMemo } from "react";
import {
  Headphones,
  Mail,
  Phone,
  Send,
  Check,
  Copy,
  ExternalLink,
  Trash2,
  Clock,
  Sparkles,
  Search,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  MessageSquare,
  CornerDownRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export type AdminRecord = {
  id: string;
  title: string;
  meta: string;
  status: string;
};

export interface SupportReply {
  id: string;
  sender: "admin" | "customer";
  adminName: string;
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "Open" | "In Progress" | "Replied" | "Resolved";
  replies: SupportReply[];
}

/**
 * Intelligent parser that handles both newly formatted JSON support tickets
 * and legacy string formats (e.g. "email@domain.com - message" or demo seeds).
 */
export function parseSupportTicket(record: AdminRecord): SupportTicket {
  // 1. Try parsing JSON if meta starts with '{'
  if (record.meta && record.meta.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(record.meta);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          id: record.id,
          name: parsed.name || extractNameFromTitle(record.title) || "Guest Client",
          email: parsed.email || extractEmailFromMeta(record.meta) || "guest@follicia.com",
          phone: parsed.phone || "",
          subject: parsed.subject || extractSubjectFromTitle(record.title) || "Inquiry",
          message: parsed.message || parsed.meta || record.meta,
          createdAt: parsed.createdAt || formatTimestampFromId(record.id),
          status: (["Open", "In Progress", "Replied", "Resolved"].includes(record.status)
            ? record.status
            : parsed.status || "Open") as SupportTicket["status"],
          replies: Array.isArray(parsed.replies) ? parsed.replies : [],
        };
      }
    } catch {
      // Fallback to legacy parsing if JSON fails
    }
  }

  // 2. Legacy string parsing fallback
  const name = extractNameFromTitle(record.title) || "Guest Customer";
  const subject = extractSubjectFromTitle(record.title) || "General Inquiry";
  const email = extractEmailFromMeta(record.meta) || "support@follicia.com";
  const phone = extractPhoneFromMeta(record.meta);
  const message = cleanLegacyMessage(record.meta);

  return {
    id: record.id,
    name,
    email,
    phone,
    subject,
    message,
    createdAt: formatTimestampFromId(record.id),
    status: (["Open", "In Progress", "Replied", "Resolved"].includes(record.status)
      ? record.status
      : "Open") as SupportTicket["status"],
    replies: [],
  };
}

function extractNameFromTitle(title: string): string {
  if (!title) return "Guest Client";
  if (title.includes(" from ")) {
    return title.split(" from ")[1].trim();
  }
  return title;
}

function extractSubjectFromTitle(title: string): string {
  if (!title) return "Concierge Inquiry";
  if (title.includes(" from ")) {
    return title.split(" from ")[0].trim();
  }
  return title;
}

function extractEmailFromMeta(meta: string): string {
  if (!meta) return "";
  const match = meta.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1] : "";
}

function extractPhoneFromMeta(meta: string): string {
  if (!meta) return "";
  const match = meta.match(/(?:Phone:\s*|\b\+?91[\s-]?)(\d[\d\s-]{7,12}\d)/i);
  return match ? match[0].replace(/Phone:\s*/i, "").trim() : "";
}

function cleanLegacyMessage(meta: string): string {
  if (!meta) return "No message content provided.";
  let clean = meta;
  // Remove email if at the beginning
  clean = clean.replace(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*-\s*/, "");
  // Remove phone segment
  clean = clean.replace(/Phone:\s*[+\d\s-]+\s*\|\s*/i, "");
  return clean.trim() || meta;
}

function formatTimestampFromId(id: string): string {
  if (id.startsWith("contact-") && !isNaN(Number(id.replace("contact-", "")))) {
    const timestamp = Number(id.replace("contact-", ""));
    const d = new Date(timestamp);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "Recent Inquiry";
}

function ticketToRecord(ticket: SupportTicket): AdminRecord {
  return {
    id: ticket.id,
    title: `${ticket.subject} from ${ticket.name}`,
    meta: JSON.stringify(ticket),
    status: ticket.status,
  };
}

export function CustomerSupportPanel({
  records,
  onChange,
  storageKey = "follocia_admin_contact",
}: {
  records: AdminRecord[];
  onChange: (updated: AdminRecord[]) => void;
  storageKey?: string;
}) {
  const [selectedStatusTab, setSelectedStatusTab] = useState<
    "all" | "Open" | "In Progress" | "Replied" | "Resolved"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [sentNoticeId, setSentNoticeId] = useState<string | null>(null);
  const [forwardingTicketId, setForwardingTicketId] = useState<string | null>(null);
  const [forwardedTicketId, setForwardedTicketId] = useState<string | null>(null);

  const handleForwardToAdminEmail = async (ticket: SupportTicket) => {
    setForwardingTicketId(ticket.id);
    try {
      await fetch("/api/commerce/notify-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: ticket.name,
          email: ticket.email,
          phone: ticket.phone,
          subject: ticket.subject,
          message: ticket.message,
        }),
      });
      setForwardedTicketId(ticket.id);
      setTimeout(() => setForwardedTicketId(null), 3500);
    } catch {
      // offline fallback
    } finally {
      setForwardingTicketId(null);
    }
  };

  // Parse all records into structured tickets
  const tickets = useMemo(() => {
    return records.map(parseSupportTicket);
  }, [records]);

  // Counts for tabs & metric cards
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const replied = tickets.filter((t) => t.status === "Replied").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    return { total, open, inProgress, replied, resolved };
  }, [tickets]);

  // Filtered tickets based on active tab and search query
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesTab =
        selectedStatusTab === "all" || ticket.status === selectedStatusTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ticket.name.toLowerCase().includes(q) ||
        ticket.email.toLowerCase().includes(q) ||
        (ticket.phone && ticket.phone.toLowerCase().includes(q)) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.message.toLowerCase().includes(q)
      );
    });
  }, [tickets, selectedStatusTab, searchQuery]);

  // Update a single ticket
  const updateTicket = (updatedTicket: SupportTicket) => {
    const nextTickets = tickets.map((t) =>
      t.id === updatedTicket.id ? updatedTicket : t
    );
    const nextRecords = nextTickets.map(ticketToRecord);
    onChange(nextRecords);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextRecords));
      void fetch("/api/commerce/admin-records/contact", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          nextRecords.map((r) => ({ ...r, module: "contact" }))
        ),
      });
    } catch {
      // offline fallback
    }
  };

  // Delete a ticket
  const handleDeleteTicket = (id: string) => {
    if (
      !window.confirm("Are you sure you want to permanently delete this customer inquiry?")
    ) {
      return;
    }
    const nextRecords = records.filter((r) => r.id !== id);
    onChange(nextRecords);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextRecords));
      void fetch("/api/commerce/admin-records/contact", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          nextRecords.map((r) => ({ ...r, module: "contact" }))
        ),
      });
    } catch {
      // offline fallback
    }
  };

  // Send admin reply
  const handleSendReply = (ticket: SupportTicket) => {
    const text = (replyDrafts[ticket.id] || "").trim();
    if (!text) return;

    const newReply: SupportReply = {
      id: `reply-${Date.now()}`,
      sender: "admin",
      adminName: "Follicia Concierge Team",
      text,
      timestamp: new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedTicket: SupportTicket = {
      ...ticket,
      status: "Replied",
      replies: [...(ticket.replies || []), newReply],
    };

    updateTicket(updatedTicket);

    // Clear draft
    setReplyDrafts((prev) => ({ ...prev, [ticket.id]: "" }));

    // Show temporary sent notice
    setSentNoticeId(ticket.id);
    setTimeout(() => {
      setSentNoticeId((curr) => (curr === ticket.id ? null : curr));
    }, 4000);
  };

  // Pre-fill quick template into reply box
  const applyTemplate = (ticketId: string, customerName: string, type: string) => {
    let template = "";
    switch (type) {
      case "sizing":
        template = `Dear ${customerName},\n\nThank you for reaching out to Follicia Footwear Concierge. Regarding your sizing query, our handcrafted shoes are crafted to true-to-size Italian standards. If you are between sizes or prefer a slightly relaxed fit, we recommend selecting one half-size up.\n\nPlease let us know if you would like us to reserve a complimentary fitting pair for you.\n\nWarm regards,\nFollicia Atelier Concierge`;
        break;
      case "order":
        template = `Dear ${customerName},\n\nThank you for contacting Follicia Support. We are pleased to assist you with your order. Every Follicia creation undergoes artisanal quality checks before white-glove dispatch within 2-4 business days across India.\n\nFeel free to share any specific delivery timing or preference.\n\nWarm regards,\nFollicia Atelier Concierge`;
        break;
      case "general":
      default:
        template = `Dear ${customerName},\n\nThank you for getting in touch with Follicia. We have received your inquiry and our concierge team is delighted to assist you.\n\nRegarding your message: [Add details here]\n\nPlease don't hesitate to reach back out if you require any further assistance.\n\nWarm regards,\nFollicia Atelier Concierge`;
        break;
    }
    setReplyDrafts((prev) => ({ ...prev, [ticketId]: template }));
  };

  // Copy email to clipboard
  const handleCopyEmail = (ticketId: string, email: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmailId(ticketId);
    setTimeout(() => {
      setCopiedEmailId((curr) => (curr === ticketId ? null : curr));
    }, 2000);
  };

  return (
    <section className="space-y-6">
      {/* 1. Header & Stats Section */}
      <div className="bg-[#171310] text-[#f7f4ee] p-6 sm:p-8 rounded-2xl shadow-xl border border-[#a87648]/25 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top_right,oklch(0.78_0.12_80/0.12),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]">
                <Headphones size={20} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--gold)]">
                Luxury Concierge & Customer Desk
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal">
              Customer Support Center
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
              Monitor incoming inquiries from the Contact page, view complete customer messages & email addresses, and reply directly from this console.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Inquiries Synced
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30 flex items-center gap-1.5">
              <Mail size={12} />
              Auto-Relay: info@follicia.in
            </span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-xs">
            <div className="flex items-center justify-between text-white/60 mb-1">
              <span className="text-[11px] uppercase tracking-wider">Total Tickets</span>
              <MessageSquare size={14} className="text-[var(--gold)]" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl text-white font-bold">
              {stats.total}
            </div>
            <div className="text-[10px] text-white/50 mt-1">From Contact Page</div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-xs">
            <div className="flex items-center justify-between text-amber-200/80 mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Open / Action Needed</span>
              <AlertCircle size={14} className="text-amber-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl text-amber-300 font-bold">
              {stats.open}
            </div>
            <div className="text-[10px] text-amber-300/60 mt-1">Pending admin response</div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-xs">
            <div className="flex items-center justify-between text-blue-200/80 mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Replied</span>
              <CheckCircle2 size={14} className="text-blue-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl text-blue-300 font-bold">
              {stats.replied}
            </div>
            <div className="text-[10px] text-blue-300/60 mt-1">Responses delivered</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl backdrop-blur-xs">
            <div className="flex items-center justify-between text-emerald-200/80 mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Resolved</span>
              <CheckCheck size={14} className="text-emerald-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl text-emerald-300 font-bold">
              {stats.resolved}
            </div>
            <div className="text-[10px] text-emerald-300/60 mt-1">Inquiry completed</div>
          </div>
        </div>
      </div>

      {/* 2. Controls, Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#4b261a]/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border border-[#4b261a]/15 p-1 rounded-lg bg-[#faf8f5]">
          <button
            type="button"
            onClick={() => setSelectedStatusTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              selectedStatusTab === "all"
                ? "bg-[#24130d] text-white shadow-xs"
                : "text-[#24130d]/70 hover:text-[#24130d] hover:bg-white/80"
            }`}
          >
            All Inquiries ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusTab("Open")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === "Open"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-100/60"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Open ({stats.open})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusTab("Replied")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === "Replied"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-blue-800 hover:bg-blue-100/60"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Replied ({stats.replied})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusTab("Resolved")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === "Resolved"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-emerald-800 hover:bg-emerald-100/60"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Resolved ({stats.resolved})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#24130d]/40"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or inquiry keywords..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#4b261a]/20 rounded-lg bg-[#faf8f5] focus:bg-white focus:border-[var(--gold)] outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Ticket List / Conversation Cards */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#4b261a]/20 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#fbf6ed] text-[var(--gold)] flex items-center justify-center mx-auto mb-3">
              <Headphones size={22} />
            </div>
            <h3 className="font-serif text-lg text-[#24130d] font-semibold">
              No Support Tickets Found
            </h3>
            <p className="text-xs text-[#24130d]/65 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No inquiries match "${searchQuery}". Try clearing your search query.`
                : "There are currently no customer inquiries in this category."}
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const currentDraft = replyDrafts[ticket.id] || "";
            const isSentRecent = sentNoticeId === ticket.id;

            return (
              <article
                key={ticket.id}
                className="bg-white rounded-2xl border border-[#4b261a]/15 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Top Info Bar */}
                <div className="p-5 sm:p-6 border-b border-[#4b261a]/10 bg-[#faf8f5]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#24130d] text-[var(--gold)] font-serif font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {ticket.name.charAt(0).toUpperCase() || "C"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base text-[#24130d]">
                          {ticket.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#24130d]/5 text-[#24130d]/70 border border-[#24130d]/10">
                          {ticket.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#24130d]/60 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-stone-400" />
                          {ticket.createdAt}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-stone-500">ID: {ticket.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Controller & Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mr-1">
                        Status:
                      </span>
                      <select
                        value={ticket.status}
                        onChange={(e) =>
                          updateTicket({
                            ...ticket,
                            status: e.target.value as SupportTicket["status"],
                          })
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                          ticket.status === "Open"
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : ticket.status === "In Progress"
                            ? "bg-blue-50 text-blue-900 border-blue-300"
                            : ticket.status === "Replied"
                            ? "bg-purple-50 text-purple-900 border-purple-300"
                            : "bg-emerald-50 text-emerald-900 border-emerald-300"
                        }`}
                      >
                        <option value="Open">● Open (Pending)</option>
                        <option value="In Progress">● In Progress</option>
                        <option value="Replied">● Replied</option>
                        <option value="Resolved">● Resolved</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete ticket"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Customer Contact Badges Strip */}
                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#fbf6ed] border border-[#a87648]/20 text-xs">
                    {/* Customer Email */}
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--gold)] flex items-center gap-1 font-semibold">
                        <Mail size={14} />
                        Email:
                      </span>
                      <a
                        href={`mailto:${ticket.email}?subject=Re: ${encodeURIComponent(
                          ticket.subject
                        )} - Follicia Atelier Support`}
                        className="font-medium text-[#24130d] hover:text-[var(--chocolate)] underline decoration-dotted transition-colors"
                      >
                        {ticket.email}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(ticket.id, ticket.email)}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#4b261a]/15 hover:border-[var(--gold)] rounded text-[#24130d] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {copiedEmailId === ticket.id ? (
                          <>
                            <Check size={10} className="text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleForwardToAdminEmail(ticket)}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#4b261a]/15 hover:border-[var(--gold)] rounded text-[#24130d] transition-colors cursor-pointer flex items-center gap-1"
                        title="Send or resend email notification copy to info@follicia.in"
                      >
                        {forwardingTicketId === ticket.id ? (
                          <>
                            <RefreshCw size={10} className="animate-spin text-amber-600" />
                            <span>Sending...</span>
                          </>
                        ) : forwardedTicketId === ticket.id ? (
                          <>
                            <Check size={10} className="text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Sent to info@follicia.in!</span>
                          </>
                        ) : (
                          <>
                            <Mail size={10} className="text-[var(--gold)]" />
                            <span>Forward to info@follicia.in</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Customer Phone if available */}
                    {ticket.phone && (
                      <>
                        <span className="text-stone-300">|</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--gold)] flex items-center gap-1 font-semibold">
                            <Phone size={14} />
                            Phone:
                          </span>
                          <a
                            href={`tel:${ticket.phone.replace(/\s+/g, "")}`}
                            className="font-medium text-[#24130d] hover:text-[var(--chocolate)] transition-colors"
                          >
                            {ticket.phone}
                          </a>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Customer Message Box */}
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-stone-500 block mb-1.5 flex items-center gap-1">
                      <MessageSquare size={13} className="text-[var(--gold)]" />
                      Customer Inquiry Message:
                    </span>
                    <div className="p-4 rounded-xl bg-[#fffdfa] border-l-4 border-[var(--gold)] border-y border-r border-[#4b261a]/15 text-sm text-[#24130d] leading-relaxed shadow-2xs whitespace-pre-wrap">
                      {ticket.message}
                    </div>
                  </div>

                  {/* Admin Reply History Thread */}
                  {ticket.replies && ticket.replies.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-stone-500 block flex items-center gap-1">
                        <CornerDownRight size={13} className="text-emerald-600" />
                        Admin Reply History ({ticket.replies.length}):
                      </span>

                      {ticket.replies.map((reply, idx) => (
                        <div
                          key={reply.id || idx}
                          className="p-4 rounded-xl bg-[#f0fdf4] border border-emerald-200 text-xs text-stone-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                              <ShieldCheck size={14} className="text-emerald-600" />
                              <span>{reply.adminName || "Follicia Support Concierge"}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800">
                                Official Response
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-500">{reply.timestamp}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-[13px] text-stone-900 pt-1">
                            {reply.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Composer Box */}
                  <div className="border-t border-[#4b261a]/10 pt-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#24130d] flex items-center gap-1.5">
                        <Send size={13} className="text-[var(--gold)]" />
                        Write Reply to {ticket.name} ({ticket.email}):
                      </span>

                      {/* Quick Template Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-stone-400 uppercase font-semibold">
                          Templates:
                        </span>
                        <button
                          type="button"
                          onClick={() => applyTemplate(ticket.id, ticket.name, "sizing")}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-[#fbf6ed] hover:bg-[#f3e7d5] border border-[#a87648]/30 text-[#24130d] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles size={10} className="text-[var(--gold)]" />
                          Sizing Advice
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(ticket.id, ticket.name, "order")}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-[#fbf6ed] hover:bg-[#f3e7d5] border border-[#a87648]/30 text-[#24130d] transition-colors cursor-pointer"
                        >
                          Order & Delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(ticket.id, ticket.name, "general")}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-[#fbf6ed] hover:bg-[#f3e7d5] border border-[#a87648]/30 text-[#24130d] transition-colors cursor-pointer"
                        >
                          General Greeting
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={currentDraft}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [ticket.id]: e.target.value,
                        }))
                      }
                      placeholder={`Type your response to ${ticket.name} here... Once sent, it will be saved in the conversation and mark this ticket as Replied.`}
                      className="w-full p-3 text-xs sm:text-sm border border-[#4b261a]/20 rounded-xl bg-[#faf8f5] focus:bg-white focus:border-[var(--gold)] outline-none leading-relaxed text-[#24130d] transition-all"
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        {/* Primary Send Button */}
                        <button
                          type="button"
                          onClick={() => handleSendReply(ticket)}
                          disabled={!currentDraft.trim()}
                          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                            currentDraft.trim()
                              ? "bg-[#24130d] text-white hover:bg-[#351c13] shadow-xs"
                              : "bg-stone-200 text-stone-400 cursor-not-allowed"
                          }`}
                        >
                          <Send size={13} />
                          <span>Send Reply & Mark Replied</span>
                        </button>

                        {/* Open in Email Client (mailto:) */}
                        <a
                          href={`mailto:${ticket.email}?subject=${encodeURIComponent(
                            `Re: ${ticket.subject} - Follicia Customer Concierge`
                          )}&body=${encodeURIComponent(
                            currentDraft.trim() ||
                              `Dear ${ticket.name},\n\nThank you for reaching out to Follicia Support regarding "${ticket.subject}".\n\n[Your reply here]\n\nWarm regards,\nFollicia Atelier Concierge`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-lg border border-[#a87648]/40 bg-[#fbf6ed] text-[#24130d] text-xs font-semibold hover:bg-[#f3e7d5] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          title="Open in external Email Client (Gmail, Outlook, etc.) with pre-filled reply"
                        >
                          <Mail size={13} className="text-[var(--gold)]" />
                          <span>Open in Email App</span>
                          <ExternalLink size={11} className="text-stone-400" />
                        </a>
                      </div>

                      {/* Success / Status Notice */}
                      {isSentRecent && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-md flex items-center gap-1 animate-fade-in">
                          <CheckCircle2 size={13} />
                          Reply recorded and ticket updated to Replied!
                        </span>
                      )}

                      {/* Quick Status Toggle */}
                      {ticket.status !== "Resolved" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateTicket({ ...ticket, status: "Resolved" })
                          }
                          className="text-xs text-stone-600 hover:text-emerald-700 font-semibold cursor-pointer underline transition-colors"
                        >
                          ✓ Mark as Resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateTicket({ ...ticket, status: "Open" })
                          }
                          className="text-xs text-stone-600 hover:text-amber-700 font-semibold cursor-pointer underline transition-colors"
                        >
                          ↺ Reopen Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
