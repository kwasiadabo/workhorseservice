const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie } = require('../utils/cookies');

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

const registerTenant = asyncHandler(async (req, res) => {
  const { tenant, user, accessToken, refreshToken } = await authService.registerTenant(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ success: true, data: { tenant, user, accessToken } });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.refresh(
    req.cookies?.[REFRESH_COOKIE_NAME],
    requestMeta(req)
  );
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  res.json({ success: true });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, data: { user } });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json({
    success: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.json({ success: true, message: 'Your password has been reset. You can now log in.' });
});

const changePassword = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.changePassword(
    req.user.id,
    req.body,
    requestMeta(req)
  );
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
});

module.exports = {
  registerTenant,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
};
