import crypto from "crypto";

/* Derive a stable session token from the shared password. */
export function expectedToken() {
  const pw = process.env.APP_PASSWORD || "";
  return crypto.createHash("sha256").update("acc::" + pw).digest("hex");
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isAuthed(req) {
  if (!process.env.APP_PASSWORD) return false;
  const c = parseCookies(req);
  return Boolean(c.acc_auth) && c.acc_auth === expectedToken();
}

export function authCookie() {
  // 30-day session, HttpOnly so JS can't read it, Secure for HTTPS.
  return `acc_auth=${expectedToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}
