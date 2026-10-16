/* ---------------- Grand Prix trophies (CrazyGames build) ---------------- */
// Grand Prix: a trophy for the final standing, with the unlocks it opens (daily.js)
const _showPodiumPanel = showPodiumPanel;
showPodiumPanel = function () {
  _showPodiumPanel();
  try {
    const gp = game.gp; if (!gp || gp.season || !game.podium) return;
    const rank = game.podium.standings.findIndex(k => k.isPlayer) + 1;
    if (rank > 0) RET.gpDone(rank);
  } catch (e) { }
};
