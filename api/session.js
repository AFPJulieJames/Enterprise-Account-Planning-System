import { isAuthed } from "./_lib.js";

export default function handler(req, res) {
  return res.status(200).json({ authed: isAuthed(req) });
}
