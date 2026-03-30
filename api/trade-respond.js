const {
  USERS,
  verifyPin,
  getTeams,
  setTeams,
  getPointAdjustments,
  setPointAdjustments,
  getTrades,
  setTrades,
} = require("./_helpers");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tradeId, user, pin, action } = req.body;

  if (!["accept", "reject", "cancel"].includes(action)) {
    return res.status(400).json({ error: "Action must be accept, reject, or cancel" });
  }

  const normalizedUser = USERS.find((u) => u.toLowerCase() === user?.toLowerCase());
  if (!normalizedUser) return res.status(400).json({ error: "Unknown user" });
  if (!verifyPin(normalizedUser, pin)) return res.status(401).json({ error: "Incorrect PIN" });

  const trades = await getTrades();
  const trade = trades.find((t) => t.id === tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found" });
  if (trade.status !== "pending") return res.status(400).json({ error: "Trade is no longer pending" });

  // Cancel: only proposer can cancel
  if (action === "cancel") {
    if (normalizedUser !== trade.proposer) {
      return res.status(403).json({ error: "Only the proposer can cancel" });
    }
    trade.status = "cancelled";
    trade.resolvedAt = new Date().toISOString();
    await setTrades(trades);
    return res.json({ ok: true, trade });
  }

  // Accept/Reject: only recipient can do this
  if (normalizedUser !== trade.recipient) {
    return res.status(403).json({ error: "Only the recipient can accept or reject" });
  }

  if (action === "reject") {
    trade.status = "rejected";
    trade.resolvedAt = new Date().toISOString();
    await setTrades(trades);
    return res.json({ ok: true, trade });
  }

  // Accept: execute the trade
  const teams = await getTeams();
  const adj = await getPointAdjustments();

  // Verify drivers still belong to correct owners
  for (const d of trade.proposerGives.drivers) {
    if (!teams[trade.proposer].includes(d)) {
      return res.status(400).json({ error: `${trade.proposer} no longer owns ${d}` });
    }
  }
  for (const d of trade.recipientGives.drivers) {
    if (!teams[trade.recipient].includes(d)) {
      return res.status(400).json({ error: `${trade.recipient} no longer owns ${d}` });
    }
  }

  // Swap drivers
  for (const d of trade.proposerGives.drivers) {
    teams[trade.proposer] = teams[trade.proposer].filter((x) => x !== d);
    teams[trade.recipient].push(d);
  }
  for (const d of trade.recipientGives.drivers) {
    teams[trade.recipient] = teams[trade.recipient].filter((x) => x !== d);
    teams[trade.proposer].push(d);
  }

  // Adjust points
  adj[trade.proposer] = (adj[trade.proposer] || 0) - (trade.proposerGives.points || 0) + (trade.recipientGives.points || 0);
  adj[trade.recipient] = (adj[trade.recipient] || 0) - (trade.recipientGives.points || 0) + (trade.proposerGives.points || 0);

  trade.status = "accepted";
  trade.resolvedAt = new Date().toISOString();

  await setTeams(teams);
  await setPointAdjustments(adj);
  await setTrades(trades);

  return res.json({ ok: true, trade, teams, pointAdjustments: adj });
};
