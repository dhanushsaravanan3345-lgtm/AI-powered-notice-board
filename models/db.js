const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Mongoose Models
const User = require('./User');
const Notice = require('./Notice');
const Category = require('./Category');
const Notification = require('./Notification');
const QueryLog = require('./QueryLog');

const { defaultCategories, defaultUsers, defaultNotices, defaultNotifications } = require('../data/seedData');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');
let isMongoConnected = false;

function createSeedData() {
  return {
    users: JSON.parse(JSON.stringify(defaultUsers)),
    notices: JSON.parse(JSON.stringify(defaultNotices)),
    categories: JSON.parse(JSON.stringify(defaultCategories)),
    notifications: JSON.parse(JSON.stringify(defaultNotifications)),
    queries: []
  };
}

// 1. Attempt Real MongoDB Connection if configured
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Database] MONGODB_URI not set. Operating in local persistent database mode (data/database.json).');
    console.log('[Database] Tip: Add MONGODB_URI=mongodb://127.0.0.1:27017/college_notice_board or MongoDB Atlas URI in .env to use standalone MongoDB server.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    isMongoConnected = true;
    console.log(`[Database] 🚀 Successfully connected to original MongoDB at: ${uri.split('@').pop()}`);
    await seedMongoDatabase();
    return true;
  } catch (err) {
    console.warn(`[Database] ⚠️ MongoDB connection to "${uri}" failed (${err.message}). Falling back to local persistent storage.`);
    isMongoConnected = false;
    return false;
  }
}

// Seed Mongo if connected and empty
async function seedMongoDatabase() {
  try {
    const noticeCount = await Notice.countDocuments();
    if (noticeCount === 0) {
      console.log('[Database] MongoDB empty. Seeding initial categories, users, and faculty circulars...');
      await Category.insertMany(defaultCategories);
      await User.insertMany(defaultUsers);
      await Notice.insertMany(defaultNotices);
      await Notification.insertMany(defaultNotifications);
      console.log('[Database] MongoDB successfully seeded with official circulars.');
    }
  } catch (err) {
    console.error('[Database] MongoDB seeding warning:', err.message);
  }
}

// 2. Persistent Local Storage Fallback Engine
function initLocalStore() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialData = createSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    const initialData = createSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

function saveLocalStore(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to write database.json:', err.message);
  }
}

