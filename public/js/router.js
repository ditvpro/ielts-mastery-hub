/**
 * Hash-based SPA Router
 */
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
  }

  register(hash, handler) { this.routes[hash] = handler; }

  navigate(hash) {
    window.location.hash = hash;
  }

  handleRoute() {
    const hash = window.location.hash || '#dashboard';
    const routeName = CONFIG.ROUTES[hash] || 'dashboard';

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-route') === routeName);
    });

    // Close mobile nav
    document.getElementById('navLinks')?.classList.remove('open');
    document.getElementById('navToggle')?.classList.remove('active');

    // Cancel any playing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Hide all views, show active one
    document.querySelectorAll('.route-view').forEach(view => {
      view.style.display = 'none';
    });
    const activeView = document.getElementById(`view-${routeName}`);
    if (activeView) activeView.style.display = 'block';

    // Run route handler
    const handler = this.routes[hash] || this.routes['#dashboard'];
    if (handler) {
      this.currentRoute = hash;
      handler();
    }
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }
}
