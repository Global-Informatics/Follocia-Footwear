import "../home/follicia.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a className="footer-wordmark" href="#/">
          FOLLICIA
        </a>
        <p>Every Step, A Statement.</p>
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
      </div>

      <div>
        <h4>Help</h4>
        <a href="#/contact">Contact</a>
        <a href="#/contact">Shipping &amp; Returns</a>
        <a href="#/shop">Size guide</a>
        <a href="#/contact">FAQs</a>
      </div>

      <small>© 2026 Follicia. All rights reserved.</small>
    </footer>
  );
}
