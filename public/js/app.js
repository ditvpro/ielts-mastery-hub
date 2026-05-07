/**
 * Main Application Entry Point
 * Initializes router, auth, and global event listeners
 */
(function () {
  'use strict';

  const router = new Router();

  // Register routes
  router.register('#dashboard', () => Dashboard.render());
  router.register('#speaking', () => Speaking.render());
  router.register('#writing', () => Writing.render());
  router.register('#reading', () => Reading.render());
  router.register('#listening', () => Listening.render());
  router.register('#vocabulary', () => Vocabulary.render());

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    // Check/create user profile
    Auth.init();

    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    navToggle?.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });

    // Close nav on link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navToggle?.classList.remove('active');
        navLinks?.classList.remove('open');
      });
    });

    // Brand click -> dashboard
    document.getElementById('navBrand')?.addEventListener('click', () => {
      router.navigate('#dashboard');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1': e.preventDefault(); router.navigate('#dashboard'); break;
          case '2': e.preventDefault(); router.navigate('#speaking'); break;
          case '3': e.preventDefault(); router.navigate('#writing'); break;
          case '4': e.preventDefault(); router.navigate('#reading'); break;
          case '5': e.preventDefault(); router.navigate('#listening'); break;
          case '6': e.preventDefault(); router.navigate('#vocabulary'); break;
        }
      }
      // Escape closes modal
      if (e.key === 'Escape') Utils.closeModal();
    });

    // Warn before leaving during active sessions
    window.addEventListener('beforeunload', (e) => {
      if (Speaking.sessionId || (Writing.timer && Writing.timer.isRunning())) {
        e.preventDefault();
        e.returnValue = 'You have an active session. Are you sure you want to leave?';
      }
    });

    // Inactivity timeout (15 minutes)
    let inactivityTimer;
    const INACTIVITY_LIMIT = 15 * 60 * 1000;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        let resetOccurred = false;
        
        if (typeof Speaking !== 'undefined' && Speaking.sessionId) {
          Speaking.endSession();
          resetOccurred = true;
        }
        
        if (typeof Writing !== 'undefined' && Writing.timer && Writing.timer.isRunning()) {
          Writing.timer.stop();
          Writing.render();
          resetOccurred = true;
        }
        
        if (typeof Reading !== 'undefined' && Reading.passage && !Reading.submitted) {
          if (Reading.timer) Reading.timer.stop();
          Reading.passage = null;
          Reading.render();
          resetOccurred = true;
        }
        
        if (typeof Listening !== 'undefined' && Listening.currentSet && !Listening.submitted) {
          Listening.pause();
          Listening.currentSet = null;
          Listening.render();
          resetOccurred = true;
        }

        if (resetOccurred) {
          Utils.showModal('Session Timeout', '<p>Your practice session was automatically saved and closed due to 15 minutes of inactivity.</p>', [{ text: 'OK', class: 'btn-primary', onClick: () => Utils.closeModal() }]);
        }
      }, INACTIVITY_LIMIT);
    };

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt => {
      document.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer();

    // Start router
    router.init();
  });
})();
