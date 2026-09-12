import logo from "@/assets/follocia-logo-new.png";
import "../home/follicia.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a className="footer-logo-link inline-flex flex-col items-start transition-opacity hover:opacity-90" href="#/" aria-label="Follicia Home">
          <img
            src={logo}
            alt="FOLLICIA - Every Step, A Statement."
            className="h-28 w-auto max-w-[240px] object-contain -ml-2"
          />
        </a>
      </div>

      <div>
        <h4>Collections</h4>
        <a href="#/collections">Aura</a>
        <a href="#/collections">Bloom</a>
        <a href="#/collections">Muse</a>
        <a href="#/collections">Noire</a>
      </div>

      <div>
        <h4>Shop</h4>
        <a href="#/shop">All designs</a>
        <a href="#/shop">Flats</a>
        <a href="#/shop">Heels</a>
        <a href="#/shop">Mules</a>
        <a href="#/shop">Boots</a>
      </div>

      <div>
        <h4>Help</h4>
        <a href="#our-story">Contact</a>
        <a href="#our-story">Shipping &amp; Returns</a>
        <a href="#shop">Size guide</a>
        <a href="#our-story">FAQs</a>
      </div>

      <small>© 2026 Follicia. All rights reserved.</small>
    </footer>
  );
}
