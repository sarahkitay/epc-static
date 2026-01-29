// Journal Spiral (3D helix) – cards orbit the figure, spaced cleanly, no clustering
(function () {
  "use strict";
  if (window.innerWidth <= 768) return;

  const blocks = Array.from(document.querySelectorAll(".journal-block"));
  const introSection = document.querySelector(".intro-section");
  const cta = document.querySelector(".epc-blog-cta");
  const backEl = document.getElementById("journal-3d-back");
  if (!blocks.length) return;

  // Ensure fixed layer exists
  let cardsLayer = document.getElementById("journal-cards-layer");
  if (!cardsLayer) {
    cardsLayer = document.createElement("div");
    cardsLayer.id = "journal-cards-layer";
    document.body.appendChild(cardsLayer);
  }

  console.log('✅ Journal Spiral initialized:', blocks.length, 'blocks');

  // Move blocks into layer + neutralize inline positioning that causes clustering
  blocks.forEach((b) => {
    cardsLayer.appendChild(b);
    b.style.top = "0";
    b.style.left = "0";
    b.style.right = "auto";
    b.style.position = "absolute";
  });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let bounds = null;
  function computeBounds() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const vh = window.innerHeight;

    // start: just after intro section bottom
    let start = 0;
    if (introSection) {
      const r = introSection.getBoundingClientRect();
      start = r.bottom + scrollTop;
    } else {
      start = scrollTop + vh * 0.25;
    }

    // end: before CTA
    let end = start + Math.max(vh * 3.5, blocks.length * 220);
    if (cta) {
      const cr = cta.getBoundingClientRect();
      const ctaTop = cr.top + scrollTop;
      end = Math.min(end, ctaTop - vh * 0.55);
    }

    bounds = { start, end };
  }

  function getCenter() {
    let cx = window.innerWidth * 0.5;
    let cy = window.innerHeight * 0.5;

    if (backEl) {
      const r = backEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
      }
    }
    return { cx, cy };
  }

  function update() {
    if (!bounds) computeBounds();

    const { start, end } = bounds;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const range = Math.max(1, end - start);

    // toggle visibility
    if (scrollTop >= start) document.body.classList.add("journal-spiral-active");
    else document.body.classList.remove("journal-spiral-active");

    // before start: hide
    if (scrollTop < start) {
      blocks.forEach((b) => {
        b.style.opacity = "0";
        b.style.pointerEvents = "none";
      });
      return;
    }

    blocks.forEach((b) => (b.style.pointerEvents = "auto"));

    const t = clamp((scrollTop - start) / range, 0, 1);
    const { cx, cy } = getCenter();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Tuning knobs (Greta-ish spiral)
    const radius = Math.min(360, vw * 0.22);
    const depth = 520;                 // z range
    const yStep = Math.min(160, vh * 0.18); // vertical spacing per card
    const angleStep = 0.85;            // radians per card step (controls coil tightness)
    const lead = 2.2;                  // how many cards ahead appear above center
    const baseRot = -Math.PI * 0.15;

    // conveyor belt: each card has its own "s" relative to the center
    // as t increases, the belt advances and cards pass the center one-by-one
    const belt = lerp(-lead, blocks.length - 1 + lead, t);

    blocks.forEach((block, i) => {
      const s = i - belt; // 0 means "featured" at center

      // helix math
      const angle = baseRot + s * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * depth;
      const y = s * yStep;

      // normalize depth -> style
      const zn = (z + depth) / (2 * depth); // 0..1
      const dist = Math.abs(s);

      const scale = lerp(0.78, 1.12, zn);
      const opacity = clamp(1.0 - dist * 0.22, 0.12, 1);
      const blur = clamp(dist * 0.55 - zn * 0.4, 0, 3.2);

      const px = cx + x;
      const py = cy + y;

      // subtle facing so text stays readable
      const faceY = lerp(10, -10, zn);
      const tiltZ = lerp(-3, 3, zn);

      // behind vs in front layering
      const behind = zn < 0.5;
      block.style.zIndex = behind ? "12" : "22";

      block.style.opacity = String(opacity);
      block.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : "none";

      block.style.transform =
        `translate3d(${px}px, ${py}px, ${z}px) ` +
        `translate3d(-50%, -50%, 0) ` +
        `rotateY(${faceY}deg) rotateZ(${tiltZ}deg) ` +
        `scale(${scale})`;
    });
  }

  let raf = null;
  const onScroll = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  };

  computeBounds();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    bounds = null;
    computeBounds();
    onScroll();
  });

  requestAnimationFrame(update);
})();
