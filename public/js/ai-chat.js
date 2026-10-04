/**
 * AI Chat & Grounded RAG Interface Handler
 */

const AIChat = {
  container: null,
  form: null,
  thread: null,
  input: null,
  sendBtn: null,
  promptsContainer: null,

  init() {
    this.container = document.getElementById('view-ai');
    this.form = document.getElementById('ai-question-form');
    this.thread = document.getElementById('ai-chat-thread');
    this.input = document.getElementById('ai-query-input');
    this.sendBtn = document.getElementById('ai-send-btn');
    this.promptsContainer = document.getElementById('suggested-prompts-container');

    if (!this.form || !this.input || !this.sendBtn) return;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSend();
    });

    this.loadSuggestedPrompts();
  },

  async loadSuggestedPrompts() {
    try {
      const res = await API.getSuggestedQuestions();
      if (res && res.suggestions && this.promptsContainer) {
        this.promptsContainer.innerHTML = '';
        res.suggestions.forEach(queryText => {
          const chip = document.createElement('button');
          chip.className = 'prompt-chip';
          chip.innerHTML = `<i class="bi bi-chat-quote"></i> ${queryText}`;
          chip.addEventListener('click', () => {
            this.input.value = queryText;
            this.handleSend();
          });
          this.promptsContainer.appendChild(chip);
        });
      }
    } catch (err) {
      console.warn('Failed to load suggested AI prompts:', err);
    }
  },

  async handleSend() {
    const question = this.input.value.trim();
    if (!question) return;

    // Append user query bubble
    this.appendUserMessage(question);
    this.input.value = '';

    // Create temporary thinking bubble
    const loadingId = 'loading-' + Date.now();
    this.appendLoadingBubble(loadingId);

    try {
      const res = await API.askAi(question);
      this.removeLoadingBubble(loadingId);
      this.appendAiResponse(res.answer, res.sources, res.provider);
    } catch (err) {
      this.removeLoadingBubble(loadingId);
      this.appendAiResponse(
        `⚠️ Could not retrieve answer at this time: ${err.message}. Please try a different query or check your connection.`,
        [],
        'System Notice'
      );
    }
  },

  appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-user';
    bubble.textContent = text;
    this.thread.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  appendLoadingBubble(id) {
    const bubble = document.createElement('div');
    bubble.id = id;
    bubble.className = 'chat-bubble-ai';
    bubble.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; color:var(--text-muted); font-size:0.88rem;">
        <span class="spinner-border" style="width:18px; height:18px; border:2px solid var(--primary); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span>
        <span>Scanning active college notices & generating grounded answer...</span>
      </div>
    `;
    this.thread.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  removeLoadingBubble(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  appendAiResponse(answerMarkdown, sources, provider) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-ai';

    // Parse simple markdown: headers, bullets, bold, blockquotes
    const formattedHtml = this.formatMarkdown(answerMarkdown);

    // Sources rendering
    let sourcesHtml = '';
    if (sources && sources.length > 0) {
      const cards = sources.map(s => `
        <div class="source-card-item" onclick="App.openNoticeModal('${s.id}')">
          <div class="source-card-title">${this.escapeHtml(s.title)}</div>
          <div class="source-card-meta">
            <span>${s.category}</span> · 
            <span style="color:var(--primary); font-weight:700;">${s.priority}</span>
          </div>
        </div>
      `).join('');

      sourcesHtml = `
        <div class="chat-sources-section">
          <div class="sources-label">
            <i class="bi bi-shield-check" style="color:var(--low);"></i> Verified Grounded Sources (${sources.length})
          </div>
          <div class="source-cards-list">
            ${cards}
          </div>
        </div>
      `;
    }

    bubble.innerHTML = `
      <div class="chat-ai-header">
        <div class="chat-ai-badge">
          <i class="bi bi-robot"></i> Campus AI Assistant
        </div>
        <div class="chat-ai-provider">${provider || 'Grounded Engine'}</div>
      </div>
      <div class="chat-ai-content">
        ${formattedHtml}
      </div>
      ${sourcesHtml}
    `;

    this.thread.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  formatMarkdown(text) {
    if (!text) return '';

    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Bullet items
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Linebreaks
      .replace(/\n\n/g, '<br><br>');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
