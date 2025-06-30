import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  number: Number,
  position: String,
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  goals: Number,
  assists: Number,
  matchesPlayed: Number,
});

const Player = mongoose.model('Player', PlayerSchema);

export default Player;