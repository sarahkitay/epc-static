// Journal Spiral (3D helix) - Greta Thunberg-style orbital effect
(function () {
  "use strict";
  if (window.innerWidth <= 768) return;

  const blocks = Array.from(document.querySelectorAll(".journal-block"));
  const container = document.querySelector(".journal-container");
  const cta = document.querySelector(".epc-blog-cta");
  if (!blocks.length || !container) return;

  // Create / reuse cards layer (between back and front renderers)
  let cardsLayer = document.getElementById("journal-cards-layer");
  if (!cardsLayer) {
    cardsLayer = document.createElement("div");
    cardsLayer.id = "journal-cards-layer";
    document.body.appendChild(cardsLayer);
  }

  // Move cards into cards layer for occlusion
  blocks.forEach((b) => cardsLayer.appendChild(b));

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
    let centerX = vw * 0.5;
    let centerY = vh * 0.5;
    
    // Try to find and center on the 3D figure (back renderer)
    const backContainer = document.getElementById("journal-3d-back");
    if (backContainer) {
      const rect = backContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
      }
    }

    // Helix tuning (closest to Greta feel)
    const turns = 1.7;                       // rotations across the section
    const radius = Math.min(400, vw * 0.25);  // orbit radius (reduced)
    const depth = 420;                        // translateZ depth range
    const travelY = vh * 0.4;                 // how far helix drifts downward (reduced)
    const phaseStep = 0.14;                   // spacing between cards along helix
    const baseRot = -Math.PI * 0.18;          // aesthetic starting angle

    blocks.forEach((block, i) => {
      const phase = i * phaseStep;

      // angle advances with scroll + each card offset
      const angle = baseRot + (t * turns * Math.PI * 2) + (phase * Math.PI * 2);

      // 3D helix coordinates
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * depth;

      // cards also progress down page as scroll continues (centered around figure)
      const y = (t * travelY) + (phase * vh * 0.15) - (travelY * 0.2);

      // Depth-based realism: front = bigger, sharper, more opaque
      const zn = (z + depth) / (2 * depth); // 0..1
      const scale = lerp(0.78, 1.12, zn);
      const opacity = lerp(0.20, 1.0, zn);
      const blur = lerp(1.2, 0.0, zn);

      // Occlusion: cards behind figure (zNorm < 0.48) go under front renderer
      const behind = zn < 0.48;
      const occludedOpacity = behind ? opacity * 0.72 : opacity;

      // Slight facing/tilt for parallax
      const faceY = lerp(18, -18, zn);
      const tiltZ = lerp(-6, 6, zn);

      // Final position (centered orbit around figure)
      const px = centerX + x;
      const py = centerY + y;

      block.style.opacity = occludedOpacity.toFixed(3);
      block.style.filter = `blur(${blur.toFixed(2)}px)`;
      // Z-index: behind cards go under front renderer (z-index 15), front cards above (z-index 25)
      block.style.zIndex = behind ? "15" : "25";

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
