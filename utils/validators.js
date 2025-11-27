// utils/validators.js
// Small validation helpers

exports.isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

exports.isObjectIdLike = (v) => typeof v === 'string' && v.match(/^[0-9a-fA-F]{24}$/);

// Returns an array of unmet password requirements; empty array means OK
exports.passwordStrengthIssues = (p) => {
	const issues = [];
	const s = String(p || '');
	if (s.length < 6) issues.push('At least 6 characters');
	if (!/[A-Z]/.test(s)) issues.push('Include an uppercase letter');
	if (!/[a-z]/.test(s)) issues.push('Include a lowercase letter');
	if (!/[0-9]/.test(s)) issues.push('Include a number');
	if (!/[^A-Za-z0-9]/.test(s)) issues.push('Include a special character');
	return issues;
};

