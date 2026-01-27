// Journal Spiral - Cards orbit around center 3D figure, one faces front at a time
(function() {
  'use strict';

  // Skip on mobile
  if (window.innerWidth <= 768) return;

  const journalBlocks = document.querySelectorAll('.journal-block');
  if (journalBlocks.length === 0) return;

  const container = document.querySelector('.journal-container');
  if (!container) return;

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
    
    // Total scroll range for the journal
    const totalScrollHeight = Math.max(1, containerRect.height - viewportHeight);
    const scrollProgress = Math.max(0, Math.min(1, (scrollTop - containerTop + viewportHeight * 0.3) / totalScrollHeight));
    
    // Calculate which card should be "front" based on scroll
    // As you scroll, different cards come to front
    const frontCardIndex = Math.floor(scrollProgress * journalBlocks.length);
    
    // Calculate rotation offset - cards orbit as you scroll
    const orbitRotation = scrollProgress * Math.PI * 2; // Full rotation as you scroll
    
    journalBlocks.forEach((block, index) => {
      // Calculate position in spiral (0 to 1) - each card gets a position around the circle
      const spiralPosition = index / journalBlocks.length;
      
      // Add orbit rotation so cards rotate around center as you scroll
      const angle = (spiralPosition * Math.PI * 2) + orbitRotation;
      
      // Spiral radius - consistent radius for all cards
      const baseRadius = 280; // Base radius in pixels
      const radius = baseRadius;
      
      // Calculate X and Y positions in spiral (relative to center)
      const xOffset = Math.cos(angle) * radius;
      const yOffset = Math.sin(angle) * radius * 0.4; // Less Y movement for flatter spiral
      
      // Vertical scroll offset - cards move down as you scroll
      const verticalScrollOffset = scrollProgress * viewportHeight * 0.4;
      
      // Calculate final position relative to viewport center
      const finalX = center.x + xOffset - 140; // Subtract half block width (280px / 2)
      const finalY = center.y + yOffset + verticalScrollOffset - 100; // Center Y + spiral offset + scroll offset - half block height
      
      // Determine if this is the "front" card (the one that should face forward)
      // Front card is the one closest to the front position (angle closest to 0 or 2π)
      const normalizedAngle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
      const distanceFromFront = Math.min(normalizedAngle, Math.PI * 2 - normalizedAngle);
      const isFrontCard = distanceFromFront < (Math.PI / 4) || distanceFromFront > (Math.PI * 2 - Math.PI / 4); // Within 45 degrees of front
      
      // Distance from center for depth calculation
      const distanceFromCenter = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
      
      // Z depth - front card is closest, others are further back based on angle from front
      let zDistance;
      if (isFrontCard) {
        zDistance = 50; // Front card is at front
      } else {
        // Other cards are behind, based on angle from front
        zDistance = -150 - (distanceFromFront / Math.PI * 200); // Range: -150 to -350
      }
      
      // Scale - front card is largest, others scale down based on angle from front
      let scale;
      if (isFrontCard) {
        scale = 1.15; // Front card is largest
      } else {
        scale = 0.8 + (1 - distanceFromFront / Math.PI) * 0.25; // Range: 0.8 to 1.05
      }
      
      // Opacity - front card is fully opaque, others are readable but less prominent
      let opacity;
      if (isFrontCard) {
        opacity = 1.0; // Front card is fully visible
      } else {
        opacity = 0.6 + (1 - distanceFromFront / Math.PI) * 0.3; // Range: 0.6 to 0.9 (all readable)
      }
      
      // Rotation - front card faces forward, others face center
      let rotationY;
      if (isFrontCard) {
        rotationY = 0; // Front card faces forward
      } else {
        // Other cards rotate to face center
        // Calculate angle to center from card position
        const angleToCenter = Math.atan2(-yOffset, -xOffset) * (180 / Math.PI);
        rotationY = angleToCenter + 180; // Face center
      }
      
      // Apply 3D transform
      block.style.transform = `
        translate3d(${finalX}px, ${finalY}px, ${zDistance}px)
        scale(${scale})
        rotateY(${rotationY}deg)
      `;
      block.style.opacity = opacity;
      block.style.zIndex = Math.round(1000 + (zDistance + 400)); // Higher z-index for front blocks
      
      // Ensure block is visible
      block.style.visibility = 'visible';
      
      // Ensure entire card is clickable (pointer-events)
      block.style.pointerEvents = 'auto';
      
      // Add active class to front card
      if (isFrontCard) {
        block.classList.add('journal-block-active');
      } else {
        block.classList.remove('journal-block-active');
      }
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
