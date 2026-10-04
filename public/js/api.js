/**
 * API Client for AI Powered College Notice Board
 */

const API = {
  getToken() {
    return localStorage.getItem('campus_pulse_token');
  },
  hasAuthenticatedSession() {
    return Boolean(
      this.getToken() &&
      localStorage.getItem('campus_pulse_authenticated') === 'true'
    );
  },
  setToken(token) {
    if (token) {
      localStorage.setItem('campus_pulse_token', token);
    } else {
      localStorage.removeItem('campus_pulse_token');
    }
  },
  getCurrentUser() {
    const raw = localStorage.getItem('campus_pulse_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('campus_pulse_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('campus_pulse_user');
    }
  },
  clearAuth() {
    this.setToken(null);
    this.setCurrentUser(null);
    localStorage.removeItem('campus_pulse_authenticated');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server request failed');
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    this.setCurrentUser(res.user);
    localStorage.setItem('campus_pulse_authenticated', 'true');
    return res;
  },

  async register(userData) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    this.setToken(res.token);
    this.setCurrentUser(res.user);
    localStorage.setItem('campus_pulse_authenticated', 'true');
    return res;
  },

  async getMe() {
    return this.request('/api/auth/me');
  },

  // Notices Endpoints
  async getNotices(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    return this.request(`/api/notices?${params.toString()}`);
  },

  async getNoticeById(id) {
    return this.request(`/api/notices/${id}`);
  },

  async createNotice(noticeData) {
    return this.request('/api/notices', {
      method: 'POST',
      body: JSON.stringify(noticeData)
    });
  },

  async updateNotice(id, updates) {
    return this.request(`/api/notices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteNotice(id) {
    return this.request(`/api/notices/${id}`, {
      method: 'DELETE'
    });
  },

  async toggleBookmark(noticeId) {
    return this.request(`/api/notices/${noticeId}/bookmark`, {
      method: 'POST'
    });
  },

  async getCategories() {
    return this.request('/api/notices/categories');
  },

  // AI Module Endpoints
  async askAi(question) {
    return this.request('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  },

  async summarizeNotice(title, content) {
    return this.request('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
  },

  async getSuggestedQuestions() {
    return this.request('/api/ai/suggested-questions');
  },

  // Admin Endpoints
  async getAdminStats() {
    return this.request('/api/admin/stats');
  },

  async getAdminUsers() {
    return this.request('/api/admin/users');
  },

  async resetLocalDatabase() {
    return this.request('/api/admin/reset-local-database', {
      method: 'POST'
    });
  },

  async createCategory(data) {
    return this.request('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Notifications
  async getNotifications() {
    return this.request('/api/notifications');
  },

  async markNotificationRead(id) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'PUT'
    });
  },

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', {
      method: 'PUT'
    });
  }
};
