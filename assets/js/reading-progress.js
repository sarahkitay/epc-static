// Reading Progress Bar for Blog Posts
(function() {
  'use strict';
  
  // Create progress bar element
  const progressBar = document.createElement('div');
  progressBar.className = 'epc-reading-progress';
  document.body.appendChild(progressBar);
  
  // Calculate reading progress
  function updateProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollableHeight = documentHeight - windowHeight;
    const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
    
    progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
  }
  
  // Throttle scroll events for performance
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }
  
  // Only run on blog post pages
  if (document.querySelector('.epc-blog-post')) {
    window.addEventListener('scroll', onScroll, { passive: true });
    updateProgress(); // Initial update
  }
})();
