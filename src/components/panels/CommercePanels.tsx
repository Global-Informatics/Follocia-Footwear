import { motion } from "framer-motion";
import type { ReactNode } from "react";
import c1 from "@/assets/collection-1.jpg";
import c2 from "@/assets/collection-2.jpg";
import c3 from "@/assets/collection-3.jpg";
import atelier from "@/assets/atelier.jpg";

type Metric = { label: string; value: string; delta: string; tone?: "good" | "warn" };
type Product = { name: string; edition: string; price: string; status: string; produced: number; reserved: number; available: number };
type Order = { id: string; customer: string; product: string; size: string; amount: string; status: string; date: string };
type Task = { title: string; owner: string; due: string; priority: string };

const adminMetrics: Metric[] = [
  { label: "Annual pairs planned", value: "08", delta: "+2 from last atelier" },
  { label: "Reserved value", value: "EUR 32.7k", delta: "+18% this drop" },
  { label: "VIP waitlist", value: "1,284", delta: "92 high-intent" },
  { label: "Pairs remaining", value: "17", delta: "Limited stock", tone: "warn" },
];

const products: Product[] = [
  { name: "Atelier 01 - Lumiere", edition: "Edition of 220", price: "EUR 1,480", status: "Live", produced: 220, reserved: 184, available: 36 },
  { name: "Atelier 02 - Noir Suspendu", edition: "Edition of 180", price: "EUR 1,640", status: "Live", produced: 180, reserved: 168, available: 12 },
  { name: "Atelier 03 - Or Liquide", edition: "Edition of 140", price: "EUR 1,820", status: "Private Preview", produced: 140, reserved: 121, available: 19 },
  { name: "Atelier 04 - Rosso Vow", edition: "Edition of 80", price: "EUR 2,120", status: "Draft", produced: 80, reserved: 0, available: 80 },
];

const orders: Order[] = [
  { id: "RSV-1048", customer: "Camille R.", product: "Atelier 03 - Or Liquide", size: "38", amount: "EUR 1,820", status: "Concierge Review", date: "Today" },
  { id: "RSV-1047", customer: "Ananya S.", product: "Atelier 02 - Noir Suspendu", size: "39", amount: "EUR 1,640", status: "Fitting Booked", date: "Today" },
  { id: "RSV-1046", customer: "Sofia M.", product: "Atelier 01 - Lumiere", size: "37", amount: "EUR 1,480", status: "White-glove Dispatch", date: "Yesterday" },
  { id: "RSV-1045", customer: "Elena V.", product: "Atelier 02 - Noir Suspendu", size: "40", amount: "EUR 1,640", status: "Paid", date: "May 10" },
];

const tasks: Task[] = [
  { title: "Approve Or Liquide private preview shortlist", owner: "Nadia", due: "2h", priority: "High" },
  { title: "Confirm Paris fitting slot for Camille R.", owner: "Elise", due: "Today", priority: "High" },
  { title: "Update atelier capacity for Rosso Vow", owner: "Marco", due: "Tomorrow", priority: "Medium" },
  { title: "Prepare archive certificate for Sofia M.", owner: "Luca", due: "May 14", priority: "Low" },
];

const userMetrics: Metric[] = [
  { label: "Active reservations", value: "02", delta: "1 fitting pending" },
  { label: "Wishlist pieces", value: "05", delta: "2 nearing close", tone: "warn" },
  { label: "Cercle status", value: "72h", delta: "Early access window" },
  { label: "Lifetime pairs", value: "03", delta: "Collector profile" },
];

const wishlist = [
  { product: "Atelier 03 - Or Liquide", edition: "Edition of 140", availability: "19 pairs left", image: c3 },
  { product: "Atelier 01 - Lumiere", edition: "Edition of 220", availability: "36 pairs left", image: c1 },
  { product: "Atelier 04 - Rosso Vow", edition: "Edition of 80", availability: "Private preview soon", image: atelier },
];

