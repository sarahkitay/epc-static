// Spiral Journal Layout - Scroll-based spiral animation
(function() {
  'use strict';

  const spiralContainer = document.querySelector('.epc-spiral-container');
  const spiralCards = document.querySelectorAll('.epc-spiral-card');
  const centerLogo = document.querySelector('.epc-spiral-logo');
  const spiralPath = document.querySelector('.epc-spiral-path');
  
  if (!spiralContainer || spiralCards.length === 0) return;

  let scrollProgress = 0;
  let isScrolling = false;
  let rafId = null;

  // Spiral parameters
  const SPIRAL_TURNS = 3; // Number of full rotations
  const SPIRAL_RADIUS_START = 200; // Starting radius in pixels
  const SPIRAL_RADIUS_GROWTH = 180; // Radius growth per turn
  const CARD_SPACING = 0.15; // Spacing between cards (0-1)
  const TOTAL_CARDS = spiralCards.length;
  const SCROLL_DEPTH = 3000; // Total scroll depth in pixels

  // Calculate spiral position for each card
  function calculateSpiralPosition(index, progress) {
    const normalizedIndex = index / TOTAL_CARDS;
    // Base angle for card position + scroll rotation
    const baseAngle = normalizedIndex * SPIRAL_TURNS * 2 * Math.PI;
    const scrollRotation = progress * Math.PI * 2; // Full rotation as you scroll
    const angle = baseAngle + scrollRotation;
    
    // Radius grows with index and scroll
    const baseRadius = SPIRAL_RADIUS_START + (normalizedIndex * SPIRAL_RADIUS_GROWTH * SPIRAL_TURNS);
    const radius = baseRadius + (progress * 100); // Slight expansion on scroll
    
    // Calculate position relative to center
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius + (progress * 1000); // Descend as we scroll
    
    // Rotation aligned to spiral tangent (cards face outward)
    const rotation = (angle * 180 / Math.PI) + 90;
    
    // Opacity based on scroll position (cards in view are more visible)
    const cardProgress = (progress * TOTAL_CARDS) - index;
    const opacity = Math.max(0.4, Math.min(1, 1 - Math.abs(cardProgress) * 0.3));
    
    // Scale based on position (active card is larger)
    const scale = Math.max(0.7, Math.min(1.1, 1 - Math.abs(cardProgress) * 0.2));
    
    // Blur effect for non-active cards (less aggressive)
    const blur = Math.abs(cardProgress) > 1 ? Math.min(Math.abs(cardProgress) * 1.5, 4) : 0;
    
    return { x, y, rotation, opacity, scale, blur, zIndex: Math.round(1000 - Math.abs(cardProgress) * 50) };
  }

  // Update card positions based on scroll
  function updateSpiral() {
    const containerRect = spiralContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const containerTop = scrollTop + containerRect.top;
    // Start calculating from when container enters viewport
    const scrollPosition = Math.max(0, scrollTop - containerTop + viewportHeight * 0.3);
    
    scrollProgress = Math.min(1, scrollPosition / SCROLL_DEPTH);
    
    // Update center logo
    if (centerLogo) {
      const logoScale = Math.max(0.4, 1 - scrollProgress * 0.6);
      const logoOpacity = Math.max(0.3, 1 - scrollProgress * 0.7);
      centerLogo.style.transform = `scale(${logoScale})`;
      centerLogo.style.opacity = logoOpacity;
    }

    // Update each card
    spiralCards.forEach((card, index) => {
      const pos = calculateSpiralPosition(index, scrollProgress);
      
      // Use translate3d for better performance and correct syntax
      card.style.transform = `
        translate3d(${pos.x}px, ${pos.y}px, 0) 
        rotate(${pos.rotation}deg) 
        scale(${pos.scale})
      `;
      card.style.opacity = pos.opacity;
      card.style.filter = pos.blur > 0 ? `blur(${Math.min(pos.blur, 3)}px)` : 'none';
      card.style.zIndex = pos.zIndex;
      
      // Add active class to featured card
      const cardProgress = (scrollProgress * TOTAL_CARDS) - index;
      if (Math.abs(cardProgress) < 0.3) {
        card.classList.add('epc-spiral-card-active');
      } else {
        card.classList.remove('epc-spiral-card-active');
      }
    });

    // Update spiral path visibility
    if (spiralPath) {
      spiralPath.style.opacity = Math.min(0.15, scrollProgress * 0.2);
    }
  }

  // Smooth scroll handler with RAF
  function handleScroll() {
    if (!isScrolling) {
      isScrolling = true;
    }
    
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
      updateSpiral();
      isScrolling = false;
    });
  }

  // Card hover effects
  spiralCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      if (!this.classList.contains('epc-spiral-card-active')) {
        this.style.transform += ' rotate(2deg) scale(1.02)';
        this.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      }
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transition = '';
      updateSpiral(); // Reset to spiral position
    });
  });

  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(updateSpiral, 100);
    });
  } else {
    setTimeout(updateSpiral, 100);
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', updateSpiral);

  // Intersection Observer for performance
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        handleScroll();
      }
    });
  }, { threshold: 0.1 });

  if (spiralContainer) {
    observer.observe(spiralContainer);
  }
})();
