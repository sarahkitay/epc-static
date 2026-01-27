// Journal Spiral - Cards orbit around center 3D figure in a spiral pattern
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
    
    journalBlocks.forEach((block, index) => {
      // Calculate position in spiral (0 to 1) - each card gets a position around the circle
      const spiralPosition = index / journalBlocks.length;
      
      // Combine scroll progress with spiral position for dynamic movement
      // As you scroll, the spiral rotates
      const combinedProgress = (spiralPosition + scrollProgress * 0.5) % 1;
      
      // Spiral angle (full circle)
      const angle = combinedProgress * Math.PI * 2;
      
      // Spiral radius - starts smaller, increases as you scroll down
      const baseRadius = 200; // Base radius in pixels
      const radiusVariation = scrollProgress * 150; // Radius increases with scroll
      const radius = baseRadius + radiusVariation;
      
      // Calculate X and Y positions in spiral (relative to center)
      const xOffset = Math.cos(angle) * radius;
      const yOffset = Math.sin(angle) * radius * 0.4; // Less Y movement for flatter spiral
      
      // Vertical scroll offset - cards move down as you scroll
      const verticalScrollOffset = scrollProgress * viewportHeight * 0.3;
      
      // Calculate final position relative to viewport center
      const finalX = center.x + xOffset - 140; // Subtract half block width (280px / 2)
      const finalY = center.y + yOffset + verticalScrollOffset - 100; // Center Y + spiral offset + scroll offset - half block height
      
      // Z depth - cards closer to center are in front
      const distanceFromCenter = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
      const maxDistance = radius + 50;
      const zDistance = -400 + (distanceFromCenter / maxDistance) * 300; // Range: -400 to -100
      
      // Scale - cards closer to center are larger
      const scale = Math.max(0.6, Math.min(1.2, 1.0 - (distanceFromCenter / maxDistance) * 0.4));
      
      // Opacity - cards closer to center are more visible
      const opacity = Math.max(0.5, Math.min(1, 1.0 - (distanceFromCenter / maxDistance) * 0.5));
      
      // Rotation - cards face the center
      const rotationY = angle * (180 / Math.PI); // Convert to degrees
      
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
      
      // Add active class to blocks near center
      if (distanceFromCenter < radius * 0.6) {
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
