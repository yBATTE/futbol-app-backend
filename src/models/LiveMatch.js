import mongoose from 'mongoose'

const liveMatchSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: false
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  scoreA: {
    type: Number,
    default: 0
  },
  scoreB: {
    type: Number,
    default: 0
  },
  goals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],
  status: {
    type: String,
    enum: ['not_started', 'live', 'paused', 'suspended', 'finished'],
    default: 'not_started'
  },
  startTime: {
    type: Date
  },
  pausedTime: {
    type: Date
  },
  resumeOffset: {
    type: Number,
    default: 0
  },
  currentStage: {
    type: String,
    enum: ['regular', 'extra_time', 'penalties'],
    default: 'regular'
  },
    tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: false, // ⬅️ recomendable hacerlo opcional por si estás en testing
  }
}, {
  timestamps: true
})

const LiveMatch = mongoose.model('LiveMatch', liveMatchSchema)

export default LiveMatch
