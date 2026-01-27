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
    const orbitRotation = scrollProgress * Math.PI * 2;
    
    // Responsive radius - adapts to viewport size
    const baseRadius = Math.min(
      viewportWidth * 0.35, // 35% of viewport
      600 // Max radius
    );
    
    journalBlocks.forEach((block, index) => {
      // Calculate position in spiral (0 to 1)
      const spiralPosition = index / journalBlocks.length;
      
      // Add orbit rotation
      const angle = (spiralPosition * Math.PI * 2) + orbitRotation;
      
      // Spiral radius
      const radius = baseRadius;
      
      // Calculate X and Y positions in spiral
      const xOffset = Math.cos(angle) * radius;
      const yOffset = Math.sin(angle) * radius * 0.25; // Flatter spiral
      
      // Vertical distribution - better spacing
      const verticalSpacing = 300; // Increased spacing
      const cardVerticalOffset = (index * verticalSpacing) - ((journalBlocks.length * verticalSpacing) / 2);
      
      // Vertical scroll offset
      const maxVerticalOffset = ctaTop - center.y - 250;
      const scrollVerticalOffset = Math.min(
        scrollProgress * viewportHeight * 0.35,
        maxVerticalOffset
      );
      
      // Calculate final position relative to viewport center
      const blockWidth = 280;
      const blockHeight = 200; // Approximate
      const finalX = center.x + xOffset - (blockWidth / 2);
      const finalY = center.y + yOffset + cardVerticalOffset + scrollVerticalOffset - (blockHeight / 2);
      
      // Ensure cards don't go below CTA
      const ctaRect = ctaSection ? ctaSection.getBoundingClientRect() : null;
      const maxY = ctaRect ? ctaRect.top - 180 : window.innerHeight * 0.8;
      const constrainedY = Math.min(finalY, maxY);
      
      // Calculate opacity - SOFTER FADE
      const normalizedAngle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
      const distanceFromFront = Math.min(normalizedAngle, Math.PI * 2 - normalizedAngle);
      
      // Softer opacity curve with minimum visibility
      const normalizedDistance = distanceFromFront / Math.PI;
      const opacity = Math.max(
        0.2, // Minimum 20% opacity (never fully invisible)
        Math.min(1, 1 - (normalizedDistance * 1.1)) // Softer fade
      );
      
      // Constrain cards to viewport bounds
      const minX = 20; // 20px padding from left
      const maxX = viewportWidth - blockWidth - 20; // 20px padding from right
      const constrainedX = Math.max(minX, Math.min(maxX, finalX));
      
      // Apply positioning
      block.style.position = 'absolute';
      block.style.left = `${constrainedX}px`;
      block.style.top = `${constrainedY}px`;
      block.style.opacity = opacity;
      block.style.transform = 'none';
      block.style.zIndex = Math.round(opacity * 10) + 5; // Z-index based on opacity
      
      // Visibility and clickability
      const isVisible = opacity > 0.15;
      block.style.visibility = isVisible ? 'visible' : 'hidden';
      block.style.pointerEvents = isVisible ? 'auto' : 'none';
      
      // Smooth transition for opacity
      block.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
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
