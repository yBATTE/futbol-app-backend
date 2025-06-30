import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import connectDB from './config/db.js'
import matchesRoutes from './routes/matches.js'
import teamRoutes from './routes/team.js'
import goalRoutes from './routes/goal.js'
import playerRoutes from './routes/player.js'
import users from './routes/users.js'
import tournamentRoutes from './routes/tournament.js'
import teamTournamentStandingRoutes from './routes/teamTournametStanding.js'
import scheduledMatchesRoutes from './routes/scheduledMatches.js'

import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger.js'

dotenv.config()

const app = express()

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Conectar a MongoDB
connectDB()

app.use(cors())
app.use(express.json())

// Rutas
app.use('/api/matches', matchesRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/goal', goalRoutes)
app.use('/api/players', playerRoutes)
app.use('/api/users', users)
app.use('/api/tournaments', tournamentRoutes)
app.use('/api/team-tournament-standings', teamTournamentStandingRoutes)
app.use("/api/scheduled-matches", scheduledMatchesRoutes)

export default app
