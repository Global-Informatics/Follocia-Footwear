(() => {
  const state = {
    cart: [],
    wishlist: new Set(),
    quickItem: null,
    selectedSize: "38",
  };

  const moneyNumber = (price) => Number(String(price).replace(/[^\d.]/g, "")) || 0;
  const euro = (value) => `€ ${value.toLocaleString()}`;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const nav = qs("[data-nav]");
  const progress = qs(".scroll-progress");
  const mobileMenu = qs("[data-mobile-menu]");
  const menuToggle = qs("[data-menu-toggle]");
  const quickModal = qs("[data-quick-modal]");
  const quickBackdrop = qs("[data-modal-backdrop]");
  const cartDrawer = qs("[data-cart-drawer]");
  const cartBackdrop = qs("[data-cart-backdrop]");

  function updateScrollUi() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = `${pct}%`;
    nav.classList.toggle("is-scrolled", window.scrollY > 72);

    const shoe = qs(".hero-shoe");
    if (shoe) {
      const offset = Math.min(window.scrollY * 0.12, 110);
      shoe.style.marginTop = `${offset}px`;
    }
  }

  function setLocked(locked) {
    document.body.classList.toggle("is-locked", locked);
  }

  function refreshCounts() {
    const count = state.cart.reduce((total, item) => total + item.qty, 0);
    qsa("[data-cart-count]").forEach((node) => {
      node.hidden = count === 0;
      node.textContent = count;
    });
    qsa("[data-cart-count-text]").forEach((node) => {
      node.textContent = count;
    });
    qsa("[data-wishlist-count]").forEach((node) => {
      node.hidden = state.wishlist.size === 0;
      node.textContent = state.wishlist.size;
    });
  }

  function renderCart() {
    const itemsRoot = qs("[data-cart-items]");
    const empty = qs("[data-cart-empty]");
    const footer = qs("[data-cart-footer]");
    const subtotalNode = qs("[data-cart-subtotal]");
    const subtotal = state.cart.reduce((total, item) => total + moneyNumber(item.price) * item.qty, 0);

    itemsRoot.innerHTML = state.cart.map((item) => `
      <div class="cart-line">
        <img src="${item.image}" alt="${item.title}">
        <div class="cart-line-info">
          <div>
            <p class="eyebrow muted">${item.tone}</p>
            <h4>${item.title}</h4>
            <small>Size ${item.size} · Qty ${item.qty}</small>
          </div>
          <div class="cart-line-bottom">
            <strong>${item.price}</strong>
            <button type="button" data-remove-cart="${item.key}">Remove</button>
          </div>
        </div>
      </div>
    `).join("");

    empty.hidden = state.cart.length > 0;
    footer.hidden = state.cart.length === 0;
    subtotalNode.textContent = euro(subtotal);
    refreshCounts();
  }

  function openCart() {
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    cartBackdrop.hidden = false;
    setLocked(true);
  }

  function closeCart() {
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    cartBackdrop.hidden = true;
    setLocked(quickModal.classList.contains("is-open"));
  }

  function productFromCard(card) {
    return {
      id: card.dataset.productId,
      title: card.dataset.title,
      edition: card.dataset.edition,
      price: card.dataset.price,
      tone: card.dataset.tone,
      image: card.dataset.image,
    };
  }

  function openQuick(item) {
    state.quickItem = item;
    state.selectedSize = "38";
    qs("[data-quick-image]").src = item.image;
    qs("[data-quick-image]").alt = item.title;
    qs("[data-quick-edition]").textContent = item.edition;
    qs("[data-quick-title]").textContent = item.title;
    qs("[data-quick-tone]").textContent = item.tone;
    qs("[data-quick-price]").textContent = item.price;
    renderSizes();
    quickBackdrop.hidden = false;
    quickModal.classList.add("is-open");
    quickModal.setAttribute("aria-hidden", "false");
    setLocked(true);
  }

  function closeQuick() {
    quickModal.classList.remove("is-open");
    quickModal.setAttribute("aria-hidden", "true");
    quickBackdrop.hidden = true;
    state.quickItem = null;
    setLocked(cartDrawer.classList.contains("is-open"));
  }

  function renderSizes() {
    const root = qs("[data-sizes]");
    root.innerHTML = ["35", "36", "37", "38", "39", "40", "41"].map((size) => (
      `<button type="button" class="${size === state.selectedSize ? "is-selected" : ""}" data-size="${size}">${size}</button>`
    )).join("");
  }

  function addQuickItemToCart() {
    if (!state.quickItem) return;
    const key = `${state.quickItem.id}-${state.selectedSize}`;
    const existing = state.cart.find((item) => item.key === key);
    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({ ...state.quickItem, key, size: state.selectedSize, qty: 1 });
    }
    renderCart();
    closeQuick();
    openCart();
  }

  function toggleWish(card, button) {
    const id = card.dataset.productId;
    if (state.wishlist.has(id)) {
      state.wishlist.delete(id);
      button.classList.remove("is-active");
      button.textContent = "♡";
    } else {
      state.wishlist.add(id);
      button.classList.add("is-active");
      button.textContent = "♥";
    }
    refreshCounts();
  }

  function initReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    qsa(".reveal").forEach((node) => observer.observe(node));
  }

  function initProducts() {
    qsa(".product-card").forEach((card) => {
      const quick = qs("[data-quick-view]", card);
      const wish = qs("[data-wish]", card);

      quick.addEventListener("click", () => openQuick(productFromCard(card)));
      wish.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleWish(card, wish);
      });

      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const mx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const my = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        card.style.transform = `rotateX(${my * -4}deg) rotateY(${mx * 5}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  function initVipForm() {
    const form = qs("[data-vip-form]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const button = qs("button", form);
      button.textContent = "Welcome to the Cercle";
      button.disabled = true;
      form.reset();
    });
  }

  function initEvents() {
    window.addEventListener("scroll", updateScrollUi, { passive: true });
    window.addEventListener("resize", updateScrollUi);

    menuToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("is-open");
      setLocked(isOpen);
    });
    qsa(".mobile-menu a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("is-open");
        setLocked(false);
      });
    });

    qs("[data-close-quick]").addEventListener("click", closeQuick);
    quickBackdrop.addEventListener("click", closeQuick);
    qs("[data-add-cart]").addEventListener("click", addQuickItemToCart);
    qs("[data-sizes]").addEventListener("click", (event) => {
      const button = event.target.closest("[data-size]");
      if (!button) return;
      state.selectedSize = button.dataset.size;
      renderSizes();
    });

    qs("[data-open-cart]").addEventListener("click", openCart);
    qs("[data-close-cart]").addEventListener("click", closeCart);
    cartBackdrop.addEventListener("click", closeCart);
    qs("[data-cart-items]").addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-cart]");
      if (!button) return;
      state.cart = state.cart.filter((item) => item.key !== button.dataset.removeCart);
      renderCart();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeQuick();
      closeCart();
      mobileMenu.classList.remove("is-open");
      setLocked(false);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initProducts();
    initVipForm();
    initEvents();
    renderCart();
    updateScrollUi();
  });
})();
