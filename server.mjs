// server.mjs
import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

import app from './src/app.mjs'
import liveMatchesRoutes from './src/routes/liveMatches.js'
import users from './src/routes/users.js'
import { checkJwt } from './src/middleware/auth.js'

dotenv.config()

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// WebSocket events
io.on('connection', socket => {
  console.log('🟢 Cliente conectado vía WebSocket')

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado')
  })
})

// Routes
app.use('/api/live-matches', liveMatchesRoutes(io))

// Use the imported checkJwt here
app.use('/api/users', checkJwt, users)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})
