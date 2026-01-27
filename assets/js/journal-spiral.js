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
    
    // Total scroll range - start orbit later
    const maxScrollHeight = ctaTop - containerTop - viewportHeight * 0.2;
    const totalScrollHeight = Math.max(1, maxScrollHeight);
    const scrollProgress = Math.max(0, Math.min(1, (scrollTop - containerTop + viewportHeight * 0.5) / totalScrollHeight));
    
    // Calculate rotation offset
    const orbitRotation = scrollProgress * Math.PI * 2;
    
    // Responsive radius
    const baseRadius = Math.min(
      viewportWidth * 0.35,
      600
    );
    
    journalBlocks.forEach((block, index) => {
      const spiralPosition = index / journalBlocks.length;
      const angle = (spiralPosition * Math.PI * 2) + orbitRotation;
      const radius = baseRadius;
      
      // CIRCULAR ORBIT - More Y movement
      const xOffset = Math.cos(angle) * radius;
      const yOffset = Math.sin(angle) * radius * 0.6; // Increased for circular feel
      
      // Vertical distribution
      const verticalSpacing = 300;
      const cardVerticalOffset = (index * verticalSpacing) - ((journalBlocks.length * verticalSpacing) / 2);
      
      // Vertical scroll offset
      const maxVerticalOffset = ctaTop - center.y - 250;
      const scrollVerticalOffset = Math.min(
        scrollProgress * viewportHeight * 0.35,
        maxVerticalOffset
      );
      
      // Calculate final position WITH HEADER PROTECTION
      const blockWidth = 280;
      const blockHeight = 200;
      const headerOffset = 120; // Your header height
      
      const finalX = center.x + xOffset - (blockWidth / 2);
      const finalY = Math.max(
        headerOffset + 80, // Never overlap header
        center.y + yOffset + cardVerticalOffset + scrollVerticalOffset - (blockHeight / 2)
      );
      
      // Constrain to CTA
      const ctaRect = ctaSection ? ctaSection.getBoundingClientRect() : null;
      const maxY = ctaRect ? ctaRect.top - 180 : window.innerHeight * 0.8;
      const constrainedY = Math.min(finalY, maxY);
      
      // Calculate opacity
      const normalizedAngle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
      const distanceFromFront = Math.min(normalizedAngle, Math.PI * 2 - normalizedAngle);
      const normalizedDistance = distanceFromFront / Math.PI;
      const opacity = Math.max(
        0.2,
        Math.min(1, 1 - (normalizedDistance * 1.1))
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
      
      const isVisible = opacity > 0.15;
      block.style.visibility = isVisible ? 'visible' : 'hidden';
      block.style.pointerEvents = isVisible ? 'auto' : 'none';
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
