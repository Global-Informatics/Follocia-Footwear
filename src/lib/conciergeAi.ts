import { getProducts, getOrders, productPrimaryImage, type CommerceProduct, type CommerceOrder } from "./commerceStore";
import { FOLLICIA_PRODUCTS, FOLLICIA_COLLECTIONS, formatINR, type FolliciaProduct } from "@/data/folliciaCatalogue";
import { getLaunchPrivilegeState, getUserDiscountEligibility } from "./launchDiscounts";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  actionButtons?: { label: string; action: string; payload?: string }[];
  productCards?: {
    id: string;
    title: string;
    image: string;
    price: string;
    category?: string;
    collection?: string;
    material?: string;
  }[];
  orderCard?: {
    id: string;
    product: string;
    size: string;
    status: string;
    deliveryStatus: string;
    deliveryEta: string;
    trackingCode: string;
    amount: string;
  };
  contactCard?: {
    phone: string;
    whatsapp: string;
    email: string;
    hours: string;
    studio: string;
  };
}

export const FOLLICIA_SUPPORT_CONTACT = {
  phone: "+91 7082216801",
  phoneRaw: "+917082216801",
  whatsapp: "https://wa.me/917082216801?text=Hello%20Follicia%20Private%20Concierge",
  whatsappUrl: "https://wa.me/917082216801?text=Hello%20Follicia%20Private%20Concierge",
  email: "info@follicia.in",
  hours: "Monday – Saturday, 10:00 AM – 7:00 PM IST",
  studio: "First Floor, 513/8 Chhunipura, Kirpal Nagar, Rohtak, Haryana 124001, India (Powered by Groupe Ras Mondial)",
};

export const QUICK_PROMPTS = [
  { label: "👠 How to Order", query: "How do I place an order on Follicia?" },
  { label: "📞 Talk to Support Team", query: "Can I speak to your customer support team or get your contact number?" },
  { label: "📏 Sizing Guide", query: "How do I find my shoe size?" },
  { label: "📦 Track My Order", query: "Track my order" },
  { label: "🏷️ Launch Privileges", query: "What discounts or offers are currently available?" },
  { label: "✨ Best Sellers", query: "Show me your most popular heels and flats" },
  { label: "🚚 Delivery & Returns", query: "What is your shipping and return policy?" },
  { label: "🎫 Raise a Ticket", query: "raise a ticket" },
];

/**
 * Normalizes user text for intent matching.
 */
