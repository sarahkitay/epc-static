(() => {
  const nav = document.getElementById("mainNav");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navLinks = navMenu ? navMenu.querySelectorAll(".nav-link") : [];

  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 100);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  if (navToggle && navMenu) {
    const closeMenu = () => {
      navMenu.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    };

    const openMenu = () => {
      navMenu.classList.add("active");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close menu");
    };

    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.contains("active");
      if (isOpen) closeMenu();
      else openMenu();
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Smooth scroll for anchors with nav offset
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 18;

      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  // Accordion
  const accordion = document.querySelector(".epc-accordion");
  if (accordion) {
    const items = Array.from(accordion.querySelectorAll(".acc-item"));

    const setOpen = (item, open) => {
      const btn = item.querySelector(".acc-trigger");
      const panel = item.querySelector(".acc-panel");
      if (!btn || !panel) return;

      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("aria-hidden", open ? "false" : "true");

      if (open) {
        panel.style.maxHeight = panel.scrollHeight + "px";
      } else {
        panel.style.maxHeight = "0px";
      }
    };

    items.forEach((item) => {
      const btn = item.querySelector(".acc-trigger");
      const panel = item.querySelector(".acc-panel");
      if (!btn || !panel) return;

      // init closed
      setOpen(item, false);

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        // close others
        items.forEach((it) => it !== item && setOpen(it, false));
        setOpen(item, !isOpen);
      });
    });

    window.addEventListener("resize", () => {
      items.forEach((item) => {
        if (!item.classList.contains("is-open")) return;
        const panel = item.querySelector(".acc-panel");
        if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
      });
    });
  }

  // SVG draw animation when in view
  const drawSection = document.querySelector(".epc-draw-break");
  if (drawSection) {
    const paths = drawSection.querySelectorAll("path");
    paths.forEach((p) => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = String(len + 2);
        p.style.strokeDashoffset = String(len + 2);
      } catch {}
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            drawSection.classList.add("is-animating");
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    io.observe(drawSection);
  }

  // Hero video: pause when out of view (optional)
  const heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    });
    vio.observe(heroVideo);
  }

  // Console branding (cute)
  console.log("%c Elite Performance Clinic ", "background:#C9B27F;color:#0B0B0B;font-size:14px;padding:10px;font-family:Playfair Display, serif;letter-spacing:.25em;");
})();
// Testimonials carousel + About reveal
document.addEventListener("DOMContentLoaded", () => {
  initTestimonials();
  initAboutReveal();
});

function initTestimonials(){
  const root = document.querySelector("#epc-testimonials");
  if (!root) return;

  const wrap = root.querySelector(".wrap");
  const items = Array.from(root.querySelectorAll(".t-item"));
  const dotsWrap = root.querySelector(".t-dots");
  if (!wrap || !items.length || !dotsWrap) return;

  // Build dots
  dotsWrap.innerHTML = "";
  items.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "t-dot";
    b.type = "button";
    b.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
    b.addEventListener("click", () => go(i, true));
    dotsWrap.appendChild(b);
  });
  const dots = Array.from(dotsWrap.querySelectorAll(".t-dot"));

  let idx = 0;
  let timer = null;
  let active = true;
  const interval = parseInt(wrap.getAttribute("data-rotation") || "8000", 10);

  function updateUI(){
    items.forEach((el, i) => el.classList.toggle("is-active", i === idx));
    dots.forEach((d, i) => d.setAttribute("aria-current", i === idx ? "true" : "false"));
  }

  function next(){
    idx = (idx + 1) % items.length;
    updateUI();
  }

  function go(i, restart){
    idx = ((i % items.length) + items.length) % items.length;
    updateUI();
    if (restart) start();
  }

  function start(){
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stop();
    timer = setInterval(next, interval);
  }

  function stop(){
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Pause on hover/focus
  wrap.addEventListener("mouseenter", stop);
  wrap.addEventListener("mouseleave", () => active && start());
  wrap.addEventListener("focusin", stop);
  wrap.addEventListener("focusout", () => active && start());

  // Only run when visible
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((ent) => {
        active = ent.isIntersecting;
        active ? start() : stop();
      });
    }, { threshold: 0.2 });
    io.observe(root);
  }

  updateUI();
  start();
}

function initAboutReveal(){
  const section = document.querySelector("#epc-about");
  if (!section) return;

  if (!("IntersectionObserver" in window)) {
    section.classList.add("is-inview");
    return;
  }

  // Start reveal earlier so it never "pops"
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        section.classList.add("is-inview");
        io.unobserve(section);
      }
    });
  }, {
    rootMargin: "0px 0px 220px 0px",
    threshold: 0.05
  });

  io.observe(section);
}