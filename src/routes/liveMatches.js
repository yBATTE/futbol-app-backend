import express from "express"
import LiveMatch from "../models/LiveMatch.js"
import Goal from "../models/Goal.js"
import { createMatchByLiveMatch } from "./matches.js"
import { createQuickPlayer } from "./player.js"

// Exportar una función que recibe io y retorna el router
export default function createLiveMatchesRoutes(io) {
  const router = express.Router()

  // GET - Obtener todos los partidos en vivo con datos poblados
  router.get("/", async (req, res) => {
    try {
      const matches = await LiveMatch.find()
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")
        .populate({
          path: "goals",
          populate: [
            {
              path: "player",
              select: "firstName lastName number",
            },
            {
              path: "assist",
              select: "firstName lastName number",
            },
          ],
        })
        .sort({ createdAt: -1 })

      res.json(matches)
    } catch (error) {
      console.error("Error fetching live matches:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // GET - Obtener partido por ID con datos poblados
  router.get("/:id", async (req, res) => {
    try {
      const match = await LiveMatch.findById(req.params.id)
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")
        .populate({
          path: "goals",
          populate: [
            {
              path: "player",
              select: "firstName lastName number",
            },
            {
              path: "assist",
              select: "firstName lastName number",
            },
          ],
        })

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      res.json(match)
    } catch (error) {
      console.error("Error fetching match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Crear nuevo partido en vivo
  router.post("/", async (req, res) => {
    try {
      const { teamA, teamB, tournament, scoreA = 0, scoreB = 0, date } = req.body

      // Validaciones
      if (!teamA || !teamB || !tournament) {
        return res.status(400).json({
          message: "Equipos y torneo son obligatorios",
        })
      }

      if (teamA === teamB) {
        return res.status(400).json({
          message: "Los equipos no pueden ser iguales",
        })
      }

      const newMatch = new LiveMatch({
        teamA,
        teamB,
        tournament,
        scoreA,
        scoreB,
        date: date || new Date(),
        status: "not_started",
        goals: [],
      })

      const savedMatch = await newMatch.save()

      // Poblar los datos para la respuesta
      const populatedMatch = await LiveMatch.findById(savedMatch._id)
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")

      // Emitir evento WebSocket
      io.emit("matchCreated", populatedMatch)

      res.status(201).json(populatedMatch)
    } catch (error) {
      console.error("Error creating match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Iniciar partido
  router.post("/:id/start", async (req, res) => {
    try {
      const match = await LiveMatch.findByIdAndUpdate(
        req.params.id,
        {
          status: "live",
          startTime: new Date(),
          resumeOffset: 0,
        },
        { new: true },
      )
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Emitir evento WebSocket
      io.emit("matchStarted", match)

      res.json(match)
    } catch (error) {
      console.error("Error starting match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Pausar partido
  router.post("/:id/pause", async (req, res) => {
    try {
      const match = await LiveMatch.findByIdAndUpdate(
        req.params.id,
        {
          status: "paused",
          pausedTime: new Date(),
        },
        { new: true },
      )
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Emitir evento WebSocket
      io.emit("matchPaused", match)

      res.json(match)
    } catch (error) {
      console.error("Error pausing match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Reanudar partido
  router.post("/:id/resume", async (req, res) => {
    try {
      const match = await LiveMatch.findById(req.params.id)

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Calcular el tiempo pausado
      const pausedDuration = match.pausedTime ? Date.now() - new Date(match.pausedTime).getTime() : 0
      const newResumeOffset = (match.resumeOffset || 0) + pausedDuration

      const updatedMatch = await LiveMatch.findByIdAndUpdate(
        req.params.id,
        {
          status: "live",
          resumeOffset: newResumeOffset,
          pausedTime: null,
        },
        { new: true },
      )
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")

      // Emitir evento WebSocket
      io.emit("matchResumed", updatedMatch)

      res.json(updatedMatch)
    } catch (error) {
      console.error("Error resuming match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Suspender partido
  router.post("/:id/suspend", async (req, res) => {
    try {
      const match = await LiveMatch.findByIdAndUpdate(
        req.params.id,
        {
          status: "suspended",
          pausedTime: new Date(),
        },
        { new: true },
      )
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Emitir evento WebSocket
      io.emit("matchSuspended", match)

      res.json(match)
    } catch (error) {
      console.error("Error suspending match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Finalizar partido
  router.post("/:id/finish", async (req, res) => {
    try {
      // 1️⃣ Buscar el LiveMatch antes de eliminarlo
      const liveMatch = await LiveMatch.findById(req.params.id)
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")
        .populate("goals")

      if (!liveMatch) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // 2️⃣ Crear el Match con los datos del LiveMatch
      const createdMatch = await createMatchByLiveMatch(
        liveMatch.teamA,
        liveMatch.teamB,
        liveMatch.date || liveMatch.startTime,
        liveMatch.goals,
        liveMatch.scoreA,
        liveMatch.scoreB,
        liveMatch.tournament._id,
      )

      // 3️⃣ Eliminar el LiveMatch
      await LiveMatch.findByIdAndDelete(req.params.id)

      // 4️⃣ Emitir evento WebSocket del partido finalizado
      io.emit("matchFinished", createdMatch)

      // 5️⃣ Responder con el Match creado
      res.json(createdMatch)
    } catch (error) {
      console.error("Error finishing match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // POST - Cambiar etapa del partido
  router.post("/:id/stage", async (req, res) => {
    try {
      const { stage } = req.body

      if (!["regular", "extra_time", "penalties"].includes(stage)) {
        return res.status(400).json({ message: "Etapa inválida" })
      }

      const match = await LiveMatch.findByIdAndUpdate(req.params.id, { currentStage: stage }, { new: true })
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Emitir evento WebSocket
      io.emit("matchStageChanged", match)

      res.json(match)
    } catch (error) {
      console.error("Error changing match stage:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // ✅ PUT - ENDPOINT CORREGIDO PARA ACTUALIZAR SCORE
  router.put("/:id/score", async (req, res) => {
    try {

      const { team, delta, scorerId, assistId, scorerCustom, assistCustom } = req.body

      // Validaciones básicas
      if (!team || delta === undefined) {
        return res.status(400).json({ message: "Faltan datos requeridos (team, delta)" })
      }

      if (!["A", "B"].includes(team)) {
        return res.status(400).json({ message: "Team debe ser 'A' o 'B'" })
      }

      // Buscar el partido
      const match = await LiveMatch.findById(req.params.id)
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name")

      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }


      // Actualizar marcador
      if (team === "A") {
        match.scoreA += delta
      } else {
        match.scoreB += delta
      }


      // Si es un gol (delta positivo), registrar el gol
      if (delta > 0) {

        // Calcular minuto actual del partido
        let currentMinute = 0
        if (match.startTime) {
          const elapsedTime = Date.now() - new Date(match.startTime).getTime()
          const resumeOffset = match.resumeOffset || 0
          currentMinute = Math.floor((elapsedTime - resumeOffset) / 60000)
        }

        let goalPlayerId = null
        let assistPlayerId = null
        const playerName = ""
        const playerNumber = 0

        // ✅ MANEJAR GOLEADOR - VERSIÓN CORREGIDA
        if (scorerId && scorerId !== "custom") {
          goalPlayerId = scorerId
        } else if (scorerCustom && scorerCustom.firstName && scorerCustom.lastName) {
          try {
            const newPlayer = await createQuickPlayer({
              firstName: scorerCustom.firstName.trim(),
              lastName: scorerCustom.lastName.trim(),
              club: scorerCustom.team,
              number: scorerCustom.number || Math.floor(Math.random() * 900) + 100,
              position: scorerCustom.position || "Delantero",
            })
            goalPlayerId = newPlayer._id
          } catch (error) {
            console.error("❌ Error creando goleador custom:", error)
            // ❌ NO CONTINUAR SI NO SE PUEDE CREAR EL JUGADOR
            return res.status(500).json({
              message: `Error creando jugador custom: ${error.message}`,
              details: "No se puede registrar el gol sin crear el jugador primero",
            })
          }
        } else {
          return res.status(400).json({ message: "Debe proporcionar un goleador válido" })
        }

        // ✅ MANEJAR ASISTENTE (OPCIONAL)
        if (assistId && assistId !== "custom") {
          assistPlayerId = assistId
        } else if (assistCustom && assistCustom.firstName && assistCustom.lastName) {
          try {
            const newAssist = await createQuickPlayer({
              firstName: assistCustom.firstName.trim(),
              lastName: assistCustom.lastName.trim(),
              club: assistCustom.team,
              number: assistCustom.number || Math.floor(Math.random() * 900) + 100,
              position: assistCustom.position || "Mediocampista",
            })
            assistPlayerId = newAssist._id
          } catch (error) {
            console.error("❌ Error creando asistente custom:", error)
            // Continuar sin asistente si hay error
          }
        }

        // ✅ CREAR EL GOL CON TU MODELO EXACTO - CORREGIDO
        const goalData = {
          liveMatch: match._id,
          team: team === "A" ? match.teamA._id : match.teamB._id,
          tournament: match.tournament._id,
          player: goalPlayerId, // DEBE tener un ID válido
          minute: currentMinute,
          assist: assistPlayerId, // Puede ser null
        }

        // Solo agregar name y number si NO hay player ID (caso excepcional)
        if (!goalPlayerId && playerName) {
          goalData.name = playerName
          goalData.number = playerNumber
        }


        try {
          const goal = new Goal(goalData)
          const savedGoal = await goal.save()

          // Agregar el ID del gol al LiveMatch
          if (!match.goals) {
            match.goals = []
          }
          match.goals.push(savedGoal._id)
        } catch (error) {
          console.error("❌ Error guardando gol:", error)
          console.error("❌ Stack completo:", error.stack)
          return res.status(500).json({
            message: `Error guardando gol: ${error.message}`,
            details: error.stack,
          })
        }
      }

      // Guardar el partido actualizado
      try {
        await match.save()
      } catch (error) {
        console.error("❌ Error guardando partido:", error)
        return res.status(500).json({ message: `Error guardando partido: ${error.message}` })
      }

      // Retornar el partido actualizado con datos poblados
      const updatedMatch = await LiveMatch.findById(match._id)
        .populate("teamA", "name abreviation")
        .populate("teamB", "name abreviation")
        .populate("tournament", "name type season")
        .populate({
          path: "goals",
          populate: [
            {
              path: "player",
              select: "firstName lastName number",
            },
            {
              path: "assist",
              select: "firstName lastName number",
            },
          ],
        })

      // Emitir evento WebSocket
      io.emit("scoreUpdated", updatedMatch)

      res.json(updatedMatch)
    } catch (error) {
      console.error("❌ Error completo en PUT /score:", error)
      console.error("❌ Stack completo:", error.stack)
      res.status(500).json({
        message: "Error interno del servidor",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
    }
  })

  return router
}
