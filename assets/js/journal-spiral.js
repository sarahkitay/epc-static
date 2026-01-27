// Journal Spiral - Cards orbit around center 3D figure with opacity fade and vertical spacing
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
    
    // Total scroll range for the journal - stop before CTA
    const maxScrollHeight = ctaTop - containerTop - viewportHeight * 0.2;
    const totalScrollHeight = Math.max(1, maxScrollHeight);
    const scrollProgress = Math.max(0, Math.min(1, (scrollTop - containerTop + viewportHeight * 0.3) / totalScrollHeight));
    
    // Calculate rotation offset - cards orbit as you scroll
    const orbitRotation = scrollProgress * Math.PI * 2; // Full rotation as you scroll
    
    journalBlocks.forEach((block, index) => {
      // Calculate position in spiral (0 to 1) - each card gets a position around the circle
      const spiralPosition = index / journalBlocks.length;
      
      // Add orbit rotation so cards rotate around center as you scroll
      const angle = (spiralPosition * Math.PI * 2) + orbitRotation;
      
      // Spiral radius - much larger radius for better spacing
      const baseRadius = 700; // Large radius for wide spacing
      const radius = baseRadius;
      
      // Calculate X and Y positions in spiral (relative to center)
      const xOffset = Math.cos(angle) * radius;
      const yOffset = Math.sin(angle) * radius * 0.3; // Less Y movement for flatter spiral
      
      // Vertical distribution - each card gets a vertical offset based on its index
      // This creates a downward spiral effect
      const verticalSpacing = 200; // Space between cards vertically
      const cardVerticalOffset = (index * verticalSpacing) - ((journalBlocks.length * verticalSpacing) / 2); // Center the distribution
      
      // Vertical scroll offset - cards move down as you scroll, but stop before CTA
      const maxVerticalOffset = ctaTop - center.y - 200; // Stop 200px before CTA
      const scrollVerticalOffset = Math.min(
        scrollProgress * viewportHeight * 0.4,
        maxVerticalOffset
      );
      
      // Calculate final position relative to viewport center
      const finalX = center.x + xOffset - 140; // Subtract half block width (280px / 2)
      const finalY = center.y + yOffset + cardVerticalOffset + scrollVerticalOffset - 100; // Center Y + spiral offset + card vertical spacing + scroll offset - half block height
      
      // Ensure cards don't go below CTA
      const ctaRect = ctaSection ? ctaSection.getBoundingClientRect() : null;
      const maxY = ctaRect ? ctaRect.top - 150 : window.innerHeight * 0.8; // 150px buffer above CTA
      const constrainedY = Math.min(finalY, maxY);
      
      // Calculate opacity based on position in orbit
      // Cards fade: 0 opacity -> 1 opacity (at center/front) -> 0 opacity
      // Front position is when angle is closest to 0 or 2π
      const normalizedAngle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
      const distanceFromFront = Math.min(normalizedAngle, Math.PI * 2 - normalizedAngle);
      
      // Opacity curve: 0 at back (π), 1 at front (0 or 2π)
      // Use a smooth curve that peaks at front
      const normalizedDistance = distanceFromFront / Math.PI; // 0 to 1
      const opacity = Math.max(0, Math.min(1, 1 - (normalizedDistance * 2))); // Fade from 1 at front to 0 at back
      
      // Apply simple 2D positioning (no 3D transforms that break clickability)
      block.style.position = 'absolute';
      block.style.left = `${finalX}px`;
      block.style.top = `${constrainedY}px`;
      block.style.opacity = opacity;
      block.style.transform = 'none'; // No 3D transforms
      block.style.zIndex = opacity > 0.1 ? 10 : 1; // Higher z-index when visible
      
      // Ensure block is visible and clickable
      block.style.visibility = opacity > 0.05 ? 'visible' : 'hidden';
      block.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none'; // Only clickable when visible
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
  }, 200); // Delay to ensure DOM and 3D scene are ready
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateBlockPositions();
  });
})();
