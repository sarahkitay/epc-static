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
    const frontCardIndex = Math.floor(scrollProgress * journalBlocks.length);
    
    journalBlocks.forEach((block, index) => {
      // Calculate position in spiral (0 to 1) - each card gets a position around the circle
      const spiralPosition = index / journalBlocks.length;
      
      // Add scroll rotation so cards orbit as you scroll
      const scrollRotation = scrollProgress * 0.5; // Half rotation as you scroll through all cards
      const combinedProgress = (spiralPosition + scrollRotation) % 1;
      
      // Spiral angle (full circle)
      const angle = combinedProgress * Math.PI * 2;
      
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
      
      // Determine if this is the "front" card
      const isFrontCard = index === frontCardIndex || 
                         (index === frontCardIndex + 1 && scrollProgress * journalBlocks.length % 1 > 0.7) ||
                         (index === frontCardIndex - 1 && scrollProgress * journalBlocks.length % 1 < 0.3);
      
      // Distance from center for depth calculation
      const distanceFromCenter = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
      const maxDistance = radius + 50;
      
      // Z depth - front card is closest, others are further back
      let zDistance;
      if (isFrontCard) {
        zDistance = 0; // Front card is at front
      } else {
        // Other cards are behind, based on distance from front position
        const angleDiff = Math.abs(angle - (frontCardIndex / journalBlocks.length * Math.PI * 2));
        const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff) / Math.PI; // 0 to 1
        zDistance = -200 - (normalizedAngleDiff * 150); // Range: -200 to -350
      }
      
      // Scale - front card is largest, others scale down
      let scale;
      if (isFrontCard) {
        scale = 1.1; // Front card is largest
      } else {
        const angleDiff = Math.abs(angle - (frontCardIndex / journalBlocks.length * Math.PI * 2));
        const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff) / Math.PI; // 0 to 1
        scale = 0.75 + (normalizedAngleDiff * 0.25); // Range: 0.75 to 1.0
      }
      
      // Opacity - front card is fully opaque, others are readable but less prominent
      let opacity;
      if (isFrontCard) {
        opacity = 1.0; // Front card is fully visible
      } else {
        const angleDiff = Math.abs(angle - (frontCardIndex / journalBlocks.length * Math.PI * 2));
        const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff) / Math.PI; // 0 to 1
        opacity = 0.7 - (normalizedAngleDiff * 0.3); // Range: 0.7 to 0.4 (still readable)
      }
      
      // Rotation - cards face the center, front card faces forward
      let rotationY;
      if (isFrontCard) {
        rotationY = 0; // Front card faces forward
      } else {
        // Other cards rotate to face center
        rotationY = angle * (180 / Math.PI) + 180; // Face center (add 180 to face inward)
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
