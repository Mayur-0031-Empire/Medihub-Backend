import crypto from "node:crypto";

import { allowedRoles } from "../models/user.model.js";

const DEFAULT_FRONTEND_CALLBACK = "/auth/callback";

export function getOAuthCallbackUrl(provider) {
  const key = `${provider.toUpperCase()}_OAUTH_CALLBACK_URL`;
  const configured = process.env[key] || process.env.OAUTH_CALLBACK_URL;
  if (configured) return configured;
  const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${base.replace(/\/+$/, "")}/api/auth/${provider}/callback`;
}

export function normalizeOAuthRole(role) {
  return allowedRoles.includes(role) ? role : "patient";
}

export function encodeOAuthState({ portal, redirectUri }) {
  return Buffer.from(
    JSON.stringify({
      portal: normalizeOAuthRole(portal),
      redirectUri: safeRedirectUri(redirectUri),
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeOAuthState(state) {
  if (!state) return { portal: "patient", redirectUri: defaultFrontendCallback() };
  try {
    const parsed = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"));
    return {
      portal: normalizeOAuthRole(parsed.portal),
      redirectUri: safeRedirectUri(parsed.redirectUri),
    };
  } catch {
    return { portal: "patient", redirectUri: defaultFrontendCallback() };
  }
}

export function defaultFrontendCallback() {
  const explicit = process.env.OAUTH_FRONTEND_CALLBACK_URL;
  if (explicit) return explicit;
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return `${origin.replace(/\/+$/, "")}${DEFAULT_FRONTEND_CALLBACK}`;
}

export function safeRedirectUri(value) {
  const fallback = defaultFrontendCallback();
  if (!value) return fallback;

  try {
    const url = new URL(String(value));
    const allowed = [
      process.env.CLIENT_ORIGIN,
      process.env.OAUTH_FRONTEND_ORIGIN,
      process.env.OAUTH_FRONTEND_CALLBACK_URL,
    ].filter(Boolean);

    if (allowed.length === 0) return fallback;
    const ok = allowed.some((candidate) => {
      const allowedUrl = new URL(candidate);
      return allowedUrl.origin === url.origin;
    });
    return ok ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function appendOAuthResult(redirectUri, params) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function randomOAuthPassword() {
  return crypto.randomBytes(24).toString("base64url");
}
