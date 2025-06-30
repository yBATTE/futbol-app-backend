import Goal from './src/models/Goal.js';
import Match from './src/models/Match.js';

export const migrateGoalsToMatch = async (liveMatchId, matchId) => {
  const goals = await Goal.find({ liveMatch: liveMatchId });

  for (const goal of goals) {
    goal.match = matchId;
    goal.liveMatch = undefined;
    await goal.save();
  }

  const goalIds = goals.map(g => g._id);
  await Match.findByIdAndUpdate(matchId, { $set: { goals: goalIds } });

  return goals;
};
