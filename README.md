# AI Powered College Notice Board 🎓✨

> A complete web application for intelligent notice publishing, semantic discovery, and student communication.  
> **Programme:** B.Tech Artificial Intelligence and Data Science  
> **Academic Year:** 2026 – 2027  
> **Version:** 1.0.0

---

## 🌟 Overview & Key Features

The **AI Powered College Notice Board** modernizes campus communication by replacing scattered paper notices and WhatsApp groups with a centralized, intelligent digital hub.

1. **Role-Based Access Control (RBAC):**
   - **Student:** Personalized notice feed filtered by Department and Academic Year, unread badges, saved bookmarks, and in-app notifications.
   - **Faculty / Staff:** Notice publishing with rich audience selectors, priority flags, document attachments, and automated **AI Summarization**.
   - **Administrator:** Campus analytics, user management, and category management.

2. **Retrieval-Augmented Generation (RAG) AI Module ("Ask the Board"):**
   - Students can ask plain-language questions like:
     - *"What are the upcoming events for third year?"*
     - *"When do autonomous semester theory examinations start?"*
     - *"What is the eligibility for Google & Microsoft internship drive?"*
   - Strictly grounded in official notices to prevent hallucinations.
   - Generates bullet-pointed summaries with verified clickable source circular cards.

3. **Intelligent Summarization:**
   - Automatically synthesizes long administrative circulars into crisp 2-sentence executive briefs highlighting deadlines, venues, fees, and eligibility.

4. **Multi-Criteria Notice Filtering:**
   - Filter by Category (*Examinations, Academic, Placements, Events, Sports, Circulars*).
   - Filter by Priority (*Urgent, High, Medium, Low*).
   - Filter by Department (*AI&DS, CSE, ECE, IT, etc.*) and Year (*1st, 2nd, 3rd, 4th*).
   - Instant search with keyboard shortcut (`/`).

5. **Aesthetics & UI:**
   - Glassmorphic, modern responsive design with dark mode and light mode.
   - Animated urgent ticker for high-priority alerts.
   - Interactive circular preview and download simulator.

---

## 🏗️ Architecture & Technology Stack

- **Frontend:** Vanilla HTML5, CSS3 (modern glassmorphism, responsive grid), and ES6+ JavaScript.
- **Backend:** Node.js and Express.js REST API.
- **Database Layer:** Robust persistent JSON storage (`data/database.json`) seeded with realistic campus circulars.
- **AI Engine:**
  - Built-in zero-dependency semantic TF-IDF RAG & extractive summarizer (runs 100% turnkey offline).
  - Optional plug-and-play support for OpenAI (`OPENAI_API_KEY`) and Google Gemini.

---

## 📁 Project Directory Structure

```
├── .env                  # Environment configuration
├── .env.example          # Environment variables template
├── package.json          # Node.js project manifest & dependencies
├── server.js             # Express.js server & route orchestration
├── README.md             # Complete project documentation
├── models/
│   └── db.js             # Data persistence layer with CRUD & query logging
├── data/
│   ├── seedData.js       # Pre-seeded users, circulars, categories, notifications
│   └── database.json     # Auto-generated persistent JSON database
├── services/
│   └── aiService.js      # Grounded RAG Q&A engine, summarizer & query generator
├── routes/
│   ├── auth.js           # Authentication, JWT, and demo role switcher
│   ├── notices.js        # Notice CRUD, filtering, bookmarks, view counter
│   ├── ai.js             # Ask the Board & AI Summarize endpoints
│   ├── admin.js          # Campus stats, metrics, users, categories
│   └── notifications.js  # In-app notification delivery
└── public/
    ├── index.html        # Single-page web application UI
    ├── css/
    │   └── style.css     # Design system, dark/light themes, animations
    └── js/
        ├── api.js        # Frontend REST API client
        ├── ai-chat.js    # "Ask the Board" RAG interactive module
        └── app.js        # Application controller, filters, state management
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## 🔑 Pre-Configured Test Accounts (1-Click Switcher Available in UI)

You can switch between any of these roles instantly from the top-right profile badge in the application:

| Role | Name | Email | Password | Scope |
|---|---|---|---|---|
| **Student** | Karthik R | `student.aids3@college.edu` | `student123` | B.Tech AI & DS (3rd Year) |
| **Student** | Ananya Sharma | `student.cse2@college.edu` | `student123` | B.Tech CSE (2nd Year) |
| **Faculty** | Prof. Priya Sundaram | `faculty.aids@college.edu` | `faculty123` | HOD AI & DS |
| **Faculty** | Dr. K. Venkatesh | `faculty.cse@college.edu` | `faculty123` | Training & Placement Officer |
| **Administrator** | Dr. S. Ramanathan | `admin@college.edu` | `admin123` | Controller of Examinations |

---

## 🔌 API Endpoints Reference

### Authentication
- `POST /api/auth/register` — Register a new student or faculty account.
- `POST /api/auth/login` — Sign in and obtain JWT token.
- `GET /api/auth/demo-users` — Retrieve pre-configured demo profiles.
- `POST /api/auth/switch-demo` — Quick-switch demo account.

### Notices
- `GET /api/notices` — Query notices with filters: `search`, `category`, `priority`, `department`, `year`, `savedOnly`.
- `GET /api/notices/:id` — Get single notice detail and increment view count.
- `POST /api/notices` — Publish a new circular (Faculty / Admin).
- `PUT /api/notices/:id` — Update notice content or audience.
- `DELETE /api/notices/:id` — Delete notice.
- `POST /api/notices/:id/bookmark` — Toggle bookmark for current user.

### AI Engine
- `POST /api/ai/ask` — Answer natural language question using grounded RAG.
- `POST /api/ai/summarize` — Generate concise 2-sentence summary of circular.
- `GET /api/ai/suggested-questions` — Dynamic suggested questions based on active notices.

### Administration & Notifications
- `GET /api/admin/stats` — Campus notice metrics and query activity.
- `GET /api/admin/users` — Directory of registered campus accounts.
- `POST /api/admin/categories` — Add new notice category.
- `GET /api/notifications` — Fetch user's in-app alerts.
- `PUT /api/notifications/:id/read` — Mark notification as read.
