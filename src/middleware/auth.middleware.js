import User from "../models/user.model.js";
import { signAccessToken, verifyAccessToken, verifyRefreshToken } from "../utils/token.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";

const getAccessToken = (req) => {
  const header = req.headers.authorization;
  return req.cookies.accessToken || (header?.startsWith("Bearer ") ? header.split(" ")[1] : null);
};

const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return null;
  }

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded._id || decoded.id).select("+refreshToken");

  if (!user || user.refreshToken !== refreshToken) {
    return null;
  }

  const accessToken = signAccessToken(user);
  setAuthCookies(res, { accessToken });

  return user;
};

const protect = async (req, res, next) => {
  try {
    const token = getAccessToken(req);

    if (!token) {
      const refreshedUser = await refreshAccessToken(req, res);

      if (!refreshedUser) {
        return res.status(401).json({ message: "Authentication token is required" });
      }

      req.user = refreshedUser;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded._id || decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error.name !== "TokenExpiredError") {
        throw error;
      }

      const refreshedUser = await refreshAccessToken(req, res);

      if (!refreshedUser) {
        clearAuthCookies(res);
        return res.status(401).json({ message: "Session expired. Please log in again" });
      }

      req.user = refreshedUser;
      return next();
    }
  } catch (_error) {
    clearAuthCookies(res);
    res.status(401).json({ message: "Invalid or expired authentication token" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You are not allowed to perform this action" });
  }

  next();
};

export { protect, authorize };
