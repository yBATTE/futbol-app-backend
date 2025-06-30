import mongoose from "mongoose"

const ScheduledMatchSchema = new mongoose.Schema({
  // Información básica del partido
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true, // "15:30", "20:00", etc.
  },

  // Equipos
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },

  // Torneo
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: true,
  },

  // Información del partido
  stadium: {
    type: String,
    default: "",
  },
  referee: {
    type: String,
    default: "",
  },

  // Estado del partido
  status: {
    type: String,
    enum: ["scheduled", "confirmed", "postponed", "cancelled"],
    default: "scheduled",
  },

  // Información adicional
  notes: {
    type: String,
    default: "",
  },

  // Jornada/Fecha del torneo
  matchday: {
    type: Number,
    default: 1,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Middleware para actualizar updatedAt
ScheduledMatchSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Índices para mejorar consultas
ScheduledMatchSchema.index({ date: 1 })
ScheduledMatchSchema.index({ tournament: 1 })
ScheduledMatchSchema.index({ status: 1 })

const ScheduledMatch = mongoose.model("ScheduledMatch", ScheduledMatchSchema)

export default ScheduledMatch
