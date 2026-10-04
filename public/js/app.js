/**
 * AI Powered College Notice Board - Frontend Application Logic
 */

const App = {
  currentUser: null,
  activeTab: 'feed',
  categories: [],
  filters: {
    search: '',
    category: 'All',
    department: 'All',
    year: 'All',
    priority: 'All',
    savedOnly: false
  },
  notices: [],

  async init() {
    this.initTheme();
    if (!API.hasAuthenticatedSession()) {
      API.clearAuth();
      window.location.replace('/login');
      return;
    }

    try {
      const session = await API.getMe();
      this.currentUser = session.user;
      API.setCurrentUser(session.user);
    } catch (err) {
      API.clearAuth();
      window.location.replace('/login');
      return;
    }

    this.bindEvents();
    this.updateUserUI();

    if (typeof AIChat !== 'undefined') {
      AIChat.init();
    }

    await this.loadCategories();
    await this.loadNotices();
    await this.loadNotifications();
    this.initUrgentTicker();

    // Check DB status for footer
    this.checkHealthAndDbStatus();
  },

  async checkHealthAndDbStatus() {
    try {
      const res = await fetch('/api/health').then(r => r.json());
      const footerDb = document.getElementById('footer-db-status');
      if (footerDb && res.database) {
        footerDb.innerHTML = `<i class="bi bi-database-check" style="color:var(--low);"></i> Database: <strong>${res.database}</strong> · Status: Online`;
      }
    } catch (e) {
      console.warn('Health check error:', e);
    }
  },

  // -------------------------------------------------------------
  // THEME MANAGEMENT
  // -------------------------------------------------------------
  initTheme() {
    const savedTheme = localStorage.getItem('campus_pulse_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('campus_pulse_theme', next);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = next === 'dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
    }
  },

  // -------------------------------------------------------------
  // USER PROFILE & ROLES
  // -------------------------------------------------------------
  updateUserUI() {
    const user = this.currentUser;
    if (!user) return;

    // Navbar Profile Badge
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('user-avatar-initials');
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = `${user.role} · ${user.department || 'Campus'}`;

    // Hero Greeting
    const heroTitle = document.getElementById('hero-greeting-title');
    const heroAudience = document.getElementById('hero-audience-pill');
    if (heroTitle && heroAudience) {
      const firstName = user.name.split(' ')[0];
      if (user.role === 'Faculty') {
        heroTitle.textContent = `Welcome, ${user.name}! 👨‍🏫`;
        heroAudience.innerHTML = `<i class="bi bi-shield-check"></i> Faculty · ${user.department}`;
      } else if (user.role === 'Administrator') {
        heroTitle.textContent = `Welcome, ${user.name}! 🛡️`;
        heroAudience.innerHTML = `<i class="bi bi-gear-fill"></i> College Administrator`;
      } else {
        heroTitle.textContent = `Welcome, ${firstName}! 🎓`;
        heroAudience.innerHTML = `<i class="bi bi-mortarboard-fill"></i> ${user.department} · ${user.year}`;
      }
    }

    // Faculty Quick Post Box on Feed (visible when role is Faculty or Admin)
    const quickPostCard = document.getElementById('faculty-quick-post-card');
    if (quickPostCard) {
      quickPostCard.style.display = (user.role === 'Faculty' || user.role === 'Administrator') ? 'block' : 'none';
    }

    // Role-based Navigation Tabs Visibility
    const publishTab = document.getElementById('tab-btn-publish');
    const adminTab = document.getElementById('tab-btn-admin');

    if (publishTab) {
      publishTab.style.display = (user.role === 'Faculty' || user.role === 'Administrator') ? 'inline-flex' : 'none';
    }
    if (adminTab) {
      adminTab.style.display = (user.role === 'Administrator') ? 'inline-flex' : 'none';
    }

    const resetDatabaseCard = document.getElementById('reset-local-database-card');
    if (resetDatabaseCard) {
      resetDatabaseCard.style.display = user.role === 'Administrator' ? 'block' : 'none';
    }
  },

  logout() {
    API.clearAuth();
    window.location.replace('/login');
  },

  // -------------------------------------------------------------
  // TAB NAVIGATION
  // -------------------------------------------------------------
  switchTab(tabId) {
    this.activeTab = tabId;

    // Update Tab Buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update View Sections
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${tabId}`);
    if (activeView) {
      activeView.classList.add('active');
    }

    if (tabId === 'feed') {
      this.filters.savedOnly = false;
      this.loadNotices();
    } else if (tabId === 'saved') {
      this.filters.savedOnly = true;
      this.loadNotices();
    } else if (tabId === 'publish') {
      this.loadFacultyNotices();
    } else if (tabId === 'admin') {
      this.loadAdminStats();
      this.loadAdminUsers();
    }
  },

  // -------------------------------------------------------------
  // CATEGORIES & NOTICES
  // -------------------------------------------------------------
  async loadCategories() {
    try {
      const res = await API.getCategories();
      this.categories = res.categories || [];
      this.renderCategoryPills();
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  },

  renderCategoryPills() {
    const container = document.getElementById('category-pills-row');
    if (!container) return;

    let html = `
      <button class="category-pill-btn ${this.filters.category === 'All' ? 'active' : ''}" onclick="App.setCategoryFilter('All')">
        <i class="bi bi-grid-fill"></i> All Notices
      </button>
    `;

    this.categories.forEach(cat => {
      const active = this.filters.category.toLowerCase() === cat.name.toLowerCase() ? 'active' : '';
      html += `
        <button class="category-pill-btn ${active}" onclick="App.setCategoryFilter('${cat.name}')">
          <i class="bi ${cat.icon || 'bi-tag'}"></i> ${cat.name}
        </button>
      `;
    });

    container.innerHTML = html;
  },

  setCategoryFilter(catName) {
    this.filters.category = catName;
    this.renderCategoryPills();
    this.loadNotices();
  },

  async loadNotices() {
    const grid = document.getElementById('notices-grid-container');
    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
        <div class="spinner-border" style="width:28px; height:28px; border:3px solid var(--primary); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 12px;"></div>
        <p>Loading active campus notices from database...</p>
      </div>
    `;

    try {
      const filterParams = { ...this.filters };
      const res = await API.getNotices(filterParams);
      this.notices = res.notices || [];
      this.renderNoticeCards(this.notices);

      const countEl = document.getElementById('results-count-text');
      if (countEl) {
        countEl.textContent = `Showing ${this.notices.length} notices`;
      }
    } catch (err) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--urgent);">
          <i class="bi bi-exclamation-triangle" style="font-size:2rem;"></i>
          <p>Failed to load notices: ${err.message}</p>
        </div>
      `;
    }
  },

  renderNoticeCards(noticesList) {
    const grid = document.getElementById('notices-grid-container');
    if (!grid) return;

    if (noticesList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:4rem 2rem; background:var(--bg-surface); border:1px dashed var(--border-subtle); border-radius:var(--radius-xl);">
          <i class="bi bi-inbox" style="font-size:3rem; color:var(--text-dim); margin-bottom:12px; display:block;"></i>
          <h3 style="font-size:1.2rem; color:var(--text-main); margin-bottom:6px;">No notices match your current filters</h3>
          <p style="font-size:0.85rem; color:var(--text-muted); max-width:400px; margin:0 auto 16px;">Try adjusting your search criteria, department, or category filter to discover more notices.</p>
          <button class="btn-primary" onclick="App.clearAllFilters()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset All Filters
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = noticesList.map(notice => {
      const pClass = notice.priority.toLowerCase();
      const pIcon = notice.priority === 'Urgent' ? 'bi-exclamation-octagon-fill' : notice.priority === 'High' ? 'bi-lightning-charge-fill' : 'bi-info-circle-fill';
      const audienceDept = (notice.targetDepartments || []).join(', ');
      const audienceYear = (notice.targetYears || []).join(', ');
      const isBookmarked = notice.isBookmarked;
      const publishDate = new Date(notice.publishAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return `
        <article class="notice-card" data-priority="${notice.priority}">
          <div>
            <div class="card-header-meta">
              <div class="badges-group">
                <span class="badge-priority ${pClass}">
                  <i class="bi ${pIcon}"></i> ${notice.priority}
                </span>
                <span class="badge-category">${notice.category}</span>
                ${notice.isPinned ? '<span style="font-size:0.7rem; color:var(--primary); font-weight:700;"><i class="bi bi-pin-angle-fill"></i> Pinned</span>' : ''}
              </div>
              <button class="bookmark-toggle-btn ${isBookmarked ? 'bookmarked' : ''}" 
                title="${isBookmarked ? 'Remove Bookmark' : 'Save Notice'}" 
                onclick="App.toggleBookmark('${notice.id}', event)">
                <i class="bi ${isBookmarked ? 'bi-bookmark-star-fill' : 'bi-bookmark'}"></i>
              </button>
            </div>

            <h3 class="card-title" onclick="App.openNoticeModal('${notice.id}')">
              ${this.escapeHtml(notice.title)}
            </h3>

            <div class="card-audience-row">
              <i class="bi bi-people-fill"></i>
              <span>${audienceDept} · ${audienceYear}</span>
            </div>

            ${notice.summary ? `
              <div class="ai-summary-card-box">
                <div class="ai-summary-header">
                  <span><i class="bi bi-stars"></i> AI Summary</span>
                </div>
                <div class="ai-summary-text">${this.escapeHtml(notice.summary)}</div>
              </div>
            ` : ''}
          </div>

          <div class="card-footer-meta">
            <div class="author-chip">
              <div class="author-avatar-sm">${notice.authorName ? notice.authorName[0] : 'C'}</div>
              <div>
                <span style="font-weight:600; color:var(--text-main);">${notice.authorName}</span>
                <span style="display:block; font-size:0.68rem; color:var(--text-dim);">${publishDate}</span>
              </div>
            </div>

            <div class="card-actions-row">
              ${notice.attachment ? `
                <button class="btn-read-more" title="View Attachment" style="padding:0.4rem 0.6rem;" onclick="App.openAttachmentModal('${notice.id}', event)">
                  <i class="bi bi-paperclip"></i>
                </button>
              ` : ''}
              <button class="btn-read-more" onclick="App.openNoticeModal('${notice.id}')">
                Read Notice <i class="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  // -------------------------------------------------------------
  // FACULTY QUICK-POST TO LIVE FEED
  // -------------------------------------------------------------
  async handleQuickPostSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('quick-post-title').value.trim();
    const category = document.getElementById('quick-post-category').value;
    const priority = document.getElementById('quick-post-priority').value;
    const content = document.getElementById('quick-post-content').value.trim();
    const autoAi = document.getElementById('quick-post-auto-ai').checked;
    const submitBtn = document.getElementById('btn-quick-post-submit');

    if (!title || !content) {
      this.showToast('Please enter both title and notice content.', 'error');
      return;
    }

    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner-border" style="width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span> Saving to Database...`;

    try {
      let summary = '';
      if (autoAi) {
        try {
          const sumRes = await API.summarizeNotice(title, content);
          summary = sumRes.summary || '';
        } catch (e) {
          console.warn('Auto AI summary fallback:', e);
        }
      }

      const userDept = this.currentUser ? this.currentUser.department : 'All';
      const payload = {
        title,
        content,
        summary,
        category,
        priority,
        targetDepartments: [userDept || 'All'],
        targetYears: ['All']
      };

      const res = await API.createNotice(payload);
      this.showToast(`🎉 Circular "${title}" published to database and live feed!`, 'success');

      // Reset form
      document.getElementById('quick-post-form').reset();

      // Refresh notices feed
      await this.loadNotices();
      await this.loadNotifications();
    } catch (err) {
      this.showToast(`Failed to post notice: ${err.message}`, 'error');
    } finally {
      submitBtn.innerHTML = originalBtnHtml;
    }
  },

  // -------------------------------------------------------------
  // NOTICE DETAIL MODAL
  // -------------------------------------------------------------
  async openNoticeModal(noticeId) {
    try {
      const res = await API.getNoticeById(noticeId);
      const notice = res.notice;
      if (!notice) return;

      const modal = document.getElementById('modal-notice-detail');
      const titleEl = document.getElementById('detail-modal-title');
      const bodyEl = document.getElementById('detail-modal-body');

      titleEl.textContent = notice.title;

      const pClass = notice.priority.toLowerCase();
      const pIcon = notice.priority === 'Urgent' ? 'bi-exclamation-octagon-fill' : 'bi-info-circle-fill';
      const formattedDate = new Date(notice.publishAt).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      bodyEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
          <div style="display:flex; gap:8px;">
            <span class="badge-priority ${pClass}">
              <i class="bi ${pIcon}"></i> ${notice.priority} Priority
            </span>
            <span class="badge-category">${notice.category}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            <i class="bi bi-calendar3"></i> Published: ${formattedDate}
          </div>
        </div>

        <div style="background:var(--bg-page); padding:10px 14px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; border:1px solid var(--border-subtle);">
          <strong>Target Audience:</strong> Departments: <span style="color:var(--primary); font-weight:600;">${notice.targetDepartments.join(', ')}</span> | Years: <span style="color:var(--primary); font-weight:600;">${notice.targetYears.join(', ')}</span>
        </div>

        ${notice.summary ? `
          <div class="detail-ai-callout">
            <h4><i class="bi bi-stars"></i> Intelligent AI Summary</h4>
            <p style="font-size:0.88rem; color:var(--text-main); margin:0;">${this.escapeHtml(notice.summary)}</p>
          </div>
        ` : ''}

        <div style="font-size:0.95rem; line-height:1.7; color:var(--text-main); white-space:pre-line; margin:16px 0;">
          ${this.escapeHtml(notice.content)}
        </div>

        ${notice.attachment ? `
          <div class="detail-attachment-box">
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="bi bi-file-earmark-pdf-fill" style="font-size:1.8rem; color:#ef4444;"></i>
              <div>
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-main);">${notice.attachment.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${notice.attachment.size || 'Official Document'} · Verified Circular</div>
              </div>
            </div>
            <button class="btn-primary" style="padding:6px 14px; font-size:0.8rem;" onclick="App.openAttachmentModal('${notice.id}')">
              <i class="bi bi-eye"></i> View Attachment
            </button>
          </div>
        ` : ''}

        <div style="margin-top:20px; padding-top:14px; border-top:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between; font-size:0.82rem; color:var(--text-muted);">
          <div><strong>Authorized By:</strong> ${notice.authorName} (${notice.authorRole})</div>
          <div><i class="bi bi-eye"></i> ${notice.viewsCount || 1} views in database</div>
        </div>
      `;

      modal.classList.add('active');
    } catch (err) {
      this.showToast(`Error opening notice: ${err.message}`, 'error');
    }
  },

  openAttachmentModal(noticeId, event) {
    if (event) event.stopPropagation();
    const notice = this.notices.find(n => n.id === noticeId);
    if (!notice || !notice.attachment) return;

    const modal = document.getElementById('modal-attachment-viewer');
    const titleEl = document.getElementById('attach-modal-title');
    const bodyEl = document.getElementById('attach-modal-body');

    titleEl.textContent = notice.attachment.name;
    bodyEl.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; background:var(--bg-page); border-radius:12px; border:1px solid var(--border-subtle);">
        <i class="bi bi-file-earmark-pdf-fill" style="font-size:4rem; color:#ef4444; margin-bottom:12px; display:inline-block;"></i>
        <h4 style="font-size:1.1rem; color:var(--text-main); margin-bottom:4px;">${notice.attachment.name}</h4>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:16px;">Autonomous Examination & Academic Office Certified Circular</p>
        <div style="background:var(--bg-surface); padding:16px; border-radius:8px; max-width:500px; margin:0 auto 16px; font-size:0.85rem; text-align:left; border:1px dashed var(--border-subtle);">
          <strong>Circular Summary:</strong> ${notice.summary || notice.title}
        </div>
        <button class="btn-primary" onclick="App.showToast('Official Circular PDF downloaded to device.', 'success')">
          <i class="bi bi-download"></i> Download Verified Copy (${notice.attachment.size || 'PDF'})
        </button>
      </div>
    `;

    modal.classList.add('active');
  },

  // -------------------------------------------------------------
  // BOOKMARKING
  // -------------------------------------------------------------
  async toggleBookmark(noticeId, event) {
    if (event) event.stopPropagation();
    try {
      const res = await API.toggleBookmark(noticeId);
      const isBookmarked = res.bookmarked;

      const target = this.notices.find(n => n.id === noticeId);
      if (target) {
        target.isBookmarked = isBookmarked;
      }

      this.showToast(isBookmarked ? 'Notice saved to Bookmarks' : 'Notice removed from Bookmarks', 'info');
      this.renderNoticeCards(this.notices);
    } catch (err) {
      this.showToast(`Error updating bookmark: ${err.message}`, 'error');
    }
  },

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  async loadNotifications() {
    try {
      const res = await API.getNotifications();
      const badge = document.getElementById('notif-unread-badge');
      const listContainer = document.getElementById('notif-drawer-list');

      if (badge) {
        if (res.unreadCount > 0) {
          badge.textContent = res.unreadCount;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      if (listContainer && res.notifications) {
        if (res.notifications.length === 0) {
          listContainer.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">No notifications right now.</div>`;
          return;
        }

        listContainer.innerHTML = res.notifications.map(n => `
          <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="App.handleNotifClick('${n.id}', '${n.noticeId}')">
            <div class="notif-item-title">${this.escapeHtml(n.title)}</div>
            <div class="notif-item-msg">${this.escapeHtml(n.message)}</div>
            <div class="notif-item-time">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.warn('Error loading notifications:', err);
    }
  },

  toggleNotificationDrawer() {
    const drawer = document.getElementById('notification-drawer');
    if (drawer) {
      drawer.classList.toggle('active');
    }
  },

  async handleNotifClick(notifId, noticeId) {
    try {
      await API.markNotificationRead(notifId);
      this.loadNotifications();
      const drawer = document.getElementById('notification-drawer');
      if (drawer) drawer.classList.remove('active');
      if (noticeId) {
        this.openNoticeModal(noticeId);
      }
    } catch (e) {
      console.warn(e);
    }
  },

  async markAllNotificationsRead() {
    try {
      await API.markAllNotificationsRead();
      this.loadNotifications();
      this.showToast('All notifications marked as read', 'success');
    } catch (e) {
      console.warn(e);
    }
  },

  // -------------------------------------------------------------
  // FACULTY NOTICE CREATION & MANAGEMENT (FULL STUDIO)
  // -------------------------------------------------------------
  async handleAutoSummarizeDraft() {
    const titleEl = document.getElementById('notice-form-title');
    const contentEl = document.getElementById('notice-form-content');
    const summaryInput = document.getElementById('notice-form-summary');
    const btn = document.getElementById('btn-auto-summarize');

    if (!summaryInput) {
      this.showToast('The summary field is unavailable. Please reload the page and try again.', 'error');
      return;
    }

    const title = (titleEl ? titleEl.value : '').trim();
    let content = (contentEl ? contentEl.value : '').trim();

    // If both title and content are empty, fill default Mini Project Review template
    if (!title && !content) {
      this.autoFillMiniProjectTemplate();
      return;
    }

    // If title is provided but content is empty, provide intelligent content and summary
    if (!content && title) {
      if (/mini\s*project/i.test(title)) {
        content = `All 3rd Year B.Tech Artificial Intelligence and Data Science students are hereby informed that the Mini Project Phase-1 Review is scheduled on October 28, 2026, from 09:30 AM to 04:30 PM in Turing Lab-3. Batches must consist of 3-4 students. Project titles and one-page problem abstracts approved by your designated faculty guide must be submitted by October 20, 2026. Evaluation criteria: Novelty (20%), Architecture & Feasibility (30%), Dataset & Survey (30%), Presentation (20%).`;
        if (contentEl) contentEl.value = content;
      } else {
        content = `Official circular regarding ${title}. All concerned students and staff members must follow the schedule and instructions specified by the department coordinator.`;
        if (contentEl) contentEl.value = content;
      }
    }

    const originalText = btn ? btn.innerHTML : '✨ Generate AI Summary';
    const originalDisabled = btn ? btn.disabled : false;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border" style="width:14px; height:14px; border:2px solid var(--primary); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span> Generating Summary...`;
    }

    try {
      const res = await API.summarizeNotice(title, content);
      if (!res || typeof res.summary !== 'string' || !res.summary.trim()) {
        throw new Error('The summary service returned an empty result.');
      }

      summaryInput.value = res.summary.trim();
      summaryInput.style.transition = 'all 0.3s ease';
      summaryInput.style.borderColor = 'var(--primary)';
      summaryInput.style.boxShadow = '0 0 0 4px var(--primary-glow)';
      setTimeout(() => {
        summaryInput.style.borderColor = '';
        summaryInput.style.boxShadow = '';
      }, 1500);
      this.showToast('✨ AI Summary generated successfully!', 'success');
    } catch (err) {
      this.showToast(`Failed to generate summary: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = originalDisabled;
      }
    }
  },

  autoFillMiniProjectTemplate() {
    const titleEl = document.getElementById('notice-form-title');
    const contentEl = document.getElementById('notice-form-content');
    const summaryInput = document.getElementById('notice-form-summary');
    const categoryEl = document.getElementById('notice-form-category');
    const priorityEl = document.getElementById('notice-form-priority');

    if (titleEl) titleEl.value = 'B.Tech Mini Project Phase-1 Review & Abstract Evaluation Schedule';
    if (categoryEl) categoryEl.value = 'Academic';
    if (priorityEl) priorityEl.value = 'High';

    const fullContent = `All 3rd Year B.Tech Artificial Intelligence and Data Science students are hereby informed that the Mini Project Phase-1 Review is scheduled to take place on October 28, 2026, from 09:30 AM to 04:30 PM in the Turing Computing Center (Lab-3).

Key Instructions & Review Guidelines:
1. Team Formation: Each project batch must strictly comprise 3 to 4 members. Individual or cross-department teams are not permitted.
2. Guide Sign-Off: The project title, problem definition, and one-page abstract must be formally approved and signed by your designated faculty guide on or before October 20, 2026.
3. Review Deliverables to Bring:
   - Printed copy of the Guide-Approved Abstract and System Architecture Diagram.
   - Comprehensive literature survey covering a minimum of 5 IEEE/ACM research papers.
   - Working GitHub repository initialized with preliminary dataset exploration and pipeline scripts.
4. Presentation Format: Each batch is allotted 15 minutes (10 minutes presentation + 5 minutes Q&A). Slide decks must strictly not exceed 10 to 12 slides.
5. Evaluation Rubrics: Problem Novelty & Relevance (20%), Proposed Architecture & Feasibility (30%), Dataset Pipeline & Literature Survey (30%), Viva-Voce & Team Contribution (20%).

Attendance is strictly mandatory for all team members in formal college attire. Failure to attend will result in zero marks for Internal Assessment Phase-1. For any clarifications, contact the Department Project Coordinator.`;

    if (contentEl) contentEl.value = fullContent;
    if (summaryInput) {
      summaryInput.value = '3rd Year AI&DS Mini Project Phase-1 Review is scheduled for Oct 28, 2026, in Turing Lab-3. Batches of 3-4 must submit guide-approved abstracts by Oct 20 and present slides covering architecture, literature survey, and dataset pipeline.';
      summaryInput.style.borderColor = 'var(--primary)';
      summaryInput.style.boxShadow = '0 0 0 4px var(--primary-glow)';
      setTimeout(() => {
        summaryInput.style.borderColor = '';
        summaryInput.style.boxShadow = '';
      }, 1500);
    }
    this.showToast('✨ Mini Project Review notice & AI Summary auto-filled!', 'success');
  },

  async handlePublishNoticeSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('notice-form-title').value.trim();
    const category = document.getElementById('notice-form-category').value;
    const priority = document.getElementById('notice-form-priority').value;
    const content = document.getElementById('notice-form-content').value.trim();
    const summary = document.getElementById('notice-form-summary').value.trim();
    const expiresAt = document.getElementById('notice-form-expiry').value;
    const isPinned = document.getElementById('notice-form-pinned').checked;

    const selectedDepts = [];
    document.querySelectorAll('.dept-checkbox:checked').forEach(cb => selectedDepts.push(cb.value));

    const selectedYears = [];
    document.querySelectorAll('.year-checkbox:checked').forEach(cb => selectedYears.push(cb.value));

    if (!title || !content) {
      this.showToast('Please provide a title and notice content.', 'error');
      return;
    }

    try {
      const noticePayload = {
        title,
        content,
        summary,
        category,
        priority,
        targetDepartments: selectedDepts.length > 0 ? selectedDepts : ['All'],
        targetYears: selectedYears.length > 0 ? selectedYears : ['All'],
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isPinned
      };

      await API.createNotice(noticePayload);
      this.showToast('Notice published and broadcasted to students successfully!', 'success');

      document.getElementById('publish-notice-form').reset();
      this.loadFacultyNotices();
      this.loadNotices();
    } catch (err) {
      this.showToast(`Failed to publish notice: ${err.message}`, 'error');
    }
  },

  async loadFacultyNotices() {
    const tableBody = document.getElementById('faculty-notices-table-body');
    if (!tableBody) return;

    try {
      const res = await API.getNotices({ myNoticesOnly: true, includeExpired: true });
      const myNotices = res.notices || [];

      if (myNotices.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">You have not published any notices yet. Use the form above to post your first feed notice!</td></tr>`;
        return;
      }

      tableBody.innerHTML = myNotices.map(n => `
        <tr>
          <td style="font-weight:700; color:var(--text-main);">${this.escapeHtml(n.title)}</td>
          <td><span class="badge-category">${n.category}</span></td>
          <td><span class="badge-priority ${n.priority.toLowerCase()}">${n.priority}</span></td>
          <td><i class="bi bi-eye"></i> ${n.viewsCount || 0}</td>
          <td>
            <button class="btn-read-more" style="color:var(--urgent);" onclick="App.handleDeleteNotice('${n.id}')">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.warn('Error loading faculty notices:', err);
    }
  },

  async handleDeleteNotice(noticeId) {
    if (!confirm('Are you sure you want to delete this notice from the database?')) return;
    try {
      await API.deleteNotice(noticeId);
      this.showToast('Notice deleted successfully from database', 'success');
      this.loadFacultyNotices();
      this.loadNotices();
    } catch (err) {
      this.showToast(`Failed to delete notice: ${err.message}`, 'error');
    }
  },

  // -------------------------------------------------------------
  // ADMIN PORTAL (ANALYTICS & USER ROLES)
  // -------------------------------------------------------------
  async loadAdminStats() {
    try {
      const res = await API.getAdminStats();
      const stats = res.stats;
      if (!stats) return;

      document.getElementById('metric-total-notices').textContent = stats.totalNotices;
      document.getElementById('metric-active-notices').textContent = stats.activeNotices;
      document.getElementById('metric-total-users').textContent = stats.totalUsers;
      document.getElementById('metric-ai-queries').textContent = stats.totalAiQueries;
    } catch (err) {
      console.warn('Error loading admin stats:', err);
    }
  },

  async loadAdminUsers() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    try {
      const res = await API.getAdminUsers();
      const users = res.users || [];

      tableBody.innerHTML = users.map(u => `
        <tr>
          <td style="font-weight:700;">${this.escapeHtml(u.name)}</td>
          <td style="color:var(--text-muted);">${this.escapeHtml(u.email)}</td>
          <td><span class="badge-category">${u.role}</span></td>
          <td>${u.department}</td>
          <td>${u.year || 'N/A'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.warn('Error loading admin users:', err);
    }
  },

  async handleAddCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-cat-name').value.trim();
    const desc = document.getElementById('new-cat-desc').value.trim();
    const color = document.getElementById('new-cat-color').value;

    if (!name) return;

    try {
      await API.createCategory({ name, description: desc, color });
      this.showToast(`Category "${name}" created in database successfully!`, 'success');
      document.getElementById('add-category-form').reset();
      await this.loadCategories();
    } catch (err) {
      this.showToast(`Failed to add category: ${err.message}`, 'error');
    }
  },

  async handleResetLocalDatabase() {
    const confirmed = window.confirm(
      'Reset the local database to seeded demo data? This permanently removes local changes and query history. MongoDB data is not affected.'
    );
    if (!confirmed) return;

    const button = document.getElementById('reset-local-database-btn');
    if (!button) return;

    button.disabled = true;
    try {
      const result = await API.resetLocalDatabase();
      await this.loadCategories();
      await this.clearAllFilters();
      await Promise.all([
        this.loadNotifications(),
        this.loadAdminStats(),
        this.loadAdminUsers()
      ]);
      this.initUrgentTicker();
      this.showToast(result.message, 'success');
    } catch (err) {
      this.showToast(`Failed to reset local database: ${err.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  },

  // -------------------------------------------------------------
  // URGENT TICKER & HELPERS
  // -------------------------------------------------------------
  initUrgentTicker() {
    const urgentNotice = this.notices.find(n => n.priority === 'Urgent');
    const tickerText = document.getElementById('ticker-headline-text');
    if (tickerText && urgentNotice) {
      tickerText.textContent = urgentNotice.title;
      tickerText.onclick = () => this.openNoticeModal(urgentNotice.id);
    }
  },

  clearAllFilters() {
    this.filters = {
      search: '',
      category: 'All',
      department: 'All',
      year: 'All',
      priority: 'All',
      savedOnly: false
    };

    const searchInput = document.getElementById('filter-search-input');
    const navSearch = document.getElementById('nav-search-input');
    const deptSelect = document.getElementById('filter-dept-select');
    const yearSelect = document.getElementById('filter-year-select');
    const prioritySelect = document.getElementById('filter-priority-select');

    if (searchInput) searchInput.value = '';
    if (navSearch) navSearch.value = '';
    if (deptSelect) deptSelect.value = 'All';
    if (yearSelect) yearSelect.value = 'All';
    if (prioritySelect) prioritySelect.value = 'All';

    this.renderCategoryPills();
    return this.loadNotices();
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
    const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f46e5';

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i class="bi ${icon}" style="color:${color}; font-size:1.1rem;"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  bindEvents() {
    const navSearch = document.getElementById('nav-search-input');
    if (navSearch) {
      navSearch.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.loadNotices();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          navSearch.focus();
        }
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    const filterSearch = document.getElementById('filter-search-input');
    if (filterSearch) {
      filterSearch.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.loadNotices();
      });
    }

    const deptSelect = document.getElementById('filter-dept-select');
    if (deptSelect) {
      deptSelect.addEventListener('change', (e) => {
        this.filters.department = e.target.value;
        this.loadNotices();
      });
    }

    const yearSelect = document.getElementById('filter-year-select');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        this.filters.year = e.target.value;
        this.loadNotices();
      });
    }

    const prioritySelect = document.getElementById('filter-priority-select');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        this.filters.priority = e.target.value;
        this.loadNotices();
      });
    }

    const publishForm = document.getElementById('publish-notice-form');
    if (publishForm) {
      publishForm.addEventListener('submit', (e) => this.handlePublishNoticeSubmit(e));
    }

    const autoSummarizeBtn = document.getElementById('btn-auto-summarize');
    if (autoSummarizeBtn) {
      autoSummarizeBtn.addEventListener('click', () => this.handleAutoSummarizeDraft());
    }

    const addCatForm = document.getElementById('add-category-form');
    if (addCatForm) {
      addCatForm.addEventListener('submit', (e) => this.handleAddCategorySubmit(e));
    }

    const resetDatabaseBtn = document.getElementById('reset-local-database-btn');
    if (resetDatabaseBtn) {
      resetDatabaseBtn.addEventListener('click', () => this.handleResetLocalDatabase());
    }

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
