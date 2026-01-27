// Journal Spiral (3D helix) - cards orbit around figure with perspective
(function () {
  "use strict";
  if (window.innerWidth <= 768) return;

  const blocks = Array.from(document.querySelectorAll(".journal-block"));
  const container = document.querySelector(".journal-container");
  const cta = document.querySelector(".epc-blog-cta");
  const stage = document.querySelector(".journal-stage");
  if (!blocks.length || !container || !stage) return;

  // Move the blocks into the stage so they render as a 3D overlay
  blocks.forEach((b) => stage.appendChild(b));

  // Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function getScrollRange() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top + scrollTop;

    // start after the hero/intro portion
    const introOffset = window.innerHeight * 1.1;
    const start = containerTop + introOffset;

    // end before CTA so it doesn't collide
    let end = start + window.innerHeight * 3.0;
    if (cta) {
      const ctaRect = cta.getBoundingClientRect();
      const ctaTop = ctaRect.top + scrollTop;
      end = ctaTop - window.innerHeight * 0.65;
    }

    return { start, end };
  }

  function update() {
    const { start, end } = getScrollRange();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // progress through the spiral section
    const t = clamp((scrollTop - start) / Math.max(1, end - start), 0, 1);

    // Hide before the spiral starts
    if (scrollTop < start) {
      blocks.forEach((b) => {
        b.style.opacity = 0;
        b.style.pointerEvents = "none";
      });
      return;
    } else {
      blocks.forEach((b) => (b.style.pointerEvents = "auto"));
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Orbit center: place it around your figure
    // (Adjust these two to lock perfectly on the model)
    const centerX = vw * 0.50;
    const centerY = vh * 0.52;

    // Helix tuning (these are the "Greta knobs")
    const turns = 1.35;            // how many full rotations as you scroll (1.0–2.0)
    const radius = Math.min(420, vw * 0.26); // orbit radius
    const depth = 340;             // translateZ range (controls scale/foreground feeling)
    const verticalTravel = vh * 0.85; // how far the helix "drops" during scroll
    const spacing = 0.16;          // phase spacing between cards (smaller = tighter spiral)

    // base rotation so first cards start slightly off-center (aesthetic)
    const baseRot = -Math.PI * 0.25;

    blocks.forEach((block, i) => {
      // each card has its own phase around the helix
      const phase = i * spacing;

      // global angle advances as you scroll
      const angle = baseRot + (t * turns * Math.PI * 2) + (phase * Math.PI * 2);

      // helix position
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * depth;

      // spiral drops down as you scroll, but each card also offsets along the helix
      const y = (t * verticalTravel) + (phase * vh * 0.55);

      // Depth-based scale/opacity (front = bigger + more opaque)
      const zNorm = (z + depth) / (2 * depth); // 0..1
      const scale = lerp(0.78, 1.08, zNorm);
      const opacity = lerp(0.22, 1.0, zNorm);

      // Make cards subtly "face" the viewer (adds realism)
      const face = (-angle * 180) / Math.PI;
      const tilt = lerp(-10, 10, zNorm);

      // Position relative to orbit center, then pull up a bit so it sits around the figure
      const finalX = centerX + x;
      const finalY = centerY + (y - verticalTravel * 0.45);

      block.style.opacity = opacity.toFixed(3);
      block.style.zIndex = String(Math.round(100 + zNorm * 100)); // front on top

      // Use translate(-50%,-50%) so card centers orbit, not top-left
      block.style.transform =
        `translate3d(${finalX}px, ${finalY}px, ${z}px) ` +
        `translate3d(-50%, -50%, 0) ` +
        `scale(${scale}) ` +
        `rotateY(${face * 0.15}deg) rotateZ(${tilt}deg)`;

      // Optional: soften interaction when far back
      block.style.filter = `blur(${lerp(1.2, 0.0, zNorm).toFixed(2)}px)`;
    });
  }

  let raf = null;
  const onScroll = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // init
  requestAnimationFrame(update);
})();
