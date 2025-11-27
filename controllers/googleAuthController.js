// controllers/googleAuthController.js

exports.handleCallbackRedirect = function handleCallbackRedirect(req, res) {
  const role = (req.user && req.user.role) || 'student';
  if (['admin', 'moderator', 'super_admin'].includes(role)) {
    return res.redirect('/admin/dashboard.html');
  }
  return res.redirect('/student/dashboard.html');
};

exports.logout = function logout(req, res, next) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  const redirectOut = () => {
    try { res.clearCookie('token', cookieOptions); } catch (e) {}
    return res.redirect('/login.html');
  };

  if (typeof req.logout === 'function') {
    req.logout((err) => {
      if (err) return next(err);
      if (req.session) return req.session.destroy(redirectOut);
      return redirectOut();
    });
  } else {
    if (req.session) return req.session.destroy(redirectOut);
    return redirectOut();
  }
};
