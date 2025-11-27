// services/dashboardService.js
// Aggregations and KPIs for admin dashboard

const User = require('../models/User');
const Note = require('../models/Notes');
const Report = require('../models/Report');

function buildGrowthPipeline(dateField, startDate, endDate, format) {
  return [
    { $match: { [dateField]: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: { $dateToString: { format, date: `$${dateField}` } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
}

async function getStats() {
  const totalUsers = await User.countDocuments({ role: 'student' });
  const totalNotes = await Note.countDocuments();
  const totalReports = await Report.countDocuments();
  return { totalUsers, totalNotes, totalReports };
}

async function getReportSummary() {
  const pending = await Report.countDocuments({ status: 'pending' });
  const resolved = await Report.countDocuments({ status: 'resolved' });
  return { pending, resolved };
}

async function getTopUploaders(date) {
  const filter = {};
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.uploadDate = { $gte: start, $lte: end };
  }

  const uploaders = await Note.aggregate([
    { $match: filter },
    { $group: { _id: '$uploaderName', uploadCount: { $sum: 1 } } },
    { $sort: { uploadCount: -1 } },
    { $limit: 5 },
  ]);

  return uploaders.map((u) => ({ name: u._id || 'Unknown', uploadCount: u.uploadCount }));
}

async function getTopNotes(date) {
  const filter = {};
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.uploadDate = { $gte: start, $lte: end };
  }

  return await Note.aggregate([
    { $match: filter },
    { $project: { title: 1, likeCount: { $size: { $ifNull: ['$likes', []] } } } },
    { $sort: { likeCount: -1 } },
    { $limit: 5 },
  ]);
}

async function getRecentActivity() {
  const notes = await Note.find().sort({ uploadDate: -1 }).limit(5).select('title uploadDate');
  const users = await User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5).select('name createdAt');
  const reports = await Report.find().sort({ createdAt: -1 }).limit(5).select('reason createdAt');

  const activities = [
    ...notes.map((n) => ({ message: `New note uploaded: ${n.title}`, date: n.uploadDate })),
    ...users.map((u) => ({ message: `New student registered: ${u.name}`, date: u.createdAt })),
    ...reports.map((r) => ({ message: `Report submitted: ${r.reason}`, date: r.createdAt })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return activities.slice(0, 10);
}

async function getGrowth({ model, dateField, range = '6m', mode = 'monthly', start, end }) {
  let startDate;
  let endDate = new Date();
  if (start && end) {
    startDate = new Date(start);
    endDate = new Date(end);
  } else if (range === '6m') {
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
  } else if (range === '12m') {
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
  } else {
    startDate = new Date('2000-01-01');
  }

  const dateFormat = start && end ? '%Y-%m-%d' : mode === 'weekly' ? '%Y-%U' : '%Y-%m';
  const growth = await model.aggregate(buildGrowthPipeline(dateField, startDate, endDate, dateFormat));

  const labels = [];
  const values = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    let label;
    if (start && end) {
      label = cursor.toISOString().slice(0, 10);
      cursor.setDate(cursor.getDate() + 1);
    } else if (mode === 'weekly') {
      const year = cursor.getFullYear();
      const week = Math.floor((cursor.getDate() - 1) / 7);
      label = `${year}-${String(week).padStart(2, '0')}`;
      cursor.setDate(cursor.getDate() + 7);
    } else {
      label = cursor.toISOString().slice(0, 7);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const found = growth.find((g) => g._id === label);
    labels.push(label);
    values.push(found ? found.count : 0);
  }

  return { labels, values };
}

async function getUserGrowth(params) {
  return await getGrowth({ ...params, model: User, dateField: 'createdAt' });
}

async function getNotesGrowth(params) {
  return await getGrowth({ ...params, model: Note, dateField: 'uploadDate' });
}

module.exports = {
  getStats,
  getReportSummary,
  getTopUploaders,
  getTopNotes,
  getRecentActivity,
  getUserGrowth,
  getNotesGrowth,
};
