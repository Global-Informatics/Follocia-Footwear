import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Phone,
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  Package,
  HelpCircle,
  MessageCircle,
  Ticket,
} from "lucide-react";
import type { AuthSession } from "@/components/auth/AuthGateway";
import {
  generateConciergeReply,
  QUICK_PROMPTS,
  FOLLICIA_SUPPORT_CONTACT,
  type ChatMessage,
} from "@/lib/conciergeAi";

export function LiaGirlAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 rounded-full bg-gradient-to-tr from-[#24130d] via-[#4b261a] to-[#d4af37] p-[1.5px] shadow-md ${className}`}>
      <div className="w-full h-full rounded-full bg-[#fbf6ed] flex items-center justify-center overflow-hidden relative">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="32" cy="32" r="32" fill="url(#lia-avatar-grad)" />
          {/* Background Glow */}
          <circle cx="32" cy="20" r="14" fill="#f5d061" opacity="0.35" />
          {/* Body / Luxury Dark Outfit */}
          <path d="M14 56C14 43 22 38 32 38C42 38 50 43 50 56V64H14V56Z" fill="#24130d" />
          {/* Gold Necklace */}
          <path d="M25 39C28 42 36 42 39 39" stroke="#f5d061" strokeWidth="2.2" strokeLinecap="round" />
          {/* Neck */}
          <path d="M27 33H37V40C37 42.5 34.8 44.5 32 44.5C29.2 44.5 27 42.5 27 40V33Z" fill="#FADCB8" />
          {/* Face */}
          <path d="M21 22C21 16.5 25.9 12 32 12C38.1 12 43 16.5 43 22V26C43 30.5 38.1 34 32 34C25.9 34 21 30.5 21 26V22Z" fill="#FFE5C4" />
          {/* Chic Hair (Dark Bob Cut with Flow) */}
          <path d="M20 20C20 13 25 9 32 9C39 9 44 13 44 20C44 23 43 26 43 28C40 22 35 18.5 32 18.5C29 18.5 24 22 21 28C21 26 20 23 20 20Z" fill="#24130d" />
          <path d="M18 21C17 27 18 34 21 37C21.8 32.5 21.2 27 20 21Z" fill="#24130d" />
          <path d="M46 21C47 27 46 34 43 37C42.2 32.5 42.8 27 44 21Z" fill="#24130d" />
          {/* Eyes & Lashes */}
          <circle cx="27.5" cy="23" r="1.8" fill="#24130d" />
          <circle cx="36.5" cy="23" r="1.8" fill="#24130d" />
          <path d="M25.5 21C27 20.5 29 21 29.5 21.5" stroke="#24130d" strokeWidth="1" strokeLinecap="round" />
          <path d="M34.5 21.5C35 21 37 20.5 38.5 21" stroke="#24130d" strokeWidth="1" strokeLinecap="round" />
          {/* Red Lip */}
          <path d="M29.5 29.5C31 31 33 31 34.5 29.5" stroke="#E05252" strokeWidth="1.8" strokeLinecap="round" fill="#E05252" opacity="0.9" />
          {/* Gold Hoop Earrings */}
          <circle cx="20" cy="26" r="2.8" stroke="#f5d061" strokeWidth="1.4" fill="none" />
          <circle cx="44" cy="26" r="2.8" stroke="#f5d061" strokeWidth="1.4" fill="none" />
          {/* Sparkle Badge */}
          <path d="M49 11L50.5 14.5L54 16L50.5 17.5L49 21L47.5 17.5L44 16L47.5 14.5L49 11Z" fill="#f5d061" />
          <defs>
            <linearGradient id="lia-avatar-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFBF5" />
              <stop offset="1" stopColor="#F6EEE3" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export function FolliciaConciergeChat({ session }: { session?: AuthSession | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Raise a Ticket modal state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ name: "", email: "", phone: "", query: "" });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const initialWelcome: ChatMessage = {
    id: "welcome-1",
    sender: "bot",
    text: session?.user?.name
      ? `Hello **${session.user.name}**! I am **LIA**, your **Follicia AI Personal Stylist & Concierge** ✨\n\nI am delighted to assist you with handcrafted designs, bespoke sizing, styling advice, order guidance, real-time tracking, or connecting directly with our footwear specialists.`
      : `Welcome to **Follicia** ✨\n\nI am **LIA**, your **AI Personal Stylist & Concierge**. How may I assist you today? You can ask me for footwear styling advice, product details, sizing guidance, how to order, live order tracking, or connect directly with our support team!`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    actionButtons: [
      { label: "👠 How to Order", action: "ask", payload: "How do I place an order on Follicia?" },
      { label: "✨ Style Recommendations", action: "ask", payload: "Show me your most popular heels and flats" },
      { label: "📞 Talk to Support Team", action: "ask", payload: "Can I speak to your customer support team?" },
      { label: "📦 Track My Order", action: "ask", payload: "Track my order" },
      { label: "📏 Sizing Guide", action: "ask", payload: "How do I find my shoe size?" },
      { label: "🏷️ Launch Privileges", action: "ask", payload: "What discounts are available?" },
      { label: "🎫 Raise a Ticket", action: "raise-ticket", payload: "" },
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("follicia_chat_history_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [initialWelcome];
  });

  // Persist messages in localStorage
  useEffect(() => {
    try {
      localStorage.setItem("follicia_chat_history_v3", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    const qLower = query.toLowerCase();
    const isTicketRequest =
      query === "__RAISE_TICKET__" ||
      qLower.includes("ticket") ||
      qLower.includes("raise a track") ||
      qLower.includes("raise track") ||
      qLower.includes("complain") ||
      qLower.includes("issue");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query === "__RAISE_TICKET__" ? "Raise a Ticket" : query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (isTicketRequest) {
      setShowTicketModal(true);
      setTicketSuccess(false);

      setIsTyping(true);
      setTimeout(() => {
        const botMsg: ChatMessage = {
          id: `bot-ticket-opened-${Date.now()}`,
          sender: "bot",
          text: `🎫 **Raise a Ticket Form Opened!**\n\nI have opened the ticket form for you. Please enter your name, email ID, contact number, and query, then tap **Submit Ticket**.\n\nOur concierge team will receive your query at **info@follicia.in** and get back to you promptly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionButtons: [
            { label: "🎫 Re-open Ticket Form", action: "raise-ticket", payload: "" },
            { label: "💬 Chat on WhatsApp", action: "link", payload: FOLLICIA_SUPPORT_CONTACT.whatsappUrl },
          ],
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 400);
      return;
    }

    setIsTyping(true);

    // Natural concierge thinking delay
    setTimeout(() => {
      const replyData = generateConciergeReply(query, session?.user?.email, session?.user?.name);
      const botMsg: ChatMessage = {
        ...replyData,
        id: `bot-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 550);
  };

  const handleActionButton = (btn: { label: string; action: string; payload?: string }) => {
    if (btn.action === "raise-ticket") {
      setShowTicketModal(true);
      setTicketSuccess(false);
    } else if (btn.action === "ask" && btn.payload) {
      handleSend(btn.payload);
    } else if (btn.action === "call" && btn.payload) {
      window.location.href = `tel:${btn.payload}`;
    } else if (btn.action === "link" && btn.payload) {
      const w = window.open(btn.payload, "_blank", "noopener,noreferrer");
      if (!w) window.location.assign(btn.payload);
    } else if (btn.action === "navigate" && btn.payload) {
      window.location.hash = btn.payload;
      if (window.innerWidth < 640) setIsOpen(false);
    }
  };

  const handleTicketSubmit = async () => {
    if (!ticketForm.name.trim() || !ticketForm.email.trim() || !ticketForm.query.trim()) return;
    setTicketSubmitting(true);
    try {
      // Save to localStorage (same pattern as ContactPage)
      const key = "follocia_admin_tickets";
      const existing = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ id: string; title: string; meta: string; status: string }>;
      const ticketData = {
        name: ticketForm.name.trim(),
        email: ticketForm.email.trim(),
        phone: ticketForm.phone.trim(),
        subject: "Raise a Ticket",
        message: ticketForm.query.trim(),
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
      const newRecord = {
        id: `ticket-${Date.now()}`,
        title: `Ticket from ${ticketForm.name.trim()}`,
        meta: JSON.stringify(ticketData),
        status: "Open",
      };
      const next = [newRecord, ...existing];
      localStorage.setItem(key, JSON.stringify(next));

      // Also save to contact queries so it shows in Customer Support
      const contactKey = "follocia_admin_contact";
      const contactExisting = JSON.parse(localStorage.getItem(contactKey) || "[]") as Array<{ id: string; title: string; meta: string; status: string }>;
      const contactNext = [{ ...newRecord, id: `contact-${Date.now()}` }, ...contactExisting];
      localStorage.setItem(contactKey, JSON.stringify(contactNext));

      // Sync to backend
      try {
        await fetch("/api/commerce/admin-records/tickets", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(next.map((r) => ({ ...r, module: "tickets" }))),
        });
        await fetch("/api/commerce/admin-records/contact", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(contactNext.map((r) => ({ ...r, module: "contact" }))),
        });
      } catch {}

      // Send email notification to info@follicia.in
      try {
        void fetch("/api/commerce/notify-contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: ticketForm.name.trim(),
            email: ticketForm.email.trim(),
            phone: ticketForm.phone.trim(),
            subject: "Raise a Ticket",
            message: ticketForm.query.trim(),
            to: "info@follicia.in",
          }),
        });
      } catch {}

      setTicketSuccess(true);
      setTicketForm({ name: "", email: "", phone: "", query: "" });

      // Add a bot message confirming ticket submission
      const confirmMsg: ChatMessage = {
        id: `bot-ticket-${Date.now()}`,
        sender: "bot",
        text: `✅ **Ticket Submitted Successfully!**\n\nThank you, **${ticketData.name}**. Your support ticket has been raised and our concierge team will review it shortly.\n\n**Ticket ID:** ${newRecord.id}\n**Email:** ${ticketData.email}\n**Query:** ${ticketData.message}\n\nWe will respond via email at **${ticketData.email}**. You can also reach us directly at **${FOLLICIA_SUPPORT_CONTACT.phone}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionButtons: [
          { label: "📞 Call Support", action: "call", payload: FOLLICIA_SUPPORT_CONTACT.phoneRaw },
          { label: "💬 WhatsApp", action: "link", payload: FOLLICIA_SUPPORT_CONTACT.whatsappUrl },
        ],
      };
      setMessages((prev) => [...prev, confirmMsg]);

      // Auto-close modal after 1.5s
      setTimeout(() => {
        setShowTicketModal(false);
        setTicketSuccess(false);
      }, 1500);
    } catch {
      // Fallback error
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleResetChat = () => {
    if (window.confirm("Do you want to reset your chat with LIA?")) {
      setMessages([initialWelcome]);
      localStorage.removeItem("follicia_chat_history_v3");
    }
  };

  // Helper to render formatted text with bolding, code, bullet points, and links
  const renderFormattedText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((paragraph, pIdx) => {
      const lines = paragraph.split("\n");
      return (
        <div key={pIdx} className={pIdx > 0 ? "mt-2.5" : ""}>
          {lines.map((line, lIdx) => {
            const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
            const cleanLine = isBullet ? line.replace(/^[•-]\s*/, "") : line;

            const formattedParts = cleanLine.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g).map((part, partIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={partIdx} className="font-semibold text-[#24130d]">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith("`") && part.endsWith("`")) {
                return (
                  <code
                    key={partIdx}
                    className="bg-[#24130d]/10 text-[#24130d] px-1.5 py-0.5 rounded text-xs font-mono font-bold"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
              if (linkMatch) {
                return (
                  <a
                    key={partIdx}
                    href={linkMatch[2]}
                    target={linkMatch[2].startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="text-[#a87648] font-bold underline underline-offset-2 hover:text-[#24130d] transition-colors"
                  >
                    {linkMatch[1]}
                  </a>
                );
              }
              return part;
            });

            if (isBullet) {
              return (
                <div key={lIdx} className="flex items-start gap-2 my-1 text-xs sm:text-[13px] leading-relaxed">
                  <span className="text-[#a87648] font-bold text-sm shrink-0 leading-none mt-0.5">•</span>
                  <div>{formattedParts}</div>
                </div>
              );
            }

            return (
              <p key={lIdx} className="text-xs sm:text-[13px] leading-relaxed">
                {formattedParts}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. PROMINENT & HIGH-VISIBILITY FLOATING BUTTON (TRIGGER)      */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-18 right-3.5 sm:bottom-6 sm:right-6 z-[999] flex flex-col items-end pointer-events-auto select-none">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 rounded-full border-2 border-[#d4af37] bg-[#24130d] text-white shadow-[0_12px_35px_rgba(36,19,13,0.5)] hover:border-[#f5d061] hover:bg-[#351c13] transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#d4af37]/40 ${
            isOpen ? "ring-2 ring-[#d4af37]" : ""
          }`}
          aria-label={isOpen ? "Close LIA Chat" : "Ask LIA - Follicia AI Personal Stylist"}
        >
          {isOpen ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f5d061] text-[#24130d] flex items-center justify-center font-bold shadow-md">
              <X className="w-5 h-5" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 shrink-0">
              <LiaGirlAvatar className="w-11 h-11 sm:w-12 sm:h-12" />
              {/* Subtle Pulse Ring */}
              <span className="absolute -inset-1 rounded-full border border-[#f5d061]/50 animate-ping pointer-events-none opacity-40" />
              <span className="absolute -top-2.5 -right-2 bg-gradient-to-r from-[#d4af37] to-[#f5d061] text-[#24130d] text-[9px] font-black tracking-wider px-1.5 py-0.2 rounded-full shadow-sm border border-white">
                LIA
              </span>
            </div>
          )}
        </motion.button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHAT DRAWER / WINDOW MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-[999] w-[calc(100vw-24px)] sm:w-[410px] h-[610px] max-h-[82vh] bg-[#fffdfa] rounded-3xl border-2 border-[#d4af37]/40 shadow-[0_25px_60px_-15px_rgba(36,19,13,0.5)] flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="bg-[#24130d] px-5 py-4 text-white flex items-center justify-between border-b border-[#d4af37]/30 shrink-0">
              <div className="flex items-center gap-3">
                <LiaGirlAvatar className="w-10 h-10 sm:w-11 sm:h-11" />
                <div>
                  <h3 className="font-serif text-base font-bold tracking-tight text-[#fffdf8] flex items-center gap-2">
                    LIA
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#f5d061]/20 text-[#f5d061] border border-[#f5d061]/50 font-bold">
                      Follicia AI
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/80 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Personal Stylist & Concierge · Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Reset conversation"
                  aria-label="Reset chat history"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close"
                  aria-label="Close chat window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-2 bg-[#f6eee3] border-b border-[#4b261a15] overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(item.query)}
                  className="whitespace-nowrap px-3 py-1 rounded-full bg-white border border-[#4b261a20] text-[11px] font-semibold text-[#24130d] hover:bg-[#24130d] hover:text-[#f5d061] hover:border-[#24130d] transition-all cursor-pointer shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#fffdfa]">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-full`}
                  >
                    <div
                      className={`relative px-4 py-3 rounded-2xl max-w-[88%] text-[#24130d] ${
                        isUser
                          ? "bg-[#24130d] text-white rounded-tr-xs shadow-sm"
                          : "bg-[#fbf6ed] border border-[#d4af37]/30 rounded-tl-xs shadow-2xs"
                      }`}
                    >
                      {/* Sender label */}
                      {!isUser && (
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[#a87648] mb-1.5 flex items-center gap-1.5">
                          <LiaGirlAvatar className="w-5 h-5" />
                          <span>LIA · Follicia AI</span>
                        </div>
                      )}

                      {/* Formatted body */}
                      <div className={isUser ? "text-white text-xs sm:text-[13px] leading-relaxed" : ""}>
                        {isUser ? msg.text : renderFormattedText(msg.text)}
                      </div>

                      {/* Product Recommendation Cards */}
                      {msg.productCards && msg.productCards.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-[#4b261a15] pt-2.5">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#a87648]">
                            Recommended Designs
                          </p>
                          <div className="grid gap-2">
                            {msg.productCards.map((prod) => (
                              <div
                                key={prod.id}
                                className="flex items-center gap-3 p-2 bg-white rounded-xl border border-[#4b261a15] hover:border-[#d4af37] transition-colors shadow-2xs group"
                              >
                                <img
                                  src={prod.image}
                                  alt={prod.title}
                                  className="w-14 h-14 object-cover rounded-lg bg-[#fbf6ed] shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-[#24130d] truncate">{prod.title}</h4>
                                  <p className="text-[10px] text-[#24130d]/70 truncate">
                                    {prod.collection || "Follicia"} · {prod.category || "Footwear"}
                                  </p>
                                  <p className="text-xs font-serif font-bold text-[#a87648] mt-0.5">
                                    {prod.price}
                                  </p>
                                </div>
                                <a
                                  href={`#/shop/${prod.id.toLowerCase()}`}
                                  onClick={() => {
                                    if (window.innerWidth < 640) setIsOpen(false);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#24130d] text-[#f5d061] text-[10px] font-bold uppercase tracking-wider hover:bg-[#a87648] hover:text-white transition-colors shrink-0"
                                >
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live Order Tracking Card */}
                      {msg.orderCard && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-[#4b261a20] shadow-2xs space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-[#4b261a10] pb-1.5">
                            <span className="font-mono font-bold text-[#24130d]">{msg.orderCard.id}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                              {msg.orderCard.deliveryStatus}
                            </span>
                          </div>
                          <div className="space-y-1 text-[#24130d]/80 text-[11px]">
                            <p>
                              <strong>Design:</strong> {msg.orderCard.product} (Size: {msg.orderCard.size})
                            </p>
                            <p>
                              <strong>Amount:</strong> {msg.orderCard.amount}
                            </p>
                            <p>
                              <strong>White-Glove ETA:</strong> {msg.orderCard.deliveryEta}
                            </p>
                            <p>
                              <strong>Tracking Code:</strong>{" "}
                              <code className="bg-[#f6eee3] px-1 py-0.5 rounded font-mono">
                                {msg.orderCard.trackingCode}
                              </code>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Human Support Card */}
                      {msg.contactCard && (
                        <div className="mt-3 p-3 bg-[#f6eee3] rounded-xl border border-[#d4af37]/50 shadow-2xs space-y-2.5">
                          <div className="flex items-center gap-2 text-[#24130d]">
                            <Phone className="w-4 h-4 text-[#a87648]" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#24130d]">
                              Follicia Concierge Support
                            </h4>
                          </div>
                          <p className="text-[11px] text-[#24130d]/80 leading-snug">
                            Connect directly with a dedicated footwear specialist for immediate sizing, order queries, or appointments.
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={`tel:${msg.contactCard.phone.replace(/[^\d+]/g, "")}`}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#24130d] text-[#f5d061] rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-[#381e14] transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#f5d061]" /> Call Desk
                            </a>
                            <a
                              href={msg.contactCard.whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const url = msg.contactCard!.whatsapp;
                                const w = window.open(url, "_blank");
                                if (!w) window.location.assign(url);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-800 transition-colors cursor-pointer"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {msg.actionButtons && msg.actionButtons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-[#4b261a15]">
                          {msg.actionButtons.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              type="button"
                              onClick={() => handleActionButton(btn)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-[#4b261a20] text-[#24130d] text-[11px] font-semibold hover:bg-[#24130d] hover:text-[#f5d061] hover:border-[#24130d] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <span>{btn.label}</span>
                              <ArrowRight className="w-3 h-3 opacity-60" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <span
                        className={`block text-[9px] mt-1.5 opacity-60 ${
                          isUser ? "text-right text-white/80" : "text-left text-[#24130d]/60"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 p-3 bg-[#fbf6ed] border border-[#d4af37]/30 rounded-2xl rounded-tl-xs w-24">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-[#fffdfa] border-t border-[#4b261a15] shrink-0"
            >
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask LIA about designs, styling, sizing, orders..."
                  className="w-full bg-[#fbf6ed] border border-[#4b261a25] rounded-xl pl-4 pr-12 py-3 text-xs sm:text-sm text-[#24130d] placeholder-[#24130d]/40 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 p-2 rounded-lg bg-[#24130d] text-[#f5d061] hover:bg-[#381e14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-[#24130d]/60">
                <span className="flex items-center gap-1">
                  <LiaGirlAvatar className="w-3.5 h-3.5 inline-block" /> LIA · Follicia AI Stylist
                </span>
                <a
                  href={`tel:${FOLLICIA_SUPPORT_CONTACT.phoneRaw}`}
                  className="text-[#a87648] font-bold hover:underline"
                >
                  Phone Desk: {FOLLICIA_SUPPORT_CONTACT.phone}
                </a>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* RAISE A TICKET MODAL                                           */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {showTicketModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowTicketModal(false); setTicketSuccess(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#fffdfa] rounded-2xl border-2 border-[#d4af37]/40 shadow-[0_25px_60px_-15px_rgba(36,19,13,0.5)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-[#24130d] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#a87648] via-[#d4af37] to-[#f5d061] text-[#24130d] flex items-center justify-center">
                    <Ticket className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#fffdf8]">Raise a Ticket</h3>
                    <p className="text-[10px] text-[#d4af37]/80">Submit your query to our concierge team</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowTicketModal(false); setTicketSuccess(false); }}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {ticketSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-3xl">✅</span>
                    </div>
                    <h4 className="font-serif text-lg font-bold text-[#24130d]">Ticket Submitted!</h4>
                    <p className="text-sm text-[#4b261a]/70 mt-2">Our team will get back to you shortly.</p>
                  </div>
                ) : (
                  <>
                    {/* Customer Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#24130d]/70 mb-1.5">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="w-full bg-[#fbf6ed] border border-[#4b261a25] rounded-xl px-4 py-3 text-sm text-[#24130d] placeholder-[#24130d]/40 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all"
                      />
                    </div>

                    {/* Email ID */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#24130d]/70 mb-1.5">
                        Email ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={ticketForm.email}
                        onChange={(e) => setTicketForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                        className="w-full bg-[#fbf6ed] border border-[#4b261a25] rounded-xl px-4 py-3 text-sm text-[#24130d] placeholder-[#24130d]/40 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all"
                      />
                    </div>

                    {/* Contact No */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#24130d]/70 mb-1.5">
                        Contact No
                      </label>
                      <input
                        type="tel"
                        value={ticketForm.phone}
                        onChange={(e) => setTicketForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                        className="w-full bg-[#fbf6ed] border border-[#4b261a25] rounded-xl px-4 py-3 text-sm text-[#24130d] placeholder-[#24130d]/40 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all"
                      />
                    </div>

                    {/* Query */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#24130d]/70 mb-1.5">
                        Your Query <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={ticketForm.query}
                        onChange={(e) => setTicketForm((prev) => ({ ...prev, query: e.target.value }))}
                        placeholder="Describe your issue or question..."
                        rows={3}
                        className="w-full bg-[#fbf6ed] border border-[#4b261a25] rounded-xl px-4 py-3 text-sm text-[#24130d] placeholder-[#24130d]/40 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={() => void handleTicketSubmit()}
                      disabled={ticketSubmitting || !ticketForm.name.trim() || !ticketForm.email.trim() || !ticketForm.query.trim()}
                      className="w-full py-3 bg-[#24130d] text-[#f5d061] font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-[#381e14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {ticketSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#f5d061]/30 border-t-[#f5d061] rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Ticket
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-center text-[#24130d]/50">
                      Your ticket will be sent to <strong>info@follicia.in</strong> and our concierge team.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
