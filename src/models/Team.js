import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  abreviation: { type: String, required: true },
  location: { type: String },
  division: { type: String },
  tournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }],
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: false }],
  coach: { type: String, required: true },
  stadium: { type: String, required: true },
});


const Team = mongoose.model('Team', TeamSchema);

export default Team;