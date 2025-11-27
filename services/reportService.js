const Report = require('../models/Report');
const Note = require('../models/Notes');

// Notification model is required lazily because some environments may not have it
function getNotificationModel() {
  try {
    return require('../models/Notification');
  } catch (e) {
    return null;
  }
}

exports.getAllReports = async () => {
  return await Report.find()
    .populate('noteId', 'title uploaderName uploader filePath')
    .populate('reportedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
};

exports.getReportById = async (id) => {
  return await Report.findById(id)
    .populate('noteId', 'title uploader uploaderName filePath')
    .populate('reportedBy', 'name email')
    .lean();
};

exports.changeStatus = async (reportId, status, actorId, opts = {}) => {
  const validStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];
  if (!validStatuses.includes(status)) throw { status: 400, message: 'Invalid status' };

  const report = await Report.findById(reportId).populate('noteId');
  if (!report) throw { status: 404, message: 'Report not found' };

  if (status === 'reviewed') {
    if (report.status !== 'pending') throw { status: 400, message: 'Report can only be marked reviewed from pending state' };
    report.status = 'reviewed';
    report.reviewedBy = actorId;
    report.reviewedAt = new Date();

  } else if (status === 'resolved') {
    if (report.status !== 'reviewed') throw { status: 400, message: 'Report must be reviewed before it can be resolved' };
    report.status = 'resolved';
    report.resolvedBy = actorId;
    report.resolvedAt = new Date();

    // Optional note actions: delete note etc. Caller may pass opts.action
    if (opts.action === 'delete_note' && report.noteId) {
      await Note.deleteOne({ _id: report.noteId._id });
    }

  } else if (status === 'rejected') {
    if (report.status !== 'reviewed') throw { status: 400, message: 'Report must be reviewed before it can be rejected' };
    report.status = 'rejected';
    report.rejectedBy = actorId;
    report.rejectedAt = new Date();

  } else if (status === 'pending') {
    report.status = 'pending';
  }

  await report.save();

  // Recalculate reportsCount on related note
  if (report.noteId) {
    const note = await Note.findById(report.noteId._id || report.noteId);
    if (note) {
      note.reportsCount = await Report.countDocuments({ noteId: note._id });
      await note.save();
    }
  }

  // Notify reporter
  const Notification = getNotificationModel();
  if (Notification) {
    try {
      await Notification.create({
        recipients: [report.reportedBy],
        type: 'report-status',
        message: `Your report on '${report.noteId?.title || 'the note'}' status: ${report.status}`,
        noteId: report.noteId?._id || report.noteId
      });
    } catch (e) {
      console.error('Failed to create report-status notification:', e);
    }
  }

  return report;
};

exports.deleteReport = async (reportId) => {
  const report = await Report.findById(reportId);
  if (!report) throw { status: 404, message: 'Report not found' };
  // Allow deletion for any non-pending status (reviewed, resolved, rejected)
  if (report.status === 'pending') {
    throw { status: 400, message: 'Cannot delete a pending report. Review it first.' };
  }
  await Report.deleteOne({ _id: report._id });
};