// Unified Database Facade
const db = {
  isMongo() {
    return isMongoConnected;
  },

  async init() {
    return await connectMongoDB();
  },

  resetLocalStore() {
    if (isMongoConnected) {
      throw new Error('The local database cannot be reset while MongoDB is active.');
    }

    const initialData = createSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    return {
      users: initialData.users.length,
      notices: initialData.notices.length,
      categories: initialData.categories.length,
      notifications: initialData.notifications.length
    };
  },

  // --- USER OPERATIONS ---
  async getUsers() {
    if (isMongoConnected) {
      const users = await User.find({}).lean();
      return users.map(u => ({ ...u, id: u._id.toString() }));
    }
    const data = initLocalStore();
    return data.users || [];
  },

  async getUserById(id) {
    if (isMongoConnected) {
      const u = mongoose.Types.ObjectId.isValid(id) ? await User.findById(id).lean() : await User.findOne({ id }).lean();
      return u ? { ...u, id: u._id.toString() } : null;
    }
    return (await this.getUsers()).find(u => u.id === id);
  },

  async getUserByEmail(email) {
    if (!email) return null;
    if (isMongoConnected) {
      const u = await User.findOne({ email: email.toLowerCase() }).lean();
      return u ? { ...u, id: u._id.toString() } : null;
    }
    return (await this.getUsers()).find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  async createUser(userData) {
    if (isMongoConnected) {
      const created = await User.create(userData);
      const obj = created.toObject();
      return { ...obj, id: obj._id.toString() };
    }
    const data = initLocalStore();
    const newUser = {
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString(),
      notificationPreferences: { inApp: true, email: true },
      ...userData
    };
    data.users.push(newUser);
    saveLocalStore(data);
    return newUser;
  },

  // --- NOTICE OPERATIONS ---
  async getNotices() {
    if (isMongoConnected) {
      const notices = await Notice.find({}).sort({ isPinned: -1, publishAt: -1 }).lean();
      return notices.map(n => ({ ...n, id: n._id.toString() }));
    }
    const data = initLocalStore();
    return data.notices || [];
  },

  async getNoticeById(id) {
    if (isMongoConnected) {
      const n = mongoose.Types.ObjectId.isValid(id) ? await Notice.findById(id).lean() : await Notice.findOne({ id }).lean();
      return n ? { ...n, id: n._id.toString() } : null;
    }
    return (await this.getNotices()).find(n => n.id === id);
  },

  async createNotice(noticeData) {
    if (isMongoConnected) {
      const created = await Notice.create({
        ...noticeData,
        publishAt: noticeData.publishAt || new Date(),
        status: 'Published',
        viewsCount: 0,
        savedByUsers: []
      });
      const obj = created.toObject();
      const newNotice = { ...obj, id: obj._id.toString() };

      if (newNotice.priority === 'Urgent' || newNotice.priority === 'High') {
        await this.broadcastNoticeNotification(newNotice);
      }
      return newNotice;
    }

    const data = initLocalStore();
    const newNotice = {
      id: 'not-' + Date.now(),
      publishAt: new Date().toISOString(),
      status: 'Published',
      viewsCount: 0,
      savedByUsers: [],
      ...noticeData
    };
    data.notices.unshift(newNotice);
    saveLocalStore(data);

    if (newNotice.priority === 'Urgent' || newNotice.priority === 'High') {
      await this.broadcastNoticeNotification(newNotice, data);
    }
    return newNotice;
  },

  async updateNotice(id, updateData) {
    if (isMongoConnected) {
      const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
      const updated = await Notice.findOneAndUpdate(query, { ...updateData, updatedAt: new Date() }, { new: true }).lean();
      return updated ? { ...updated, id: updated._id.toString() } : null;
    }

    const data = initLocalStore();
    const index = data.notices.findIndex(n => n.id === id);
    if (index === -1) return null;

    data.notices[index] = {
      ...data.notices[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    saveLocalStore(data);
    return data.notices[index];
  },

  async deleteNotice(id) {
    if (isMongoConnected) {
      const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
      const res = await Notice.deleteOne(query);
      return res.deletedCount > 0;
    }

    const data = initLocalStore();
    const index = data.notices.findIndex(n => n.id === id);
    if (index === -1) return false;
    data.notices.splice(index, 1);
    saveLocalStore(data);
    return true;
  },

  async toggleBookmark(noticeId, userId) {
    if (isMongoConnected) {
      const query = mongoose.Types.ObjectId.isValid(noticeId) ? { _id: noticeId } : { id: noticeId };
      const notice = await Notice.findOne(query);
      if (!notice) return null;

      const exists = notice.savedByUsers.includes(userId);
      if (exists) {
        notice.savedByUsers = notice.savedByUsers.filter(u => u !== userId);
      } else {
        notice.savedByUsers.push(userId);
      }
      await notice.save();
      return { bookmarked: !exists, count: notice.savedByUsers.length };
    }

    const data = initLocalStore();
    const notice = data.notices.find(n => n.id === noticeId);
    if (!notice) return null;

    if (!Array.isArray(notice.savedByUsers)) {
      notice.savedByUsers = [];
    }

    const existsIndex = notice.savedByUsers.indexOf(userId);
    let bookmarked = false;
    if (existsIndex >= 0) {
      notice.savedByUsers.splice(existsIndex, 1);
      bookmarked = false;
    } else {
      notice.savedByUsers.push(userId);
      bookmarked = true;
    }
    saveLocalStore(data);
    return { bookmarked, count: notice.savedByUsers.length };
  },

  async incrementViews(noticeId) {
    if (isMongoConnected) {
      const query = mongoose.Types.ObjectId.isValid(noticeId) ? { _id: noticeId } : { id: noticeId };
      await Notice.updateOne(query, { $inc: { viewsCount: 1 } });
      return;
    }

    const data = initLocalStore();
    const notice = data.notices.find(n => n.id === noticeId);
    if (notice) {
      notice.viewsCount = (notice.viewsCount || 0) + 1;
      saveLocalStore(data);
    }
  },

  // --- CATEGORIES OPERATIONS ---
  async getCategories() {
    if (isMongoConnected) {
      const cats = await Category.find({}).lean();
      return cats.map(c => ({ ...c, id: c._id.toString() }));
    }
    const data = initLocalStore();
    return data.categories || [];
  },

  async createCategory(categoryData) {
    if (isMongoConnected) {
      const cat = await Category.create(categoryData);
      const obj = cat.toObject();
      return { ...obj, id: obj._id.toString() };
    }
    const data = initLocalStore();
    const newCategory = {
      id: 'cat-' + Date.now(),
      ...categoryData
    };
    data.categories.push(newCategory);
    saveLocalStore(data);
    return newCategory;
  },

  // --- NOTIFICATIONS OPERATIONS ---
  async getNotificationsForUser(userId) {
    if (isMongoConnected) {
      const notifs = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
      return notifs.map(n => ({ ...n, id: n._id.toString() }));
    }
    const data = initLocalStore();
    return (data.notifications || [])
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async markNotificationAsRead(id, userId) {
    if (isMongoConnected) {
      const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const res = await Notification.updateOne(query, { isRead: true });
      return res.modifiedCount > 0;
    }
    const data = initLocalStore();
    const notif = (data.notifications || []).find(n => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      saveLocalStore(data);
      return true;
    }
    return false;
  },

  async markAllNotificationsRead(userId) {
    if (isMongoConnected) {
      await Notification.updateMany({ userId, isRead: false }, { isRead: true });
      return true;
    }
    const data = initLocalStore();
    let updated = false;
    (data.notifications || []).forEach(n => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        updated = true;
      }
    });
    if (updated) saveLocalStore(data);
    return true;
  },

  async broadcastNoticeNotification(notice, dataInstance) {
    const users = await this.getUsers();
    const students = users.filter(u => u.role === 'Student');

    const notifsToInsert = [];
    students.forEach(student => {
      const deptMatch = !notice.targetDepartments || notice.targetDepartments.includes('All') || notice.targetDepartments.includes(student.department);
      const yearMatch = !notice.targetYears || notice.targetYears.includes('All') || notice.targetYears.includes(student.year);

      if (deptMatch && yearMatch) {
        notifsToInsert.push({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          userId: student.id,
          noticeId: notice.id,
          title: `[${notice.priority}] ${notice.title}`,
          message: notice.summary || notice.content.substring(0, 100) + '...',
          type: notice.priority.toLowerCase(),
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (isMongoConnected && notifsToInsert.length > 0) {
      await Notification.insertMany(notifsToInsert);
    } else {
      const data = dataInstance || initLocalStore();
      if (!data.notifications) data.notifications = [];
      data.notifications.push(...notifsToInsert);
      saveLocalStore(data);
    }
  },

  // --- QUERY LOGS (AI History) ---
  async logAiQuery(userId, queryText, responseText, sources) {
    if (isMongoConnected) {
      const log = await QueryLog.create({
        userId,
        queryText,
        responseText,
        sources
      });
      const obj = log.toObject();
      return { ...obj, id: obj._id.toString() };
    }
    const data = initLocalStore();
    const entry = {
      id: 'qry-' + Date.now(),
      userId,
      queryText,
      responseText,
      sources,
      createdAt: new Date().toISOString()
    };
    if (!data.queries) data.queries = [];
    data.queries.push(entry);
    saveLocalStore(data);
    return entry;
  },

  async getQueryLogs() {
    if (isMongoConnected) {
      const logs = await QueryLog.find({}).sort({ createdAt: -1 }).limit(20).lean();
      return logs.map(l => ({ ...l, id: l._id.toString() }));
    }
    const data = initLocalStore();
    return data.queries || [];
  },

  // --- ANALYTICS STATS ---
  async getStats() {
    const notices = await this.getNotices();
    const users = await this.getUsers();
    const queries = await this.getQueryLogs();

    const now = new Date();
    const activeNotices = notices.filter(n => !n.expiresAt || new Date(n.expiresAt) > now);

    const categoryBreakdown = {};
    const priorityBreakdown = { Urgent: 0, High: 0, Medium: 0, Low: 0 };

    notices.forEach(n => {
      categoryBreakdown[n.category] = (categoryBreakdown[n.category] || 0) + 1;
      if (priorityBreakdown[n.priority] !== undefined) {
        priorityBreakdown[n.priority]++;
      }
    });

    return {
      databaseType: isMongoConnected ? 'MongoDB (Original Production Database)' : 'Local Persistent Document Store (Zero-Config DB)',
      totalNotices: notices.length,
      activeNotices: activeNotices.length,
      totalUsers: users.length,
      totalStudents: users.filter(u => u.role === 'Student').length,
      totalFaculty: users.filter(u => u.role === 'Faculty').length,
      totalAiQueries: queries.length,
      categoryBreakdown,
      priorityBreakdown
    };
  }
};

module.exports = db;
