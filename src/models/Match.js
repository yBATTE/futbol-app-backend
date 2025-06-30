import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  date: Date,
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  scoreA: Number,
  scoreB: Number,
  goals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' } // ✅ Nuevo
})


const Match = mongoose.model('Match', MatchSchema);

export default Match;
