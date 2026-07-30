/* ═══════════════════════════════════════════════════════════
   HireReady — Core JS (api.js)
   API client, auth, theme, toast, utils
   ═══════════════════════════════════════════════════════════ */

// ─── Config ──────────────────────────────────────────────────────.

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://localhost:5000/api`
  : `/api`;

// ─── API Client ──────────────────────────────────────────────────
const api = {
  async request(method, path, body, isForm = false) {
    const token = Auth.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = isForm ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Cannot connect to server. Make sure the backend is running.');
      throw err;
    }
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put:  (path, body) => api.request('PUT', path, body),
  delete: (path) => api.request('DELETE', path),
};

// ─── Auth Manager ─────────────────────────────────────────────────
const Auth = {
  TOKEN_KEY: 'hr_token',
  USER_KEY: 'hr_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
  isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    this.setSession(data.token, data.user);
    return data.user;
  },
  async register(name, email, password, targetRole) {
    const data = await api.post('/auth/register', { name, email, password, targetRole });
    this.setSession(data.token, data.user);
    return data.user;
  },
  async logout() {
    try { await api.post('/auth/logout'); } catch {}
    this.clear();
    window.location.href = '/pages/login.html';
  },
  async refreshUser() {
    try {
      const data = await api.get('/auth/me');
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return this.getUser();
    }
  },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  },
};

// ─── Theme Manager ────────────────────────────────────────────────
const Theme = {
  KEY: 'hr_theme',
  current() { return localStorage.getItem(this.KEY) || 'dark'; },
  set(theme) {
    localStorage.setItem(this.KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    this._updateToggleBtn(theme);
  },
  toggle() { this.set(this.current() === 'dark' ? 'light' : 'dark'); },
  init() {
    const saved = this.current();
    document.documentElement.setAttribute('data-theme', saved);
    this._updateToggleBtn(saved);
  },
  _updateToggleBtn(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  },
};

// ─── Toast ────────────────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  },
  show(msg, type = 'info', duration = 3000) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error:   (m) => Toast.show(m, 'error'),
  info:    (m) => Toast.show(m, 'info'),
};

// ─── Navbar Builder ───────────────────────────────────────────────
function buildNavbar(activePage = '') {
  const user = Auth.getUser();
  const isAuth = !!user;
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';

  const pages = [
    { href: '/pages/dashboard.html', label: 'Dashboard', key: 'dashboard' },
    { href: '/pages/interview.html', label: 'Practice', key: 'interview' },
    { href: '/pages/resources.html', label: 'Resources', key: 'resources' },
    { href: '/pages/leaderboard.html', label: 'Leaderboard', key: 'leaderboard' },
  ];

  const navLinks = isAuth ? pages.map(p => `
    <a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">${p.label}</a>
  `).join('') : '';

  const navActions = isAuth ? `
    <button class="theme-btn" onclick="Theme.toggle()" title="Toggle theme">🌙</button>
    <div class="user-menu">
      <button class="user-menu-btn" onclick="toggleUserMenu()">
        <div class="user-avatar-sm">${initials}</div>
        <span>${user.name.split(' ')[0]}</span>
        <span>▾</span>
      </button>
      <div class="user-dropdown" id="user-dropdown">
        <a href="/pages/dashboard.html">📊 Dashboard</a>
        <a href="/pages/settings.html">⚙️ Settings</a>
        <div class="divider"></div>
        <button onclick="Auth.logout()">🚪 Log Out</button>
      </div>
    </div>
  ` : `
    <button class="theme-btn" onclick="Theme.toggle()" title="Toggle theme">🌙</button>
    <a href="/pages/login.html" class="btn btn-ghost btn-sm">Log In</a>
    <a href="/pages/register.html" class="btn btn-primary btn-sm">Sign Up</a>
  `;

  return `
    <nav class="navbar">
      <div class="nav-inner">
        <a href="/index.html" class="nav-logo">
          <div class="logo-icon">💼</div>
          <span>Hire<strong>Ready</strong></span>
        </a>
        <div class="nav-links">${navLinks}</div>
        <div class="nav-actions">${navActions}</div>
      </div>
    </nav>
  `;
}

function toggleUserMenu() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('user-dropdown')?.classList.remove('open');
  }
});

// ─── Sidebar Builder ──────────────────────────────────────────────
function buildSidebar(activePage = '') {
  const user = Auth.getUser();
  if (!user) return '';
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const items = [
    { href: '/pages/dashboard.html', icon: '📊', label: 'Dashboard', key: 'dashboard' },
    { href: '/pages/interview.html', icon: '🎙️', label: 'Interview', key: 'interview' },
    { href: '/pages/evaluation.html', icon: '📈', label: 'Evaluation', key: 'evaluation' },
    { href: '/pages/resources.html', icon: '📚', label: 'Resources', key: 'resources' },
    { href: '/pages/leaderboard.html', icon: '🏆', label: 'Leaderboard', key: 'leaderboard' },
    { href: '/pages/settings.html', icon: '⚙️', label: 'Settings', key: 'settings' },
  ];

  return `
    <aside class="sidebar" id="sidebar">
      <nav class="sidebar-nav">
        ${items.map(i => `
          <a href="${i.href}" class="${activePage === i.key ? 'active' : ''}">
            <span class="nav-icon">${i.icon}</span>${i.label}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-chip-avatar">${initials}</div>
          <div>
            <div class="user-chip-name">${user.name}</div>
            <div class="user-chip-role">${user.targetRole || 'SDE'} Track</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

// ─── Utility ──────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function scoreColor(score) {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}
function setProgressBar(el, pct) {
  if (!el) return;
  const fill = el.querySelector('.progress-fill');
  if (fill) fill.style.width = Math.min(100, pct) + '%';
}

// ─── Init ─────────────────────────────────────────────────────────
Theme.init();
Toast.init();
