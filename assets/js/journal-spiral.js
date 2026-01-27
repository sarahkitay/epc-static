// Journal Spiral (3D helix) - Greta Thunberg-style orbital effect
(function () {
  "use strict";
  if (window.innerWidth <= 768) return;

  const blocks = Array.from(document.querySelectorAll(".journal-block"));
  const container = document.querySelector(".journal-container");
  const cta = document.querySelector(".epc-blog-cta");
  if (!blocks.length || !container) return;

  // Create / reuse stage
  let stage = document.querySelector(".epc-orbit-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "epc-orbit-stage";
    stage.setAttribute("aria-hidden", "true");
    document.body.appendChild(stage);
  }

  // Move cards into stage for 3D overlay rendering (Greta-like)
  blocks.forEach((b) => stage.appendChild(b));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function getScrollBounds() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top + scrollTop;

    // start after hero
    const start = containerTop + window.innerHeight * 1.05;

    // end before CTA
    let end = start + window.innerHeight * 3.2;
    if (cta) {
      const ctaRect = cta.getBoundingClientRect();
      const ctaTop = ctaRect.top + scrollTop;
      end = ctaTop - window.innerHeight * 0.7;
    }

    return { start, end };
  }

  function update() {
    const { start, end } = getScrollBounds();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Before start: hide cards
    if (scrollTop < start) {
      blocks.forEach((b) => {
        b.style.opacity = 0;
        b.style.pointerEvents = "none";
      });
      return;
    } else {
      blocks.forEach((b) => (b.style.pointerEvents = "auto"));
    }

    const t = clamp((scrollTop - start) / Math.max(1, end - start), 0, 1);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Orbit center - try to center on figure if available
    let centerX = vw * 0.53;
    let centerY = vh * 0.52;
    
    // Try to find and center on the 3D figure
    const canvasContainer = document.getElementById("canvas-container");
    if (canvasContainer) {
      const rect = canvasContainer.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }

    // Helix tuning (closest to Greta feel)
    const turns = 1.7;                       // rotations across the section
    const radius = Math.min(460, vw * 0.28);  // orbit radius
    const depth = 420;                        // translateZ depth range
    const travelY = vh * 0.95;                // how far helix drifts downward
    const phaseStep = 0.14;                   // spacing between cards along helix
    const baseRot = -Math.PI * 0.18;          // aesthetic starting angle

    blocks.forEach((block, i) => {
      const phase = i * phaseStep;

      // angle advances with scroll + each card offset
      const angle = baseRot + (t * turns * Math.PI * 2) + (phase * Math.PI * 2);

      // 3D helix coordinates
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * depth;

      // cards also progress down page as scroll continues
      const y = (t * travelY) + (phase * vh * 0.58);

      // Depth-based realism: front = bigger, sharper, more opaque
      const zn = (z + depth) / (2 * depth); // 0..1
      const scale = lerp(0.78, 1.12, zn);
      const opacity = lerp(0.20, 1.0, zn);
      const blur = lerp(1.2, 0.0, zn);

      // Slight facing/tilt for parallax
      const faceY = lerp(18, -18, zn);
      const tiltZ = lerp(-6, 6, zn);

      // Final position (centered orbit, then offset for card centering)
      const px = centerX + x;
      const py = centerY + (y - travelY * 0.48);

      block.style.opacity = opacity.toFixed(3);
      block.style.filter = `blur(${blur.toFixed(2)}px)`;
      block.style.zIndex = String(Math.round(50 + zn * 200));

      // translate3d + translate(-50%) so it orbits around its center
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

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  requestAnimationFrame(update);
})();