const userReservations = [
  { id: "RSV-1047", product: "Atelier 02 - Noir Suspendu", size: "39", status: "Fitting Booked", amount: "EUR 1,640", eta: "May 18" },
  { id: "RSV-1031", product: "Atelier 01 - Lumiere", size: "38", status: "Certificate Ready", amount: "EUR 1,480", eta: "Delivered" },
  { id: "RSV-0998", product: "Archive 06 - Cristallo", size: "38", status: "Restoration", amount: "EUR 420", eta: "May 21" },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function statusTone(status: string) {
  if (status.includes("Live") || status.includes("Paid") || status.includes("Ready") || status.includes("Booked") || status.includes("Dispatch")) return "text-emerald-700";
  if (status.includes("Preview") || status.includes("Review") || status.includes("Restoration")) return "text-[var(--gold)]";
  return "text-[var(--ink)]/70";
}

function PanelTopbar({ onLogout }: { onLogout?: () => void }) {
  const appRoot = import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL;
  const href = (path: string) => `${appRoot}${path}`.replace(/\/{2,}/g, "/");
  const liveHref = (path: string) => import.meta.env.BASE_URL === "/react/" ? href(path) : `${appRoot}#/${path}`;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink)]/10 bg-[var(--bone)]/85 px-6 backdrop-blur-xl md:px-10">
      <div className="mx-auto flex h-20 max-w-[1700px] items-center justify-between gap-4">
        <a href={appRoot} className="font-display text-2xl tracking-[0.28em] text-[var(--ink)]">FOLLOCIA</a>
        <div className="flex flex-wrap items-center gap-2">
          <a className="border border-[var(--ink)]/15 px-4 py-3 eyebrow text-[var(--ink)]/75 hover:border-[var(--gold)] hover:text-[var(--ink)]" href={liveHref("admin")}>Admin</a>
          <a className="bg-[var(--ink)] px-4 py-3 eyebrow text-[var(--bone)] hover:bg-[var(--gold)] hover:text-[var(--ink)]" href={appRoot}>Storefront</a>
          {onLogout && (
            <button onClick={onLogout} className="border border-[var(--ink)]/15 px-4 py-3 eyebrow text-[var(--ink)]/75 hover:border-[var(--gold)] hover:text-[var(--ink)]">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Sidebar({ title, subtitle, links }: { title: string; subtitle: string; links: string[] }) {
  return (
    <aside className="border border-[var(--bone)]/10 bg-[var(--ink)] p-5 text-[var(--bone)] shadow-[var(--shadow-luxe)] lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
      <h2 className="font-display text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--bone)]/60">{subtitle}</p>
      <nav className="mt-10 grid gap-2">
        {links.map((link, index) => (
          <a
            key={link}
            href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
            className="flex justify-between border border-transparent px-4 py-3 eyebrow text-[var(--bone)]/70 transition-colors hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/10 hover:text-[var(--bone)]"
          >
            {link}
            <span>{String(index + 1).padStart(2, "0")}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.article
          key={metric.label}
          variants={fade}
          transition={{ delay: index * 0.06 }}
          className="border border-[var(--ink)]/10 bg-[var(--ivory)]/75 p-6 shadow-[var(--shadow-soft)]"
        >
          <span className="eyebrow text-[var(--ink)]/50">{metric.label}</span>
          <strong className="mt-4 block font-display text-5xl text-[var(--ink)]">{metric.value}</strong>
          <small className={`mt-3 block text-sm font-semibold ${metric.tone === "warn" ? "text-red-800" : "text-emerald-800"}`}>{metric.delta}</small>
        </motion.article>
      ))}
    </div>
  );
}

function PanelCard({ id, eyebrow, title, action, children }: { id: string; eyebrow: string; title: string; action: string; children: ReactNode }) {
  return (
    <motion.article variants={fade} id={id} className="overflow-hidden border border-[var(--ink)]/10 bg-[var(--ivory)]/75 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--ink)]/10 p-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-[var(--gold)]">{eyebrow}</p>
          <h3 className="mt-2 font-display text-3xl text-[var(--ink)]">{title}</h3>
        </div>
        <span className="eyebrow text-[var(--ink)]/45">{action}</span>
      </div>
      {children}
    </motion.article>
  );
}

function DataTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left">{children}</table></div>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-[var(--ink)]/10 px-6 py-4 eyebrow text-[var(--ink)]/50">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="border-b border-[var(--ink)]/10 px-6 py-4 align-top text-sm text-[var(--ink)]/75">{children}</td>;
}

function HeroPanel({ eyebrow, title, copy, stamp }: { eyebrow: string; title: string; copy: string; stamp: string }) {
  return (
    <motion.section variants={fade} className="relative overflow-hidden bg-[var(--ink)] p-8 text-[var(--bone)] shadow-[var(--shadow-luxe)] luxe-grain md:p-12">
      <div className="absolute right-10 top-10 h-56 w-56 rounded-full bg-[var(--gold)]/15 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow text-[var(--gold)]">{eyebrow}</p>
          <h1 className="mt-5 max-w-5xl font-display text-[clamp(2.6rem,6vw,6rem)] leading-[0.95] text-[var(--bone)]">{title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--bone)]/65">{copy}</p>
        </div>
        <div className="grid h-36 w-36 place-items-center rounded-full border border-[var(--bone)]/20 text-center eyebrow text-[var(--gold)]">{stamp}</div>
      </div>
    </motion.section>
  );
}

