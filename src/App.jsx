import React, { useState, useEffect } from "react";
import AccountCommandCenter from "./AccountCommandCenter.jsx";

/* Single shared-password gate. Session is a server-set HttpOnly cookie. */
export default function App() {
  const [authed, setAuthed] = useState(null); // null = still checking
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authed))
      .catch(() => setAuthed(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) setAuthed(true);
      else setErr("Wrong password.");
    } catch {
      setErr("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (authed === null) {
    return (
      <div style={wrap}>
        <div style={{ color: "#9FB0C0", fontFamily: "Inter, sans-serif" }}>Loading…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={wrap}>
        <form onSubmit={submit} style={card}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 2, color: "#F4570F" }}>
            LANE ONE /// ENTERPRISE DESK
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 30, letterSpacing: 1, color: "#fff", textTransform: "uppercase", margin: "6px 0 16px" }}>
            Account Command Center
          </h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 8, border: "1px solid #2A3A4A", background: "#0F1A26", color: "#fff", fontSize: 14 }}
          />
          {err && <div style={{ color: "#FF8A6B", fontSize: 13, marginTop: 8 }}>{err}</div>}
          <button
            type="submit"
            disabled={busy || !pw}
            style={{ marginTop: 12, width: "100%", padding: "11px", borderRadius: 8, border: "none", background: "#F4570F", color: "#fff", fontWeight: 700, fontSize: 14, cursor: busy || !pw ? "default" : "pointer", opacity: busy || !pw ? 0.6 : 1 }}
          >
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return <AccountCommandCenter />;
}

const wrap = { minHeight: "100vh", background: "#15202D", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Inter, sans-serif" };
const card = { width: 320, maxWidth: "100%", background: "#1B2735", border: "1px solid #2A3A4A", borderRadius: 14, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" };
