// Journal Spiral (3D helix) – tiles create depth, circle the 3D figure, fade in at center
(function () {
  "use strict";
  if (window.innerWidth <= 768) return;

  const blocks = Array.from(document.querySelectorAll(".journal-block"));
  const container = document.querySelector(".journal-container");
  const introSection = document.querySelector(".intro-section");
  const cta = document.querySelector(".epc-blog-cta");
  if (!blocks.length || !container) return;

  let cardsLayer = document.getElementById("journal-cards-layer");
  if (!cardsLayer) {
    cardsLayer = document.createElement("div");
    cardsLayer.id = "journal-cards-layer";
    document.body.appendChild(cardsLayer);
  }

  // Move blocks to cards layer and set fixed positioning
  blocks.forEach((b) => {
    b.style.position = 'fixed';
    cardsLayer.appendChild(b);
  });
  
  console.log('✅ Journal Spiral initialized:', blocks.length, 'blocks');

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function getScrollBounds() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const vh = window.innerHeight;

    // Start directly below the scroll CTA (intro bottom in document coords)
    let start;
    if (introSection) {
      const r = introSection.getBoundingClientRect();
      start = r.bottom + scrollTop;
    } else {
      const containerRect = container.getBoundingClientRect();
      start = containerRect.top + scrollTop + vh * 0.3;
    }

    // End well before CTA – no cluster at the stop
    let end = start + Math.max(vh * 2.5, blocks.length * 90);
    if (cta) {
      const ctaRect = cta.getBoundingClientRect();
      const ctaTop = ctaRect.top + scrollTop;
      end = Math.min(end, ctaTop - vh * 0.5);
    }

    return { start, end };
  }

  // Debug flag - set to false in production
  const DEBUG = false;
  let logFrame = 0;

  function update() {
    const { start, end } = getScrollBounds();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const range = Math.max(1, end - start);

    // Only log occasionally to avoid UI blocking
    if (DEBUG && ++logFrame % 60 === 0) {
      console.log('🔵 Spiral:', scrollTop.toFixed(0), 'start:', start.toFixed(0));
    }

    // Toggle body class so 3D + cards layer become visible only after scroll past CTA
    if (scrollTop >= start) {
      document.body.classList.add("journal-spiral-active");
    } else {
      document.body.classList.remove("journal-spiral-active");
    }

    if (scrollTop < start) {
      blocks.forEach((b) => {
        b.style.opacity = "0";
        b.style.pointerEvents = "none";
      });
      return;
    }

    blocks.forEach((b) => { b.style.pointerEvents = "auto"; });

    const t = clamp((scrollTop - start) / range, 0, 1);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let centerX = vw * 0.5;
    let centerY = vh * 0.5;
    const backEl = document.getElementById("journal-3d-back");
    if (backEl) {
      const rect = backEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
      }
    }

    // Fade out all cards near the end (before CTA)
    const nearEnd = t > 0.85;
    const globalFade = nearEnd ? clamp((0.95 - t) / 0.10, 0, 1) : 1;

    // Helix: orbit around figure, depth, readable/clickable, no cluster at stop
    const turns = 2;
    const radius = Math.min(380, vw * 0.24);
    const depth = 400;
    const travelY = vh * 0.35;
    const phaseStep = 0.18;  // more spread, less cluster at end
    const baseRot = -Math.PI * 0.2;

    blocks.forEach((block, i) => {
      const phase = i * phaseStep;
      const angle = baseRot + (t * turns * Math.PI * 2) + (phase * Math.PI * 2);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * depth;
      const y = (t * travelY) + (phase * vh * 0.12) - (travelY * 0.15);

      const zn = (z + depth) / (2 * depth);
      // Readable: front cards sharper, higher min opacity
      const scale = lerp(0.82, 1.08, zn);
      const opacity = lerp(0.5, 1, zn);
      const blur = lerp(0.6, 0, zn);

      const behind = zn < 0.48;
      const occludedOpacity = behind ? opacity * 0.75 : opacity;

      const faceY = lerp(12, -12, zn);
      const tiltZ = lerp(-4, 4, zn);

      // Position blocks relative to center, not adding to it
      block.style.left = `${centerX}px`;
      block.style.top = `${centerY}px`;

      // Apply global fade and individual opacity
      const finalOpacity = occludedOpacity * globalFade;
      block.style.opacity = String(finalOpacity);
      block.style.filter = blur <= 0 ? "none" : `blur(${blur.toFixed(2)}px)`;
      block.style.zIndex = behind ? "15" : "25";
      block.style.pointerEvents = finalOpacity < 0.2 ? "none" : "auto";

      block.style.transform =
        `translate(-50%, -50%) ` +
        `translate3d(${x}px, ${y}px, ${z}px) ` +
        `rotateY(${faceY}deg) rotateZ(${tiltZ}deg) ` +
        `scale(${scale})`;
    });
  }

  let raf = null;
  const onScroll = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  requestAnimationFrame(update);
})();