function PanelLayout({ children, sidebar, onLogout }: { children: ReactNode; sidebar: ReactNode; onLogout?: () => void }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,oklch(0.78_0.12_80_/_0.18),transparent_28rem),var(--bone)] text-[var(--ink)]">
      <PanelTopbar onLogout={onLogout} />
      <div className="mx-auto grid max-w-[1700px] gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {sidebar}
        <motion.section initial="hidden" animate="visible" transition={{ staggerChildren: 0.08 }} className="grid gap-5">
          {children}
        </motion.section>
      </div>
    </main>
  );
}

export function AdminPanel({ onLogout }: { onLogout?: () => void }) {
  return (
    <PanelLayout onLogout={onLogout} sidebar={<Sidebar title="Admin" subtitle="Control room for a scarce, invitation-led women footwear house." links={["Dashboard", "Reservations", "Inventory", "Customers", "Concierge", "Content"]} />}>
      <HeroPanel eyebrow="Maison operations / MMXXV" title="Premium commerce dashboard for the rare drop cycle." copy="Track limited editions, VIP demand, concierge orders, white-glove dispatch and private fitting tasks from one place." stamp={"8 pairs\nper year"} />
      <MetricGrid metrics={adminMetrics} />

      <div id="content" className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {["Create drop", "Approve VIPs", "Dispatch queue"].map((title, index) => (
          <motion.article key={title} variants={fade} className="border border-[var(--ink)]/10 bg-[var(--ivory)]/75 p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-3xl text-[var(--ink)]">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]/60">
              {index === 0 && "Add edition caps, assets, preview windows and launch inventory."}
              {index === 1 && "Rank collectors, shortlist intent and open private access."}
              {index === 2 && "Review paid reservations, certificates and delivery slots."}
            </p>
          </motion.article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <PanelCard id="reservations" eyebrow="Live commerce" title="Reservation Pipeline" action="Order control">
          <DataTable>
            <thead><tr><Th>Order</Th><Th>Customer</Th><Th>Product</Th><Th>Size</Th><Th>Amount</Th><Th>Status</Th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id}><Td><strong>{order.id}</strong><br />{order.date}</Td><Td>{order.customer}</Td><Td>{order.product}</Td><Td>{order.size}</Td><Td>{order.amount}</Td><Td><span className={`eyebrow ${statusTone(order.status)}`}>{order.status}</span></Td></tr>)}</tbody>
          </DataTable>
        </PanelCard>
        <PanelCard id="concierge" eyebrow="Human layer" title="Concierge Tasks" action="Today">
          <div className="grid gap-3 p-5">{tasks.map((task) => <div key={task.title} className="border border-[var(--ink)]/10 bg-[var(--bone)]/60 p-4"><strong>{task.title}</strong><p className="mt-2 text-sm text-[var(--ink)]/55">{task.owner} - {task.due} - {task.priority}</p></div>)}</div>
        </PanelCard>
      </div>

      <PanelCard id="inventory" eyebrow="Catalogue" title="Edition Inventory" action="Product CMS">
        <DataTable>
          <thead><tr><Th>Edition</Th><Th>Price</Th><Th>Status</Th><Th>Produced</Th><Th>Reserved</Th><Th>Available</Th></tr></thead>
          <tbody>{products.map((product) => <tr key={product.name}><Td><strong>{product.name}</strong><br />{product.edition}</Td><Td>{product.price}</Td><Td><span className={`eyebrow ${statusTone(product.status)}`}>{product.status}</span></Td><Td>{product.produced}</Td><Td>{product.reserved}</Td><Td>{product.available}</Td></tr>)}</tbody>
        </DataTable>
      </PanelCard>
    </PanelLayout>
  );
}

