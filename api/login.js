const { USERS, verifyPin } = require("./_helpers");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { user, pin } = req.body;
  if (!user || !pin) return res.status(400).json({ error: "Missing user or pin" });

  const normalized = USERS.find((u) => u.toLowerCase() === user.toLowerCase());
  if (!normalized) return res.status(400).json({ error: "Unknown user" });

  if (!verifyPin(normalized, pin)) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  return res.json({ ok: true, user: normalized });
};
