// Maison Follocia Interactive Cart & Modal Controller

let cart = JSON.parse(localStorage.getItem('follocia_cart') || '[]');

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

function updateCartUI() {
    const badge = document.getElementById('cartBadgeCount');
    const drawerCount = document.getElementById('cartDrawerCount');
    const itemsContainer = document.getElementById('cartDrawerItems');
    const footerContainer = document.getElementById('cartDrawerFooter');
    const subtotalEl = document.getElementById('cartSubtotalAmount');

    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    if (badge) badge.textContent = totalCount;
    if (drawerCount) drawerCount.textContent = `(${totalCount})`;

    if (cart.length === 0) {
        if (itemsContainer) {
            itemsContainer.innerHTML = `
                <div class="empty-cart-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    <p>Your bag is currently empty.</p>
                    <a href="/Home/Shop" class="btn-gold-outline-sm" onclick="toggleCartDrawer()">EXPLORE CATALOG</a>
                </div>
            `;
        }
        if (footerContainer) footerContainer.style.display = 'none';
    } else {
        if (itemsContainer) {
            itemsContainer.innerHTML = cart.map((item, index) => `
                <div class="cart-item-row">
                    <img src="${item.image}" alt="${item.title}" class="cart-item-img" />
                    <div class="cart-item-info">
                        <h4>${item.title}</h4>
                        <span class="cart-item-edition">${item.edition}</span>
                        <span class="cart-item-price">${item.price}</span>
                        <span class="cart-item-remove" onclick="removeFromCart(${index})">REMOVE ITEM</span>
                    </div>
                </div>
            `).join('');
        }

        let totalAmount = 0;
        let currency = 'EUR';
        cart.forEach(item => {
            const numeric = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
            totalAmount += numeric * (item.quantity || 1);
            if (item.price.includes('EUR') || item.price.includes('€')) currency = 'EUR';
            else if (item.price.includes('INR') || item.price.includes('₹')) currency = 'INR';
        });

        if (subtotalEl) subtotalEl.textContent = `${currency} ${totalAmount.toLocaleString('en-US')}`;
        if (footerContainer) footerContainer.style.display = 'block';
    }

    localStorage.setItem('follocia_cart', JSON.stringify(cart));
}

function addToCart(id, title, price, image, edition) {
    const existingIndex = cart.findIndex(item => item.id === id);
    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({ id, title, price, image, edition, quantity: 1 });
    }

    updateCartUI();
    showToast(`Added "${title}" to your bag`);
    toggleCartDrawer(true);
}

function removeFromCart(index) {
    const title = cart[index]?.title || 'Item';
    cart.splice(index, 1);
    updateCartUI();
    showToast(`Removed "${title}" from bag`);
}

function toggleCartDrawer(forceOpen = false) {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (!overlay) return;

    if (forceOpen) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.toggle('active');
        document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
    }
}

function closeCartDrawer(event) {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openQuickView(id, title, edition, price, tone, image, available) {
    const modal = document.getElementById('quickViewModal');
    const content = document.getElementById('quickViewContent');

    if (content) {
        content.innerHTML = `
            <div>
                <img src="${image}" alt="${title}" class="quickview-img" />
            </div>
            <div class="quickview-details">
                <span class="eyebrow-tag">${edition}</span>
                <h3>${title}</h3>
                <span class="quickview-price">${price}</span>
                <span class="quickview-tone">Tone / Finish: <strong>${tone}</strong></span>
                <p style="color: rgba(250,248,245,0.7); font-size: 0.85rem; margin-bottom: 1.5rem;">
                    Hand-carved wooden last, full Italian calfskin lining, and signature brass heel sculpt. Available only in limited quantities.
                </p>
                <button type="button" class="btn-gold-solid btn-full" onclick="addToCart('${id}', '${title}', '${price}', '${image}', '${edition}'); closeQuickViewModal();">
                    + ADD TO BAG
                </button>
            </div>
        `;
    }

    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeQuickViewModal(event) {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openVipModal() {
    const modal = document.getElementById('vipModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeVipModal(event) {
    const modal = document.getElementById('vipModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function handleVipFormSubmit(event) {
    event.preventDefault();
    closeVipModal();
    showToast('VIP Access Pass Granted! Check your email.');
}

function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3200);
}

function proceedToCheckout() {
    if (cart.length === 0) return;
    showToast('Redirecting to Private Reservation Concierge...');
    setTimeout(() => {
        window.location.href = '/Account';
    }, 1000);
}
