import logo from "@/assets/follicia-logo-trimmed.png";
import "../home/follicia.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a className="footer-logo-link" href="#/" aria-label="Follicia Home">
          <img
            src={logo}
            alt="FOLLICIA - Every Step, A Statement."
            className="footer-logo-img select-none"
          />
        </a>
        <div className="footer-company-info">
          <p className="footer-company-address">
            First Floor, 513/8 Chhunipura, Kirpal Nagar,<br />
            Rohtak, Haryana 124001
          </p>
        </div>
      </div>

      <div>
        <h4>Collections</h4>
        <a href="#/collection/aura">Aura</a>
        <a href="#/collection/bloom">Bloom</a>
        <a href="#/collection/muse">Muse</a>
        <a href="#/collection/noire">Noire</a>
      </div>

      <div>
        <h4>Shop</h4>
        <a href="#/new-arrivals">New arrivals</a>
        <a href="#/shop">All designs</a>
        <a href="#/shop?category=flat">Flats</a>
        <a href="#/shop?category=heel">Heels</a>
        <a href="#/shop?category=mule">Mules</a>
        <a href="#/shop?category=boot">Boots</a>
      </div>

      <div>
        <h4>Help</h4>
        <a href="#/contact">Contact</a>
        <a href="#/shipping">Shipping &amp; Returns</a>
        <a href="#/size-guide">Size guide</a>
        <a href="#/faq">FAQs</a>
      </div>

      <div className="site-footer-bottom">
        <small>© 2026 Follicia. All rights reserved.</small>
        <span className="footer-powered-by">
          Powered by Groupe Ras Mondial
        </span>
      </div>
    </footer>
  );
}
