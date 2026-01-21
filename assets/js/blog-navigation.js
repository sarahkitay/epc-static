// Blog Post Navigation - Next/Previous Posts
(function() {
  'use strict';
  
  // Blog post order (update this when adding new posts)
  const blogPosts = [
    { slug: 'newyear', title: 'The 2026 Challenge: Why Most New Year Resolutions Fail' },
    { slug: 'performance-testing', title: 'The Complete Guide to Sports Performance Testing' },
    { slug: 'acl-prevention', title: 'ACL Injury Prevention Protocol for Youth Athletes' },
    { slug: 'return-to-play', title: 'Return to Play Criteria: When Can Athletes Safely Return?' },
    { slug: 'performance-clinic-vs-pt', title: 'Performance Clinic vs Physical Therapy: What\'s the Difference?' },
    { slug: 'performance-pyramid', title: 'The Performance Pyramid: Building Athletic Excellence' },
    { slug: 'proteus', title: 'Proteus Performance Testing: Understanding Your Results' },
    { slug: 'preventative-care', title: 'Preventative Care: Staying Ahead of Injuries' },
    { slug: 'pt-before-surgery', title: 'Physical Therapy Before Surgery: Prehabilitation Benefits' },
    { slug: 'pt-after-surgery', title: 'Physical Therapy After Surgery: Recovery Protocols' },
    { slug: 'shockwave-therapy', title: 'Shockwave Therapy: Advanced Recovery Technology' },
    { slug: 'contrast-therapy', title: 'Contrast Therapy: Hot and Cold Recovery Methods' },
    { slug: 'emsculpt', title: 'EMSCULPT: Non-Invasive Muscle Building' },
    { slug: 'custom-insoles', title: 'Custom Insoles: Supporting Your Foundation' },
    { slug: 'movement-patterns', title: 'Movement Patterns: The Foundation of Performance' },
    { slug: 'squat-for-life', title: 'Squat for Life: Building Lower Body Strength' }
  ];
  
  function getCurrentPostIndex() {
    const currentPath = window.location.pathname;
    const currentSlug = currentPath.split('/').pop().replace('.html', '');
    return blogPosts.findIndex(post => post.slug === currentSlug);
  }
  
  function createNavigation() {
    const currentIndex = getCurrentPostIndex();
    if (currentIndex === -1) return; // Not a blog post page
    
    const navHTML = `
      <nav class="epc-blog-navigation" aria-label="Blog post navigation">
        <div class="epc-blog-nav-item epc-blog-nav-item--prev">
          ${currentIndex > 0 ? `
            <span class="epc-blog-nav-label">Previous</span>
            <a href="/blog/${blogPosts[currentIndex - 1].slug}" class="epc-blog-nav-link">
              ${blogPosts[currentIndex - 1].title}
            </a>
          ` : `
            <span class="epc-blog-nav-label">Previous</span>
            <span class="epc-blog-nav-link" style="opacity: 0.3; cursor: default;">No previous post</span>
          `}
        </div>
        <div class="epc-blog-nav-item epc-blog-nav-item--next">
          ${currentIndex < blogPosts.length - 1 ? `
            <span class="epc-blog-nav-label">Next</span>
            <a href="/blog/${blogPosts[currentIndex + 1].slug}" class="epc-blog-nav-link">
              ${blogPosts[currentIndex + 1].title}
            </a>
          ` : `
            <span class="epc-blog-nav-label">Next</span>
            <span class="epc-blog-nav-link" style="opacity: 0.3; cursor: default;">No next post</span>
          `}
        </div>
      </nav>
    `;
    
    // Insert before closing main tag or at end of blog post content
    const blogPost = document.querySelector('.epc-blog-post');
    if (blogPost) {
      blogPost.insertAdjacentHTML('beforeend', navHTML);
    } else {
      // Fallback: insert before footer
      const footer = document.querySelector('footer');
      if (footer) {
        footer.insertAdjacentHTML('beforebegin', navHTML);
      }
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createNavigation);
  } else {
    createNavigation();
  }
})();