export function UserPanel() {
  return (
    <PanelLayout sidebar={<Sidebar title="My Atelier" subtitle="Ananya Sharma - Private Atelier - Member since MMXXIV." links={["Overview", "Orders", "Wishlist", "Addresses", "Support", "Profile"]} />}>
      <HeroPanel eyebrow="Private account / Private Atelier" title="Welcome back, Ananya." copy="Manage reservations, fittings, wishlist alerts, delivery addresses, restoration requests and concierge conversations from your private Follocia account." stamp={"VIP\n72h access"} />
      <MetricGrid metrics={userMetrics} />

      <div id="profile" className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {["Book fitting", "Request invite", "Start restoration"].map((title, index) => (
          <motion.article key={title} variants={fade} className="border border-[var(--ink)]/10 bg-[var(--ivory)]/75 p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-3xl text-[var(--ink)]">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]/60">
              {index === 0 && "Choose Mumbai, Milan or Paris private salon availability."}
              {index === 1 && "Ask for early access to the next numbered edition."}
              {index === 2 && "Submit a pair for lifetime care and artisan review."}
            </p>
          </motion.article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <PanelCard id="orders" eyebrow="Commerce" title="My Reservations" action="Orders and services">
          <DataTable>
            <thead><tr><Th>Reservation</Th><Th>Pair</Th><Th>Size</Th><Th>Status</Th><Th>Amount</Th><Th>ETA</Th></tr></thead>
            <tbody>{userReservations.map((reservation) => <tr key={reservation.id}><Td><strong>{reservation.id}</strong></Td><Td>{reservation.product}</Td><Td>{reservation.size}</Td><Td><span className={`eyebrow ${statusTone(reservation.status)}`}>{reservation.status}</span></Td><Td>{reservation.amount}</Td><Td>{reservation.eta}</Td></tr>)}</tbody>
          </DataTable>
        </PanelCard>
        <PanelCard id="wishlist" eyebrow="Saved pieces" title="Wishlist" action="Drop alerts">
          <div className="grid gap-3 p-5">{wishlist.map((item) => <div key={item.product} className="grid grid-cols-[72px_1fr] gap-4 border border-[var(--ink)]/10 bg-[var(--bone)]/60 p-3"><img src={item.image} alt={item.product} className="aspect-[3/4] h-full w-full object-cover" /><div><h4 className="font-display text-2xl">{item.product}</h4><p className="mt-1 text-sm text-[var(--ink)]/55">{item.edition} - {item.availability}</p></div></div>)}</div>
        </PanelCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <PanelCard id="addresses" eyebrow="Delivery" title="White-glove Addresses" action="Secure profile">
          <div className="grid gap-3 p-5">
            {["Home - Altamount Road, Cumballa Hill, Mumbai", "Studio - Via private concierge hold, Milan"].map((address) => <div key={address} className="border border-[var(--ink)]/10 bg-[var(--bone)]/60 p-4"><strong>{address}</strong><p className="mt-2 text-sm text-[var(--ink)]/55">Managed for white-glove delivery and pickup.</p></div>)}
          </div>
        </PanelCard>
        <PanelCard id="support" eyebrow="Concierge" title="Support Timeline" action="Private desk">
          <div className="grid gap-3 p-5">{["Private fitting confirmed", "Noir Suspendu care kit added", "Archive restoration quote shared"].map((task) => <div key={task} className="border border-[var(--ink)]/10 bg-[var(--bone)]/60 p-4"><strong>{task}</strong><p className="mt-2 text-sm text-[var(--ink)]/55">Concierge desk update.</p></div>)}</div>
        </PanelCard>
      </div>
    </PanelLayout>
  );
}
