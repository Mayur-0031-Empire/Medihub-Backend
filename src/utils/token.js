import jwt from "jsonwebtoken";

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from environment variables`);
  }

  return value;
};

const signAccessToken = (user) => {
  requireEnv("ACCESS_TOKEN_SECRET");

  if (typeof user.generateAccessToken === "function") {
    return user.generateAccessToken();
  }

  return jwt.sign(
    {
      _id: user._id.toString(),
      role: user.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
    }
  );
};

const signRefreshToken = (user) => {
  requireEnv("REFRESH_TOKEN_SECRET");

  if (typeof user.generateRefreshToken === "function") {
    return user.generateRefreshToken();
  }

  return jwt.sign(
    {
      _id: user._id.toString(),
      role: user.role
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"
    }
  );
};

const verifyAccessToken = (token) => jwt.verify(token, requireEnv("ACCESS_TOKEN_SECRET"));
const verifyRefreshToken = (token) => jwt.verify(token, requireEnv("REFRESH_TOKEN_SECRET"));

export { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
