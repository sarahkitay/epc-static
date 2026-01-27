// Journal Spiral - True orbital experience: cards spiral around figure as you scroll
(function() {
  'use strict';

  // Skip on mobile
  if (window.innerWidth <= 768) return;

  const journalBlocks = document.querySelectorAll('.journal-block');
  if (journalBlocks.length === 0) return;

  const container = document.querySelector('.journal-container');
  if (!container) return;

  // Get CTA section to ensure cards stay above it
  const ctaSection = document.querySelector('.epc-blog-cta');
  
  // Get viewport center (where the 3D figure is)
  function getViewportCenter() {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
  }

  // Calculate spiral position for each block
  function updateBlockPositions() {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top + scrollTop;
    const center = getViewportCenter();
    
    // Get CTA position
    let ctaTop = window.innerHeight * 0.8;
    if (ctaSection) {
      const ctaRect = ctaSection.getBoundingClientRect();
      ctaTop = ctaRect.top + scrollTop;
    }
    
    // Total scroll range - cards orbit as you scroll through this range
    const maxScrollHeight = ctaTop - containerTop - viewportHeight * 0.2;
    const totalScrollHeight = Math.max(1, maxScrollHeight);
    
    // Scroll progress: 0 = start, 1 = end
    // Cards start spread out and orbit as you scroll
    const scrollProgress = Math.max(0, Math.min(1, (scrollTop - containerTop + viewportHeight * 0.4) / totalScrollHeight));
    
    // Responsive radius - adapts to viewport size
    const baseRadius = Math.min(
      viewportWidth * 0.32, // 32% of viewport for better spacing
      550 // Max radius
    );
    
    journalBlocks.forEach((block, index) => {
      // Each card starts at a different angle around the circle
      const baseAngle = (index / journalBlocks.length) * Math.PI * 2;
      
      // As you scroll, all cards rotate around the center (orbital motion)
      // Each card also moves forward in the spiral (downward)
      const orbitRotation = scrollProgress * Math.PI * 2; // Full rotation as you scroll
      const spiralAdvance = scrollProgress; // How far down the spiral (0 to 1)
      
      // Combine base angle with orbital rotation
      const angle = baseAngle + orbitRotation;
      
      // Spiral radius - starts larger, gets slightly smaller as you go down
      const radiusVariation = 1 - (spiralAdvance * 0.2); // Radius decreases 20% as you scroll
      const radius = baseRadius * radiusVariation;
      
      // TRUE CIRCULAR ORBIT - equal X and Y movement
      const xOffset = Math.cos(angle) * radius;
      const yOffset = Math.sin(angle) * radius * 0.7; // Slight vertical compression for better view
      
      // Vertical spiral movement - cards move down as they orbit
      // Each card starts at a different vertical position
      const verticalSpacing = 250; // Space between cards vertically
      const startVerticalOffset = (index * verticalSpacing) - ((journalBlocks.length * verticalSpacing) / 2);
      
      // Cards move down together as you scroll
      const scrollVerticalMovement = scrollProgress * viewportHeight * 0.4;
      
      // Calculate final position
      const blockWidth = 280;
      const blockHeight = 200;
      const headerOffset = 120;
      
      const finalX = center.x + xOffset - (blockWidth / 2);
      const finalY = Math.max(
        headerOffset + 100, // Never overlap header
        center.y + yOffset + startVerticalOffset + scrollVerticalMovement - (blockHeight / 2)
      );
      
      // Constrain to CTA
      const ctaRect = ctaSection ? ctaSection.getBoundingClientRect() : null;
      const maxY = ctaRect ? ctaRect.top - 180 : window.innerHeight * 0.8;
      const constrainedY = Math.min(finalY, maxY);
      
      // Opacity based on position in orbit
      // Cards fade as they move away from front position
      const normalizedAngle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
      const distanceFromFront = Math.min(normalizedAngle, Math.PI * 2 - normalizedAngle);
      
      // Softer fade - cards stay visible longer
      const normalizedDistance = distanceFromFront / Math.PI;
      const opacity = Math.max(
        0.25, // Minimum 25% opacity
        Math.min(1, 1 - (normalizedDistance * 0.9)) // Softer fade curve
      );
      
      // Constrain X to viewport
      const minX = 20;
      const maxX = viewportWidth - blockWidth - 20;
      const constrainedX = Math.max(minX, Math.min(maxX, finalX));
      
      // Apply positioning
      block.style.position = 'absolute';
      block.style.left = `${constrainedX}px`;
      block.style.top = `${constrainedY}px`;
      block.style.opacity = opacity;
      block.style.transform = 'none';
      block.style.zIndex = Math.round(opacity * 10) + 5;
      
      // Visibility and clickability
      const isVisible = opacity > 0.2;
      block.style.visibility = isVisible ? 'visible' : 'hidden';
      block.style.pointerEvents = isVisible ? 'auto' : 'none';
      
      // Smooth transitions
      block.style.transition = 'opacity 0.4s ease, left 0.1s linear, top 0.1s linear';
    });
  }

  // Smooth scroll handler with requestAnimationFrame
  let rafId = null;
  function handleScroll() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateBlockPositions);
  }

  // Initialize
  setTimeout(() => {
    updateBlockPositions();
  }, 200);
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateBlockPositions();
  });
})();
