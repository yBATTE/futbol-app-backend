import express from "express"
import LiveMatch from "../models/LiveMatch.js"

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
      const match = await LiveMatch.findByIdAndUpdate(
        req.params.id,
        {
          status: "finished",
          endTime: new Date(),
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
      io.emit("matchFinished", match)

      res.json(match)
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

  // PUT - Actualizar marcador
  router.put("/:id/score", async (req, res) => {
    try {
      const { team, delta, scorerId, assistId, scorerCustom, assistCustom } = req.body

      const match = await LiveMatch.findById(req.params.id)
      if (!match) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Actualizar marcador
      if (team === "A") {
        match.scoreA += delta
      } else if (team === "B") {
        match.scoreB += delta
      }

      // Si es un gol (delta positivo), registrar el gol
      if (delta > 0) {
        const Goal = (await import("../models/Goal.js")).default

        const goalData = {
          match: match._id,
          team: team === "A" ? match.teamA : match.teamB,
          minute: Math.floor((Date.now() - new Date(match.startTime).getTime()) / 60000),
        }

        if (scorerId) {
          goalData.player = scorerId
        } else if (scorerCustom) {
          goalData.playerCustom = scorerCustom
        }

        if (assistId) {
          goalData.assist = assistId
        } else if (assistCustom) {
          goalData.assistCustom = assistCustom
        }

        const goal = new Goal(goalData)
        await goal.save()

        // Agregar el gol al array de goles del partido
        match.goals.push(goal._id)
      }

      await match.save()

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
      console.error("Error updating score:", error)
      res.status(500).json({ message: error.message })
    }
  })

  // DELETE - Eliminar partido
  router.delete("/:id", async (req, res) => {
    try {
      const deletedMatch = await LiveMatch.findByIdAndDelete(req.params.id)

      if (!deletedMatch) {
        return res.status(404).json({ message: "Partido no encontrado" })
      }

      // Emitir evento WebSocket
      io.emit("matchDeleted", { matchId: req.params.id })

      res.json({ message: "Partido eliminado correctamente" })
    } catch (error) {
      console.error("Error deleting match:", error)
      res.status(500).json({ message: error.message })
    }
  })

  return router
}
