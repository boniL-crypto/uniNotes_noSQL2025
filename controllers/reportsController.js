// controllers/reportsController.js
// Unified reports controller (admin-only at present)

const reportService = require('../services/reportService');

exports.list = async (req, res) => {
  try {
    const reports = await reportService.getAllReports();
    res.json({ reports });
  } catch (err) {
    console.error('Admin reports fetch error:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
};

exports.get = async (req, res) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.noteUploaderId = report.noteId?.uploader || null;
    report.reporterId = report.reportedBy?._id || null;
    res.json(report);
  } catch (err) {
    console.error('Admin single report fetch error:', err);
    res.status(500).json({ message: 'Failed to load report details' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const actorId = req.user && (req.user.id || req.user._id);
    await reportService.changeStatus(req.params.id, req.body.status, actorId, req.body);
    res.json({ message: 'Report status updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to update status' });
  }
};

exports.remove = async (req, res) => {
  try {
    await reportService.deleteReport(req.params.id);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Admin report delete error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to delete report' });
  }
};
