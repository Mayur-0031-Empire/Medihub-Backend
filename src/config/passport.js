import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import User from "../models/user.model.js";
import { getOAuthCallbackUrl, randomOAuthPassword } from "../utils/oauth.js";

function buildName(profile) {
  const firstName =
    profile.name?.givenName ||
    profile.displayName?.split(/\s+/)[0] ||
    "Google";
  const lastName =
    profile.name?.familyName ||
    profile.displayName?.split(/\s+/).slice(1).join(" ") ||
    "User";
  return { firstName, lastName };
}

async function uniqueUsername(email, providerId) {
  const local = email?.split("@")[0] || `google_${providerId}`;
  const base = local.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 24) || "google_user";
  let username = base.length >= 3 ? base : `${base}_user`;
  let suffix = 0;

  while (await User.exists({ username })) {
    suffix += 1;
    username = `${base.slice(0, 24)}_${suffix}`;
  }

  return username;
}

async function uniqueOAuthPhone() {
  for (let i = 0; i < 5; i += 1) {
    const phone = `+1${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
    // eslint-disable-next-line no-await-in-loop
    if (!(await User.exists({ phone }))) return phone;
  }
  return `+1${Date.now()}`.slice(0, 20);
}

export function configurePassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getOAuthCallbackUrl("google"),
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google account did not provide an email address"));
          }

          const role = req.oauthRole || "patient";
          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
          }).select("+refreshToken");

          if (!user) {
            const { firstName, lastName } = buildName(profile);
            user = await User.create({
              firstName,
              lastName,
              username: await uniqueUsername(email, profile.id),
              email,
              phone: await uniqueOAuthPhone(),
              password: randomOAuthPassword(),
              role,
              photo: profile.photos?.[0]?.value,
              authProvider: "google",
              googleId: profile.id,
            });
          } else {
            user.googleId = user.googleId || profile.id;
            user.authProvider = "google";
            if (!user.photo && profile.photos?.[0]?.value) {
              user.photo = profile.photos[0].value;
            }
            await user.save({ validateBeforeSave: false });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}
