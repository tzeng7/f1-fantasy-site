const {
  USERS,
  verifyPin,
  getTeams,
  getTrades,
  setTrades,
  nextTradeId,
} = require("./_helpers");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const trades = await getTrades();
    return res.json({ trades });
  }

  if (req.method === "POST") {
    const { proposer, pin, recipient, proposerGivesDrivers, proposerGivesPoints, recipientGivesDrivers, recipientGivesPoints } = req.body;

    // Auth
    const normalizedProposer = USERS.find((u) => u.toLowerCase() === proposer?.toLowerCase());
    if (!normalizedProposer) return res.status(400).json({ error: "Unknown proposer" });
    if (!verifyPin(normalizedProposer, pin)) return res.status(401).json({ error: "Incorrect PIN" });

    const normalizedRecipient = USERS.find((u) => u.toLowerCase() === recipient?.toLowerCase());
    if (!normalizedRecipient) return res.status(400).json({ error: "Unknown recipient" });
    if (normalizedProposer === normalizedRecipient) return res.status(400).json({ error: "Cannot trade with yourself" });

    const givesDrivers = proposerGivesDrivers || [];
    const getsDrivers = recipientGivesDrivers || [];

    // Guardrail: equal number of drivers exchanged
    if (givesDrivers.length !== getsDrivers.length) {
      return res.status(400).json({ error: "Must trade equal number of drivers" });
    }

    // Validate drivers belong to the correct owners
    const teams = await getTeams();
    for (const d of givesDrivers) {
      if (!teams[normalizedProposer].includes(d.toLowerCase())) {
        return res.status(400).json({ error: `${normalizedProposer} does not own ${d}` });
      }
    }
    for (const d of getsDrivers) {
      if (!teams[normalizedRecipient].includes(d.toLowerCase())) {
        return res.status(400).json({ error: `${normalizedRecipient} does not own ${d}` });
      }
    }

    // Must trade at least one driver (pure point trades don't make sense without driver swap)
    // Actually the user said trades can be "points and driver for driver", so allow points-only addon
    // but at minimum something must be exchanged
    const givesPoints = parseInt(proposerGivesPoints) || 0;
    const getsPoints = parseInt(recipientGivesPoints) || 0;
    if (givesDrivers.length === 0 && getsDrivers.length === 0 && givesPoints === 0 && getsPoints === 0) {
      return res.status(400).json({ error: "Trade must include at least something" });
    }

    const tradeId = await nextTradeId();
    const trade = {
      id: tradeId,
      proposer: normalizedProposer,
      recipient: normalizedRecipient,
      proposerGives: { drivers: givesDrivers.map((d) => d.toLowerCase()), points: givesPoints },
      recipientGives: { drivers: getsDrivers.map((d) => d.toLowerCase()), points: getsPoints },
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const trades = await getTrades();
    trades.push(trade);
    await setTrades(trades);

    return res.json({ ok: true, trade });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
