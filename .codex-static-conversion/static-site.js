(function () {
  "use strict";

  var scriptUrl = document.currentScript && document.currentScript.src;
  var siteRoot = scriptUrl ? new URL("../../", scriptUrl) : new URL("./", window.location.href);

  function addStaticStyles() {
    var style = document.createElement("style");
    style.id = "tg-static-site-fixes";
    style.textContent = [
      "@media (min-width:1025px){",
      ".elementor-nav-menu--main .menu-item-has-children{position:relative!important}",
      ".elementor-nav-menu--main .menu-item-has-children>.sub-menu{display:block!important;position:absolute!important;top:calc(100% + 10px)!important;left:0!important;min-width:250px!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateY(8px)!important;transition:opacity .2s ease,transform .2s ease,visibility .2s ease!important;z-index:99999!important}",
      ".elementor-nav-menu--main .menu-item-has-children:hover>.sub-menu,.elementor-nav-menu--main .menu-item-has-children:focus-within>.sub-menu,.elementor-nav-menu--main .menu-item-has-children.static-submenu-open>.sub-menu{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:translateY(0)!important}",
      ".elementor-nav-menu--main .menu-item-has-children>a{display:flex!important;align-items:center!important;gap:7px!important}",
      ".elementor-nav-menu--main .menu-item-has-children>a:after{content:'\\25BE'!important;display:inline-block!important;font-size:11px!important;line-height:1!important;transition:transform .2s ease!important}",
      ".elementor-nav-menu--main .menu-item-has-children:hover>a:after,.elementor-nav-menu--main .menu-item-has-children.static-submenu-open>a:after{transform:rotate(180deg)}",
      "}",
      "@media (max-width:1024px){",
      ".elementor-nav-menu--dropdown.elementor-active{display:block!important}",
      ".menu-item-has-children>.sub-menu{display:none!important}",
      ".menu-item-has-children.static-submenu-open>.sub-menu{display:block!important}",
      "}",
      "body.blog .blog-hero{padding-top:clamp(28px,4vw,52px)!important;gap:22px!important;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr)!important}",
      "body.blog .blog-hero-copy,body.blog .blog-hero-panel{min-height:0!important;padding:clamp(26px,3vw,42px)!important;border-radius:22px!important}",
      "body.blog .blog-hero-copy h1{max-width:17ch!important;font-size:clamp(38px,4.2vw,60px)!important;line-height:1.02!important}",
      "body.blog .blog-hero-stats{margin-top:22px!important}",
      "@media (max-width:980px){body.blog .blog-hero{grid-template-columns:1fr!important}body.blog .blog-hero-copy h1{font-size:clamp(34px,9vw,52px)!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function setupMenus() {
    document.querySelectorAll(".elementor-menu-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var widget = toggle.closest(".elementor-widget-nav-menu");
        var dropdown = widget && widget.querySelector(":scope > .elementor-widget-container .elementor-nav-menu--dropdown");
        var isOpen = toggle.classList.toggle("elementor-active");

        toggle.setAttribute("aria-expanded", String(isOpen));
        if (dropdown) {
          dropdown.classList.toggle("elementor-active", isOpen);
          dropdown.hidden = !isOpen;
        }
      });
    });

    document.querySelectorAll(".menu-item-has-children > .menu-link").forEach(function (link) {
      link.addEventListener("click", function (event) {
        var item = link.parentElement;
        var submenu = item && item.querySelector(":scope > .sub-menu");
        if (!submenu) return;

        if (window.matchMedia("(max-width: 1024px)").matches) {
          event.preventDefault();
          var isOpen = item.classList.toggle("static-submenu-open");
          link.setAttribute("aria-expanded", String(isOpen));
          submenu.hidden = !isOpen;
        } else {
          var href = link.getAttribute("href") || "";
          var isPlaceholder = href === "#" || href.endsWith("#");
          var isOpen = item.classList.contains("static-submenu-open");
          if (!isOpen || isPlaceholder) {
            event.preventDefault();
            item.classList.toggle("static-submenu-open");
          }
        }
      });
    });

    document.addEventListener("click", function (event) {
      if (event.target.closest(".menu-item-has-children")) return;
      document.querySelectorAll(".menu-item-has-children.static-submenu-open").forEach(function (item) {
        item.classList.remove("static-submenu-open");
      });
    });
  }

  function setupImageFallbacks() {
    var generalPool = [
      "LatestImages/Crystal-Aqualite-Glass.jpeg",
      "LatestImages/Square-Pyramid-Glass.jpeg",
      "LatestImages/Crystal-Clear-Moru.jpeg",
      "LatestImages/Bronze-Mirror.jpeg",
      "LatestImages/White-lequer-Glass.jpeg"
    ];
    var companyPool = [
      "assets/media/2026/01/luxury-glass-1.png",
      "assets/media/2026/01/luxury-glass-2.png",
      "assets/media/2026/01/luxury-glass-3.png",
      "assets/media/2026/01/luxury-glass-4.png",
      "assets/media/2026/01/b8385926-66c4-4343-bfd7-7e707a296c04-1024x683.png"
    ];
    var galleryPool = [
      "LatestImages/THMBNL/C5491T01.JPG",
      "LatestImages/THMBNL/C5535T01.JPG",
      "LatestImages/THMBNL/C5603T01.JPG",
      "LatestImages/THMBNL/VINU8535.JPG",
      "LatestImages/THMBNL/VINU8577.JPG"
    ];
    var page = window.location.pathname.toLowerCase();
    var pool = page.includes("gallery") ? galleryPool :
      (page.includes("about-us") || page.includes("awards")) ? companyPool : generalPool;

    document.querySelectorAll("img").forEach(function (image, index) {
      function applyFallback() {
        if (image.dataset.fallbackApplied === "true") return;
        image.dataset.fallbackApplied = "true";
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.src = new URL(pool[index % pool.length], siteRoot).href;
      }

      image.addEventListener("error", applyFallback);
      if (image.complete && image.naturalWidth === 0) applyFallback();
    });
  }

  function setupCounters() {
    var counters = document.querySelectorAll("[data-to-value]");
    if (!counters.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var node = entry.target;
        var target = Number(node.getAttribute("data-to-value")) || 0;
        var duration = 1000;
        var start = performance.now();

        function frame(now) {
          var progress = Math.min((now - start) / duration, 1);
          node.textContent = Math.round(target * progress).toLocaleString();
          if (progress < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
        observer.unobserve(node);
      });
    });

    counters.forEach(function (counter) {
      observer.observe(counter);
    });
  }

  function setupCarousels() {
    document.querySelectorAll(".elementor-image-carousel-wrapper").forEach(function (carousel) {
      var track = carousel.querySelector(".swiper-wrapper");
      var slides = track && Array.from(track.children);
      if (!track || !slides || slides.length < 2) return;

      var index = 0;
      carousel.style.overflow = "hidden";
      track.style.display = "flex";
      track.style.transition = "transform 450ms ease";
      slides.forEach(function (slide) {
        slide.style.flex = "0 0 100%";
      });

      window.setInterval(function () {
        if (document.hidden) return;
        index = (index + 1) % slides.length;
        track.style.transform = "translateX(-" + index * 100 + "%)";
      }, 4500);
    });
  }

  function setupStickyHeader() {
    var headers = document.querySelectorAll(".she-header-yes, [data-settings*='sticky']");
    if (!headers.length) return;

    function update() {
      headers.forEach(function (header) {
        header.classList.toggle("static-header-scrolled", window.scrollY > 24);
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    addStaticStyles();
    setupMenus();
    setupImageFallbacks();
    setupCounters();
    setupCarousels();
    setupStickyHeader();
  });
})();
