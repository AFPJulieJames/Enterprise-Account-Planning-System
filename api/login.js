import { authCookie } from "./_lib.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (!process.env.APP_PASSWORD) return res.status(500).json({ error: "APP_PASSWORD not configured" });
  const { password } = req.body || {};
  if (typeof password === "string" && password === process.env.APP_PASSWORD) {
    res.setHeader("Set-Cookie", authCookie());
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false });
}
