import { Router } from "express";
import passport from "passport";
import { login, logout, oauthCallback, refresh, register } from "../controllers/auth.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { decodeOAuthState, encodeOAuthState, normalizeOAuthRole, safeRedirectUri } from "../utils/oauth.js";

const router = Router();

const ensureGoogleOAuthConfigured = (_req, res, next) => {
     if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
          return res.status(503).json({ message: "Google OAuth is not configured" });
     }
     return next();
};

router.get("/google", ensureGoogleOAuthConfigured, (req, res, next) => {
     const state = encodeOAuthState({
          portal: normalizeOAuthRole(req.query.portal),
          redirectUri: safeRedirectUri(req.query.redirect_uri),
     });
     return passport.authenticate("google", {
          scope: ["profile", "email"],
          session: false,
          state,
     })(req, res, next);
});

router.get(
     "/google/callback",
     ensureGoogleOAuthConfigured,
     (req, _res, next) => {
          const oauthState = decodeOAuthState(req.query.state);
          req.oauthState = oauthState;
          req.oauthRole = oauthState.portal;
          next();
     },
     passport.authenticate("google", {
          session: false,
          failureRedirect: `${process.env.CLIENT_ORIGIN || "http://localhost:3000"}/auth/callback?error=google_oauth_failed`,
     }),
     oauthCallback
);

router.post("/register",
     upload.fields([
             {
                 name : "photo",
                 maxCount : 1
             }
         ]), 
     register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
