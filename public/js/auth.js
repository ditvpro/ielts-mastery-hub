/**
 * Auth module - Simple profile management
 */
const Auth = {
  profile: null,

  init() {
    this.profile = Storage.getProfile();
    if (!this.profile) this.showSetupModal();
    return this.profile;
  },

  showSetupModal() {
    const content = `
      <div class="input-group mb-md">
        <label class="input-label">Your Name</label>
        <input type="text" class="input" id="setupName" placeholder="Enter your name" required>
      </div>
      <div class="input-group mb-md">
        <label class="input-label">Email (optional)</label>
        <input type="email" class="input" id="setupEmail" placeholder="your@email.com">
      </div>
      <div class="input-group mb-md">
        <label class="input-label">Target Band Score</label>
        <select class="select" id="setupBand">
          <option value="5.5">Band 5.5</option>
          <option value="6.0" selected>Band 6.0</option>
          <option value="6.5">Band 6.5</option>
          <option value="7.0">Band 7.0</option>
        </select>
      </div>
      <p class="text-muted" style="font-size: var(--fs-xs);">Your data is stored locally on this device.</p>
    `;

    Utils.showModal('Welcome to IELTS Mastery Hub! 🎓', content, [
      {
        text: 'Start Learning',
        class: 'btn-primary btn-lg',
        closeOnClick: false,
        onClick: () => {
          const name = document.getElementById('setupName').value.trim();
          if (!name) { Utils.showToast('Please enter your name', 'warning'); return; }
          this.profile = {
            name,
            email: document.getElementById('setupEmail').value.trim(),
            targetBand: parseFloat(document.getElementById('setupBand').value),
            startDate: new Date().toISOString(),
          };
          Storage.saveProfile(this.profile);
          Utils.closeModal();
          Utils.showToast(`Welcome, ${name}! Let's achieve Band ${this.profile.targetBand}!`, 'success');
          window.location.hash = '#dashboard';
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      }
    ]);
  },

  getProfile() {
    if (!this.profile) this.profile = Storage.getProfile();
    return this.profile;
  },
};
