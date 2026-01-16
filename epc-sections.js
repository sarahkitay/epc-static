/**
 * Shared JS for non-home pages.
 * - Ensures favicon is set sitewide
 * - Provides basic mobile nav toggle behavior
 */
(function () {
  function ensureFavicon() {
    const hasAnyIcon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (!hasAnyIcon) {
      const icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/svg+xml';
      icon.href = '/favicon.svg';
      document.head.appendChild(icon);
    }

    const hasApple = document.querySelector('link[rel="apple-touch-icon"]');
    if (!hasApple) {
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = '/favicon.svg';
      document.head.appendChild(apple);
    }
  }

  function initNavToggle() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;

    const toggle = nav.querySelector('.nav-toggle');
    const menu = nav.querySelector('#navMenu');
    if (!toggle || !menu) return;

    function setOpen(isOpen) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menu.classList.toggle('is-open', isOpen);
      nav.classList.toggle('is-open', isOpen);
      document.documentElement.classList.toggle('nav-open', isOpen);
    }

    toggle.addEventListener('click', function () {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    });

    // Close on menu link click
    menu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureFavicon();
      initNavToggle();
    });
  } else {
    ensureFavicon();
    initNavToggle();
  }
})();

