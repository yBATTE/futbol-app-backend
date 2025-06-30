// models/TeamTournamentStanding.js
import mongoose from 'mongoose'

const TeamTournamentStandingSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  points: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  goalsFor: { type: Number, default: 0 },
  goalsAgainst: { type: Number, default: 0 },
  goalDifference: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 },
}, {
  timestamps: true
})

// Para evitar que un mismo equipo tenga dos registros en el mismo torneo
TeamTournamentStandingSchema.index({ team: 1, tournament: 1 }, { unique: true });

export default mongoose.model('TeamTournamentStanding', TeamTournamentStandingSchema)
