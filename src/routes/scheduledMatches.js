import express from "express"
import ScheduledMatch from "../models/ScheduledMatch.js"

const router = express.Router()

// GET - Obtener todos los partidos programados
router.get("/", async (req, res) => {
  try {
    const { tournament, status, date } = req.query
    const filter = {}

    if (tournament) filter.tournament = tournament
    if (status) filter.status = status
    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      filter.date = { $gte: startDate, $lt: endDate }
    }

    const matches = await ScheduledMatch.find(filter)
      .populate("teamA", "name abreviation")
      .populate("teamB", "name abreviation")
      .populate("tournament", "name type")
      .sort({ date: 1, time: 1 })

    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET - Obtener todos los próximos partidos (desde hoy en adelante)
router.get("/upcoming", async (req, res) => {
  try {
    const { tournament, status, limit = 10 } = req.query

    // Filtro base: partidos desde hoy en adelante
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Inicio del día actual

    const filter = {
      date: { $gte: today },
      status: { $ne: "cancelled" }, // Excluir partidos cancelados
    }

    // Filtros opcionales
    if (tournament) filter.tournament = tournament
    if (status) filter.status = status

    const matches = await ScheduledMatch.find(filter)
      .populate("teamA", "name abreviation")
      .populate("teamB", "name abreviation")
      .populate("tournament", "name type")
      .sort({ date: 1, time: 1 })
      .limit(Number.parseInt(limit))

    res.json(matches)
  } catch (error) {
    console.error("Error fetching upcoming matches:", error)
    res.status(500).json({ message: error.message })
  }
})

// GET - Obtener equipos que participan en un torneo específico
router.get("/tournament/:tournamentId/teams", async (req, res) => {
  try {
    const { tournamentId } = req.params

    // Buscar todos los partidos del torneo y extraer los equipos únicos
    const matches = await ScheduledMatch.find({ tournament: tournamentId })
      .populate("teamA", "name abreviation")
      .populate("teamB", "name abreviation")

    // Extraer equipos únicos
    const teamsSet = new Set()
    const teamsArray = []

    matches.forEach((match) => {
      // Agregar teamA si no existe
      const teamAKey = match.teamA._id.toString()
      if (!teamsSet.has(teamAKey)) {
        teamsSet.add(teamAKey)
        teamsArray.push({
          _id: match.teamA._id,
          name: match.teamA.name,
          abreviation: match.teamA.abreviation,
        })
      }

      // Agregar teamB si no existe
      const teamBKey = match.teamB._id.toString()
      if (!teamsSet.has(teamBKey)) {
        teamsSet.add(teamBKey)
        teamsArray.push({
          _id: match.teamB._id,
          name: match.teamB.name,
          abreviation: match.teamB.abreviation,
        })
      }
    })

    // Ordenar por nombre
    teamsArray.sort((a, b) => a.name.localeCompare(b.name))

    res.json({
      tournament: tournamentId,
      teams: teamsArray,
      totalTeams: teamsArray.length,
    })
  } catch (error) {
    console.error("Error fetching teams by tournament:", error)
    res.status(500).json({ message: error.message })
  }
})

// GET - Obtener estadísticas de partidos por torneo
router.get("/tournament/:tournamentId/stats", async (req, res) => {
  try {
    const { tournamentId } = req.params

    const stats = await ScheduledMatch.aggregate([
      { $match: { tournament: tournamentId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const totalMatches = await ScheduledMatch.countDocuments({ tournament: tournamentId })

    // Próximos partidos del torneo
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingMatches = await ScheduledMatch.countDocuments({
      tournament: tournamentId,
      date: { $gte: today },
      status: { $ne: "cancelled" },
    })

    res.json({
      tournament: tournamentId,
      totalMatches,
      upcomingMatches,
      statusBreakdown: stats,
    })
  } catch (error) {
    console.error("Error fetching tournament stats:", error)
    res.status(500).json({ message: error.message })
  }
})

// GET - Obtener partido por ID
router.get("/:id", async (req, res) => {
  try {
    const match = await ScheduledMatch.findById(req.params.id)
      .populate("teamA", "name abreviation")
      .populate("teamB", "name abreviation")
      .populate("tournament", "name type")

    if (!match) {
      return res.status(404).json({ message: "Partido no encontrado" })
    }

    res.json(match)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST - Crear nuevo partido programado
router.post("/", async (req, res) => {
  try {
    const { date, time, teamA, teamB, tournament, stadium, referee, notes, matchday } = req.body

    // Validaciones
    if (!date || !time || !teamA || !teamB || !tournament) {
      return res.status(400).json({
        message: "Fecha, hora, equipos y torneo son obligatorios",
      })
    }

    if (teamA === teamB) {
      return res.status(400).json({
        message: "Los equipos no pueden ser iguales",
      })
    }

    // Verificar si ya existe un partido entre estos equipos en la misma fecha
    const existingMatch = await ScheduledMatch.findOne({
      date: new Date(date),
      $or: [
        { teamA: teamA, teamB: teamB },
        { teamA: teamB, teamB: teamA },
      ],
    })

    if (existingMatch) {
      return res.status(400).json({
        message: "Ya existe un partido entre estos equipos en esta fecha",
      })
    }

    const newMatch = new ScheduledMatch({
      date: new Date(date),
      time,
      teamA,
      teamB,
      tournament,
      stadium: stadium || "",
      referee: referee || "",
      notes: notes || "",
      matchday: matchday || 1,
    })

    const savedMatch = await newMatch.save()

    // Poblar los datos para la respuesta
    const populatedMatch = await ScheduledMatch.findById(savedMatch._id)
      .populate("teamA", "name abreviation")
      .populate("teamB", "name abreviation")
      .populate("tournament", "name type")

    res.status(201).json(populatedMatch)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT - Actualizar partido programado
router.put("/:id", async (req, res) => {
  try {
    const { date, time, teamA, teamB, tournament, stadium, referee, notes, matchday, status } = req.body

    const updatedMatch = await ScheduledMatch.findByIdAndUpdate(
      req.params.id,
      {
        date: date ? new Date(date) : undefined,
        time,
        teamA,
        teamB,
        tournament,
        stadium,
        referee,
        notes,
        matchday,
        status,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    )
      .populate("teamA", "name abreviation")
      .populate("teamB", "name abreviation")
      .populate("tournament", "name type")

    if (!updatedMatch) {
      return res.status(404).json({ message: "Partido no encontrado" })
    }

    res.json(updatedMatch)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE - Eliminar partido programado
router.delete("/:id", async (req, res) => {
  try {
    const deletedMatch = await ScheduledMatch.findByIdAndDelete(req.params.id)

    if (!deletedMatch) {
      return res.status(404).json({ message: "Partido no encontrado" })
    }

    res.json({ message: "Partido eliminado correctamente" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST - Convertir partido programado a partido en vivo
router.post("/:id/start", async (req, res) => {
  try {
    const scheduledMatch = await ScheduledMatch.findById(req.params.id)

    if (!scheduledMatch) {
      return res.status(404).json({ message: "Partido programado no encontrado" })
    }

    // Aquí podrías crear el partido en vivo
    // const liveMatch = new LiveMatch({
    //   teamA: scheduledMatch.teamA,
    //   teamB: scheduledMatch.teamB,
    //   tournament: scheduledMatch.tournament,
    //   // ... otros campos
    // });

    // await liveMatch.save();

    // Opcional: eliminar o marcar como iniciado el partido programado
    // await ScheduledMatch.findByIdAndDelete(req.params.id);

    res.json({ message: "Partido iniciado correctamente" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
