const { getTeams, getPointAdjustments } = require("./_helpers");

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const teams = await getTeams();
  const pointAdjustments = await getPointAdjustments();

  return res.json({ teams, pointAdjustments });
};
