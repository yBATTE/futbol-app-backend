import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  minute: {
    type: Number,
    required: false
  },
  assist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false
  },
  time: {
    type: String,
    default: () => {
      const now = new Date();
      return now.toTimeString().slice(0, 5); // "HH:MM"
    }
  },
  liveMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveMatch',
    required: false
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: false
  },
  name: {
    type: String,
    required: false
  },
  number: {
    type: Number,
    required: false
  },
  tournament: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Tournament',
  required: false
}

}, {
  timestamps: true
});

const Goal = mongoose.model('Goal', GoalSchema);
export default Goal;