function clean(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Searches the live store catalog for matching products.
 */
export function findMatchingProducts(query: string, limit = 3) {
  const q = clean(query);
  const products = getProducts();

  let matches: CommerceProduct[] = [];

  // 1. Specific collections
  if (q.includes("aura")) {
    matches = products.filter((p) => p.collection?.toLowerCase() === "aura" || p.title.toLowerCase().includes("aura"));
  } else if (q.includes("bloom")) {
    matches = products.filter((p) => p.collection?.toLowerCase() === "bloom" || p.title.toLowerCase().includes("bloom"));
  } else if (q.includes("muse")) {
    matches = products.filter((p) => p.collection?.toLowerCase() === "muse" || p.title.toLowerCase().includes("muse"));
  } else if (q.includes("noire") || q.includes("noir")) {
    matches = products.filter((p) => p.collection?.toLowerCase() === "noire" || p.title.toLowerCase().includes("noire"));
  }

  // 2. Specific categories
  if (matches.length === 0) {
    if (q.includes("heel") || q.includes("stiletto") || q.includes("pump")) {
      matches = products.filter((p) => p.category?.toLowerCase() === "heel" || p.silhouette?.toLowerCase().includes("heel"));
    } else if (q.includes("flat") || q.includes("ballerina") || q.includes("loafer") || q.includes("slide")) {
      matches = products.filter((p) => p.category?.toLowerCase() === "flat" || p.silhouette?.toLowerCase().includes("flat"));
    } else if (q.includes("mule") || q.includes("slip on")) {
      matches = products.filter((p) => p.category?.toLowerCase() === "mule" || p.silhouette?.toLowerCase().includes("mule"));
    } else if (q.includes("boot") || q.includes("ankle")) {
      matches = products.filter((p) => p.category?.toLowerCase() === "boot" || p.silhouette?.toLowerCase().includes("boot"));
    }
  }

  // 3. Specific product title or keyword match
  if (matches.length === 0) {
    matches = products.filter((p) => {
      const titleWords = clean(p.title).split(" ");
      return titleWords.some((w) => w.length > 3 && q.includes(w)) || q.includes(p.id.toLowerCase());
    });
  }

  // 4. Default to top featured pieces
  if (matches.length === 0) {
    matches = products.slice(0, limit);
  }

  return matches.slice(0, limit).map((p) => ({
    id: p.id,
    title: p.title,
    image: productPrimaryImage(p),
    price: typeof p.price === "number" ? formatINR.format(p.price) : String(p.price),
    category: p.category || p.silhouette,
    collection: p.collection,
    material: p.material || "Italian Lambskin Leather & Memory Cushion",
  }));
}

/**
 * Searches orders by ID or customer email.
 */
export function lookupOrder(query: string, userEmail?: string): CommerceOrder | null {
  const orders = getOrders();
  const q = query.trim().toUpperCase();

  // Match order id like ORD-1234 or numbers
  const matchedById = orders.find((o) => {
    const oId = o.id.toUpperCase();
    return oId === q || oId.replace(/[^\w]/g, "").includes(q.replace(/[^\w]/g, "")) || q.includes(oId);
  });

  if (matchedById) return matchedById;

  // If user is logged in, find recent order
  if (userEmail) {
    const userOrders = orders.filter((o) => o.email.toLowerCase() === userEmail.toLowerCase());
    if (userOrders.length > 0) return userOrders[userOrders.length - 1];
  }

  return null;
}

/**
 * Intelligent English NLP Dispatcher for Follicia Private Concierge.
 * Answers in elegant English while seamlessly understanding English, Hindi, and Hinglish inputs.
 */
export function generateConciergeReply(
  userQuery: string,
  userEmail?: string,
  userName?: string
): Omit<ChatMessage, "id" | "timestamp"> {
  const q = clean(userQuery);
  const rawQ = userQuery.trim();

  // -------------------------------------------------------------
  // 0. RAISE A TICKET / SUPPORT TICKET / ISSUE / COMPLAINT
  // -------------------------------------------------------------
  const isTicketIntent =
    q.includes("ticket") ||
    q.includes("raise a ticket") ||
    q.includes("raise ticket") ||
    q.includes("create ticket") ||
    q.includes("open ticket") ||
    q.includes("raise a track") ||
    q.includes("raise track") ||
    q.includes("complaint") ||
    q.includes("complain") ||
    q.includes("issue");

  if (isTicketIntent) {
    return {
      sender: "bot",
      text: `You can raise an official support ticket directly with our Follicia Concierge team.\n\nPlease click the **🎫 Raise a Ticket** button below to open the ticket form where you can submit your details and query. Our team will review it and get back to you at **info@follicia.in**.`,
      actionButtons: [
        { label: "🎫 Raise a Ticket", action: "raise-ticket", payload: "" },
        { label: "💬 Chat on WhatsApp", action: "link", payload: FOLLICIA_SUPPORT_CONTACT.whatsappUrl },
        { label: "📞 Call Support", action: "call", payload: FOLLICIA_SUPPORT_CONTACT.phoneRaw },
      ],
    };
  }

  // -------------------------------------------------------------
  // 1. TALK TO HUMAN / TEAM / CONTACT NUMBER / CALL / WHATSAPP
  // -------------------------------------------------------------
  const isContactIntent =
    q.includes("contact") ||
    q.includes("phone") ||
    q.includes("call") ||
    q.includes("number") ||
    q.includes("whatsapp") ||
    q.includes("human") ||
    q.includes("agent") ||
    q.includes("person") ||
    q.includes("support team") ||
    q.includes("customer care") ||
    q.includes("help desk") ||
    q.includes("baat karn") ||
    q.includes("baat karni") ||
    q.includes("baat krna") ||
    q.includes("call karna") ||
    q.includes("phone number") ||
    q.includes("team se") ||
    q.includes("care no") ||
    q.includes("helpline") ||
    q.includes("speak to");

  if (isContactIntent) {
    return {
      sender: "bot",
      text: `Our dedicated **Follicia Customer Care Specialist Team** is delighted to assist you directly with custom sizing, orders, or private appointments:\n\n` +
        `• **Direct Phone Support:** [${FOLLICIA_SUPPORT_CONTACT.phone}](tel:${FOLLICIA_SUPPORT_CONTACT.phoneRaw})\n` +
        `• **WhatsApp Concierge:** Instant 1-on-1 luxury advisory\n` +
        `• **Email Support:** [${FOLLICIA_SUPPORT_CONTACT.email}](mailto:${FOLLICIA_SUPPORT_CONTACT.email})\n` +
        `• **Concierge Hours:** ${FOLLICIA_SUPPORT_CONTACT.hours}\n` +
        `• **Follicia Studio:** ${FOLLICIA_SUPPORT_CONTACT.studio}\n\n` +
        `You may tap the buttons below to initiate an immediate phone call or WhatsApp conversation:`,
      contactCard: FOLLICIA_SUPPORT_CONTACT,
      actionButtons: [
        { label: "📞 Call Support Now", action: "call", payload: FOLLICIA_SUPPORT_CONTACT.phoneRaw },
        { label: "💬 Chat on WhatsApp", action: "link", payload: FOLLICIA_SUPPORT_CONTACT.whatsappUrl },
        { label: "📍 View Studio Details", action: "navigate", payload: "#/contact" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 2. HOW TO ORDER / ORDER PROCESS
  // -------------------------------------------------------------
  const isHowToOrderIntent =
    q.includes("how to order") ||
    q.includes("order kaise") ||
    q.includes("kaise order kare") ||
    q.includes("order process") ||
    q.includes("place order") ||
    q.includes("buying process") ||
    q.includes("how do i buy") ||
    q.includes("purchase guide") ||
    q.includes("kharidna") ||
    q.includes("how to buy") ||
    q.includes("booking kaise");

  if (isHowToOrderIntent) {
    return {
      sender: "bot",
      text: `Ordering handcrafted luxury footwear from Follicia is seamless and secure:\n\n` +
        `1. **Explore the Collections:** Browse through our curated lines (**Aura, Bloom, Muse, Noire**) or visit the **Shop** page.\n` +
        `2. **Select Size & Colour:** Choose your European shoe size (**EU 38 to EU 41**, or custom size enquiry) and preferred shade.\n` +
        `3. **Add to Shopping Bag:** Click **"Add to Bag"** or **"Reserve Pair"**.\n` +
        `4. **Unlock Early-Bird Privileges:** When you log in or register, your exclusive early-bird launch privilege (**35% OFF** with code \`LAUNCH35\`) will automatically be available in your bag!\n` +
        `5. **White-Glove Delivery Address:** Enter your delivery address or use our 1-click GPS auto-fill.\n` +
        `6. **Secure Payment:** Complete checkout smoothly via UPI, Credit/Debit Card, or Net Banking.\n\n` +
        `Would you like to explore our latest arrivals now?`,
      actionButtons: [
        { label: "👠 Explore Full Shop", action: "navigate", payload: "#/shop" },
        { label: "📏 View Sizing Guide", action: "ask", payload: "How do I find my shoe size?" },
        { label: "🏷️ Check Launch Privileges", action: "ask", payload: "What discounts are available?" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 3. LIVE ORDER TRACKING / STATUS
  // -------------------------------------------------------------
  const isOrderTrackingIntent =
    q.includes("track") ||
    q.includes("order status") ||
    q.includes("kahan hai mera order") ||
    q.includes("where is my order") ||
    q.includes("delivery status") ||
    q.includes("tracking code") ||
    q.includes("order kab aayega") ||
    q.includes("dispatch") ||
    /\bord[-_]?\d+/i.test(rawQ) ||
    (rawQ.length >= 6 && /\d{4,}/.test(rawQ) && (q.includes("ord") || q.includes("#")));

  if (isOrderTrackingIntent) {
    const foundOrder = lookupOrder(rawQ, userEmail);

    if (foundOrder) {
      return {
        sender: "bot",
        text: `Here is the real-time status of your Follicia order:\n\n` +
          `• **Order Reference:** \`${foundOrder.id}\`\n` +
          `• **Design:** ${foundOrder.product} (Size: ${foundOrder.size})\n` +
          `• **Delivery Stage:** **${foundOrder.deliveryStatus}** (${foundOrder.status})\n` +
          `• **Payment Status:** ${foundOrder.paymentStatus} (${foundOrder.amount})\n` +
          `• **White-Glove ETA:** ${foundOrder.deliveryEta}\n` +
          `• **Courier Tracking Code:** \`${foundOrder.trackingCode}\`\n\n` +
          `All Follicia pieces are dispatched in our signature insulated gold-embossed presentation boxes.`,
        orderCard: {
          id: foundOrder.id,
          product: foundOrder.product,
          size: foundOrder.size,
          status: foundOrder.status,
          deliveryStatus: foundOrder.deliveryStatus,
          deliveryEta: foundOrder.deliveryEta,
          trackingCode: foundOrder.trackingCode,
          amount: foundOrder.amount,
        },
        actionButtons: [
          { label: "📦 View All My Orders", action: "navigate", payload: "#/account/my-orders" },
          { label: "📞 Support Assistance", action: "call", payload: FOLLICIA_SUPPORT_CONTACT.phoneRaw },
        ],
      };
    }

    // If order was not found
    return {
      sender: "bot",
      text: `To track your shipment, please provide your **Order ID** (for example: \`ORD-2025-01\`).\n\n` +
        (userEmail
          ? `You are currently signed in, but no active order records were found under your email. If you placed an order using a different email, please enter your Order ID.`
          : `If you have placed an order, you can also sign in to your account and review your live updates under **My Orders**.`),
      actionButtons: [
        { label: "📦 Go to My Orders", action: "navigate", payload: "#/account/my-orders" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 4. SIZING GUIDE / SIZE CHART / FIT ADVICE
  // -------------------------------------------------------------
  const isSizingIntent =
    q.includes("size") ||
    q.includes("chart") ||
    q.includes("fit") ||
    q.includes("measurement") ||
    q.includes("fitting") ||
    q.includes("size guide") ||
    q.includes("kaunsa size") ||
    q.includes("chhota") ||
    q.includes("bada");

  if (isSizingIntent) {
    return {
      sender: "bot",
      text: `**Follicia Footwear Size & Fit Guide:**\n\n` +
        `All Follicia pairs follow standard European (**EU**) sizing and are engineered for true-to-size comfort:\n\n` +
        `• **EU 35:** 22.5 cm foot length\n` +
        `• **EU 36:** 23.0 cm foot length\n` +
        `• **EU 37:** 23.8 cm foot length\n` +
        `• **EU 38:** 24.5 cm foot length *(Most Popular)*\n` +
        `• **EU 39:** 25.2 cm foot length\n` +
        `• **EU 40:** 25.8 cm foot length\n` +
        `• **EU 41:** 26.5 cm foot length\n` +
        `• **EU 42–43:** 27.2 – 28.0 cm *(Bespoke Private Fit)*\n\n` +
        `**Fit & Comfort Recommendations:**\n` +
        `• **Pointed Toes / Wider Feet:** If you have wider feet or are purchasing pointed stilettos, we suggest choosing **one size up** for optimal comfort.\n` +
        `• **Dual-Density Cushioning:** Every sole features our memory foam footbed designed for 8+ hours of effortless wear.\n` +
        `• **7-Day Complimentary Exchange:** If the size is not perfect, we offer free doorstep exchange!`,
      actionButtons: [
        { label: "👠 View Popular Heels", action: "ask", payload: "Show me popular heels" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 5. LAUNCH OFFERS / COUPONS / DISCOUNTS
  // -------------------------------------------------------------
  const isDiscountIntent =
    q.includes("discount") ||
    q.includes("coupon") ||
    q.includes("offer") ||
    q.includes("promo") ||
    q.includes("code") ||
    q.includes("chhoot") ||
    q.includes("launch35") ||
    q.includes("welcome15") ||
    q.includes("price kam");

  if (isDiscountIntent) {
    const launchState = getLaunchPrivilegeState();
    const remainingSpots = Math.max(0, 10 - launchState.completedUsers.length);

    return {
      sender: "bot",
      text: `**Exclusive Follicia Launch Privileges:**\n\n` +
        `• **Early-Bird Launch Privilege (First 10 Orders):** The first 10 unique patrons to place an order receive a flat **35% OFF** using code **\`LAUNCH35\`**!\n` +
        (remainingSpots > 0
          ? `  *(🔥 Only ${remainingSpots} VIP spots currently remaining)*\n`
          : `  *(Note: All 10 initial early-bird spots have been claimed)*\n`) +
        `• **Welcome Privilege:** All subsequent patrons enjoy **15% OFF** with code **\`WELCOME15\`**.\n\n` +
        `**How to Claim:**\n` +
        `Once you sign in or create an account, your available privilege code is automatically unlocked and can be applied with **1-tap** in your Cart Drawer or Checkout Summary!`,
      actionButtons: [
        { label: "🛍️ Shop the Collection", action: "navigate", payload: "#/shop" },
        { label: "👜 View My Bag", action: "navigate", payload: "#/shop" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 6. SHIPPING / DELIVERY / RETURN & EXCHANGE POLICIES
  // -------------------------------------------------------------
  const isPolicyIntent =
    q.includes("shipping") ||
    q.includes("delivery") ||
    q.includes("return") ||
    q.includes("exchange") ||
    q.includes("refund") ||
    q.includes("replacement") ||
    q.includes("cancel") ||
    q.includes("wapas") ||
    q.includes("badalna") ||
    q.includes("charges");

  if (isPolicyIntent) {
    return {
      sender: "bot",
      text: `**Follicia Shipping & Concierge Exchange Policy:**\n\n` +
        `• **Complimentary Insured Delivery:** We provide complimentary insured courier shipping across all pin codes in India.\n` +
        `• **Delivery Timelines:** 3–5 business days for major metros; express and bespoke fitting delivery dispatched within 1–2 days.\n` +
        `• **7-Day Doorstep Exchange:** If there are any concerns regarding size, fit, or styling, our concierge arranges doorstep exchange within 7 days of delivery.\n` +
        `• **Boutique Packaging:** Every pair arrives enclosed in satin dust bags with personalized certification of craftsmanship.\n\n` +
        `Should you require personal assistance with an ongoing delivery, please call or WhatsApp our concierge at **${FOLLICIA_SUPPORT_CONTACT.phone}**.`,
      contactCard: FOLLICIA_SUPPORT_CONTACT,
      actionButtons: [
        { label: "💬 WhatsApp for Exchange", action: "link", payload: FOLLICIA_SUPPORT_CONTACT.whatsappUrl },
        { label: "📄 Read Terms & Conditions", action: "navigate", payload: "#/terms" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 7. PRODUCT SEARCH & RECOMMENDATIONS (HEELS, FLATS, MULES, BOOTS)
  // -------------------------------------------------------------
  const isProductSearchIntent =
    q.includes("product") ||
    q.includes("heel") ||
    q.includes("flat") ||
    q.includes("mule") ||
    q.includes("boot") ||
    q.includes("aura") ||
    q.includes("bloom") ||
    q.includes("muse") ||
    q.includes("noire") ||
    q.includes("price") ||
    q.includes("collection") ||
    q.includes("material") ||
    q.includes("leather") ||
    q.includes("shoes") ||
    q.includes("joot") ||
    q.includes("sandal") ||
    q.includes("dikhao") ||
    q.includes("show me") ||
    q.includes("recommend") ||
    q.includes("popular") ||
    q.includes("best seller");

  if (isProductSearchIntent) {
    const matched = findMatchingProducts(rawQ, 3);
    const categoryName = q.includes("flat")
      ? "Luxury Flats & Loafers"
      : q.includes("heel")
      ? "Architectural Heels & Stilettos"
      : q.includes("mule")
      ? "Bespoke Mules"
      : q.includes("boot")
      ? "Ankle & Silhouette Boots"
      : "Handcrafted Luxury Footwear";

    return {
      sender: "bot",
      text: `Here are our recommended **${categoryName}** selected from the Follicia Master Footwear:\n\n` +
        `Each pair is crafted from premium Italian calfskin and satin, fitted with architectural balanced heels and proprietary cloud-soft footbeds. Tap on any card below to view details or reserve:`,
      productCards: matched,
      actionButtons: [
        { label: "👠 Explore Full Shop", action: "navigate", payload: "#/shop" },
        { label: "✨ Aura Collection", action: "navigate", payload: "#/collection/aura" },
        { label: "🖤 Noire Evening Line", action: "navigate", payload: "#/collection/noire" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 8. WHO ARE YOU / NAME / ABOUT LIA
  // -------------------------------------------------------------
  const isIdentityIntent =
    q.includes("who are you") ||
    q.includes("your name") ||
    q.includes("what is your name") ||
    q.includes("naam kya hai") ||
    q.includes("kya naam") ||
    q.includes("tum kaun ho") ||
    q.includes("aap kaun ho") ||
    q === "lia" ||
    q.startsWith("lia ") ||
    q.includes("about lia") ||
    q.includes("tell me about yourself");

  if (isIdentityIntent) {
    return {
      sender: "bot",
      text: `I am **LIA** ✨ Your dedicated **AI Personal Stylist & Luxury Concierge** at **Follicia**.\n\n` +
        `I am crafted to deliver an attentive, couture shopping experience:\n` +
        `• **Personal Footwear Styling:** Curating the ideal pair for weddings, soirées, work, or daily elegance.\n` +
        `• **Architectural Fit & Sizing:** True-to-size recommendations across EU sizes 35 to 43.\n` +
        `• **Order & Shipment Guidance:** Guiding your checkout, applying launch privileges (35% OFF with \`LAUNCH35\`), and tracking orders live.\n` +
        `• **White-Glove Care Desk:** Instantly connecting you with our human footwear specialists via Phone or WhatsApp.\n\n` +
        `How may I assist your style journey today?`,
      actionButtons: [
        { label: "✨ Popular Heels & Flats", action: "ask", payload: "Show me your most popular heels and flats" },
        { label: "👠 How to Order", action: "ask", payload: "How do I place an order on Follicia?" },
        { label: "📏 Find My Shoe Size", action: "ask", payload: "How do I find my shoe size?" },
        { label: "📞 Connect to Human Team", action: "call", payload: FOLLICIA_SUPPORT_CONTACT.phoneRaw },
      ],
    };
  }

  // -------------------------------------------------------------
  // 9. GREETINGS (HELLO / HI / NAMASTE)
  // -------------------------------------------------------------
  const isGreeting =
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q === "namaste" ||
    q.startsWith("hello") ||
    q.startsWith("hi ") ||
    q.startsWith("good morning") ||
    q.startsWith("good evening");

  if (isGreeting) {
    const greetingName = userName ? `, ${userName}` : "";
    return {
      sender: "bot",
      text: `Hello${greetingName}! I am **LIA**, your **Follicia AI Personal Stylist & Concierge** ✨\n\n` +
        `How may I assist your styling or ordering experience today? You may ask me about:\n` +
        `• **Style Recommendations** – Handcrafted stilettos, flats, mules & boots\n` +
        `• **Sizing & Fit Advice** – EU 35 to 43 measurement guide\n` +
        `• **How to Order** – Step-by-step purchasing guide\n` +
        `• **Live Order Tracking** – Real-time updates on your shipment\n` +
        `• **Launch Privileges** – 35% Early-bird offer details\n` +
        `• **Human Support Team** – Direct phone call or WhatsApp desk\n\n` +
        `What would you like to explore?`,
      actionButtons: [
        { label: "👠 How to Order", action: "ask", payload: "How do I place an order?" },
        { label: "✨ Popular Designs", action: "ask", payload: "Show me your most popular heels and flats" },
        { label: "📞 Speak with Support Team", action: "ask", payload: "I want to talk to customer care team" },
        { label: "📦 Track My Order", action: "ask", payload: "Track my order" },
        { label: "📏 Sizing Guide", action: "ask", payload: "Show me the sizing guide" },
      ],
    };
  }

  // -------------------------------------------------------------
  // 10. DEFAULT / CONTEXTUAL FALLBACK
  // -------------------------------------------------------------
  const defaultProducts = findMatchingProducts("heels", 2);
  return {
    sender: "bot",
    text: `I am **LIA**, your Follicia AI Personal Stylist & Concierge ✨ I am delighted to assist you with:\n\n` +
      `1. **Footwear & Styling:** Heels, flats, mules, bespoke collections, and prices.\n` +
      `2. **Ordering & Tracking:** Order placement assistance and real-time delivery status.\n` +
      `3. **Size Selection:** Centimeter measurements and wide-foot comfort recommendations.\n` +
      `4. **Customer Care Team:** Direct telephone or WhatsApp assistance with our human footwear specialists.\n\n` +
      `Please select an option below or call our concierge desk directly at **${FOLLICIA_SUPPORT_CONTACT.phone}**.`,
    productCards: defaultProducts,
    contactCard: FOLLICIA_SUPPORT_CONTACT,
    actionButtons: [
      { label: "📞 Call Customer Care", action: "call", payload: FOLLICIA_SUPPORT_CONTACT.phoneRaw },
      { label: "💬 Chat on WhatsApp", action: "link", payload: FOLLICIA_SUPPORT_CONTACT.whatsappUrl },
      { label: "👠 How to Order Guide", action: "ask", payload: "How do I place an order on Follicia?" },
    ],
  };
}
