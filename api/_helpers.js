const { kv } = require("@vercel/kv");

const USERS = ["Andrew", "MK", "Tzeng", "Neil"];

const DEFAULT_TEAMS = {
  Andrew: ["george russell", "pierre gasly", "arvid lindblad"],
  MK: ["kimi antonelli", "nico hulkenberg", "liam lawson"],
  Tzeng: ["charles leclerc", "ollie bearman", "alex albon"],
  Neil: ["max verstappen", "franco colapinto", "carlos sainz"],
};

function verifyPin(user, pin) {
  const envKey = `PIN_${user.toUpperCase()}`;
  const expected = process.env[envKey];
  if (!expected) return false;
  return String(pin) === String(expected);
}

async function getTeams() {
  const teams = await kv.get("fantasy:teams");
  return teams || { ...DEFAULT_TEAMS };
}

async function setTeams(teams) {
  await kv.set("fantasy:teams", teams);
}

async function getPointAdjustments() {
  const adj = await kv.get("fantasy:point_adjustments");
  return adj || { Andrew: 0, MK: 0, Tzeng: 0, Neil: 0 };
}

async function setPointAdjustments(adj) {
  await kv.set("fantasy:point_adjustments", adj);
}

async function getTrades() {
  const trades = await kv.get("fantasy:trades");
  return trades || [];
}

async function setTrades(trades) {
  await kv.set("fantasy:trades", trades);
}

async function nextTradeId() {
  const id = await kv.incr("fantasy:trade_counter");
  return id;
}

module.exports = {
  USERS,
  DEFAULT_TEAMS,
  verifyPin,
  getTeams,
  setTeams,
  getPointAdjustments,
  setPointAdjustments,
  getTrades,
  setTrades,
  nextTradeId,
};
