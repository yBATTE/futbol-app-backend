import mongoose from 'mongoose'
import TournamentEnum from '../Enums/TournamentRole.js'

const TournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
        type: String,
        enum: Object.values(TournamentEnum),
        required: true,
    },
    season: {
      type: String,
      required: false,
    },
teams: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Team',
}],
    description: {  
      type: String,
      required: false,
      trim: true,
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

const Tournament = mongoose.model('Tournament', TournamentSchema)
export default Tournament