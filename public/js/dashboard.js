/**
 * Dashboard Module - Shows overview, stats, quick-start buttons
 */
const Dashboard = {
  render() {
    const container = document.getElementById('view-dashboard');
    const profile = Auth.getProfile();
    const stats = Storage.getStats();
    const name = profile?.name || 'Learner';
    const target = profile?.targetBand || 6.0;
    const allScores = [stats.speakingAvg, stats.writingAvg, stats.readingAvg, stats.listeningAvg].filter(s => s > 0);
    const overall = allScores.length ? Utils.calculateBandAverage(allScores) : 0;

    container.innerHTML = `
      <div class="dashboard animate-fadeInUp">
        <div class="section-header">
          <h1>Welcome back, ${Utils.escapeHtml(name)}! 👋</h1>
          <p>Target: Band ${target} · ${stats.streak > 0 ? `🔥 ${stats.streak}-day streak` : 'Start practicing today!'}</p>
        </div>

        <!-- Overall Score Card -->
        <div class="card card-glow mb-lg" style="text-align:center; padding: var(--space-2xl);">
          <div style="font-size: var(--fs-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-sm);">Estimated Overall Band</div>
          <div style="font-size: 4rem; font-weight: 800; color: ${overall >= target ? 'var(--accent-success)' : 'var(--accent)'}; line-height: 1;">${overall || '—'}</div>
          <div style="margin-top: var(--space-md); font-size: var(--fs-sm); color: var(--text-secondary);">
            ${overall ? `${overall >= target ? '🎉 You\'re meeting your target!' : `${(target - overall).toFixed(1)} bands to go`}` : 'Complete practice sessions to see your score'}
          </div>
        </div>

        <!-- Skills Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-xl);">
          ${this.renderSkillCard('🎙️', 'Speaking', stats.speakingAvg, '#speaking')}
          ${this.renderSkillCard('✍️', 'Writing', stats.writingAvg, '#writing')}
          ${this.renderSkillCard('📖', 'Reading', stats.readingAvg, '#reading')}
          ${this.renderSkillCard('🎧', 'Listening', stats.listeningAvg, '#listening')}
        </div>

        <!-- Stats Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-xl);">
          <div class="card" style="text-align: center;">
            <div style="font-size: var(--fs-2xl); font-weight: 700; color: var(--accent-secondary);">${stats.totalSessions}</div>
            <div style="font-size: var(--fs-xs); color: var(--text-muted);">Total Sessions</div>
          </div>
          <div class="card" style="text-align: center;">
            <div style="font-size: var(--fs-2xl); font-weight: 700; color: var(--accent-tertiary);">${stats.vocabCount}</div>
            <div style="font-size: var(--fs-xs); color: var(--text-muted);">Words Saved</div>
          </div>
          <div class="card" style="text-align: center;">
            <div style="font-size: var(--fs-2xl); font-weight: 700; color: var(--accent-warning);">🔥 ${stats.streak}</div>
            <div style="font-size: var(--fs-xs); color: var(--text-muted);">Day Streak</div>
          </div>
        </div>

        <!-- Weekly Progress -->
        <div class="card mb-lg">
          <div class="card-header"><h3 class="card-title">📊 Weekly Activity</h3></div>
          <div style="display: flex; align-items: flex-end; gap: var(--space-sm); height: 120px; padding: var(--space-md);">
            ${this.renderWeeklyChart()}
          </div>
        </div>

        <!-- Quick Start -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">🚀 Quick Start</h3></div>
          <div class="btn-group" style="flex-wrap: wrap;">
            <a href="#speaking" class="btn btn-primary">🎙️ Speaking Practice</a>
            <a href="#writing" class="btn btn-secondary">✍️ Writing Practice</a>
            <a href="#reading" class="btn btn-secondary">📖 Reading Practice</a>
            <a href="#listening" class="btn btn-secondary">🎧 Listening Practice</a>
            <a href="#vocabulary" class="btn btn-ghost">📚 Vocabulary</a>
          </div>
        </div>
      </div>
    `;
  },

  renderSkillCard(icon, name, score, link) {
    const target = Auth.getProfile()?.targetBand || 6.0;
    const color = score ? Utils.getBandColor(score) : 'var(--text-muted)';
    return `
      <a href="${link}" class="card" style="text-decoration: none; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: var(--space-md);">
          <span style="font-size: 2rem;">${icon}</span>
          <div style="flex: 1;">
            <div style="font-size: var(--fs-sm); font-weight: 600;">${name}</div>
            <div style="font-size: var(--fs-2xl); font-weight: 800; color: ${color};">${score || '—'}</div>
          </div>
        </div>
        ${score ? Utils.createProgressBar(score) : '<div style="font-size: var(--fs-xs); color: var(--text-muted);">No data yet</div>'}
      </a>
    `;
  },

  renderWeeklyChart() {
    const log = Storage.load(CONFIG.STORAGE_KEYS.PRACTICE_LOG, []);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    return days.map((day, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const count = log.filter(l => new Date(l.date).toDateString() === date.toDateString()).length;
      const height = Math.max(count * 20, 4);
      const isToday = date.toDateString() === today.toDateString();
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <div style="width: 100%; height: ${height}px; max-height: 100px; background: ${isToday ? 'var(--accent)' : 'var(--bg-tertiary)'}; border-radius: 4px; transition: height 0.3s;"></div>
          <span style="font-size: 10px; color: ${isToday ? 'var(--accent)' : 'var(--text-muted)'};">${day}</span>
        </div>
      `;
    }).join('');
  },
};
