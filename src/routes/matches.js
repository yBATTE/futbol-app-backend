import express from 'express';
import Match from '../models/Match.js';
import {getTeamByAbbreviation} from './team.js';
import { createGoalForMatch } from './goal.js';
import { addStatsToPlayer, getPlayerById, getPlayerByName, getPlayersByTeam } from './player.js';
import { updateStanding } from './teamTournametStanding.js';
const router = express.Router();

// Obtener todos los partidos
router.get('/', async (req, res) => {
  try {
    const matches = await Match.find()
      .sort({ date: -1 })
      .populate({
        path: 'teamA',
        populate: { path: 'players', model: 'Player' }
      })
      .populate({
        path: 'teamB',
        populate: { path: 'players', model: 'Player' }
      })
      .populate({
        path: 'goals',
        populate: [
          { path: 'player', model: 'Player' },
          { path: 'assist', model: 'Player' }
        ]
      });

    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener partidos' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Goal:
 *       type: object
 *       properties:
 *         player:
 *           type: string
 *           description: ID del jugador que anotó
 *         team:
 *           type: string
 *           description: ID del equipo que anotó
 *         minute:
 *           type: integer
 *         assist:
 *           type: string
 *           description: ID del jugador que asistió (opcional)
 *         time:
 *           type: string
 *           description: Hora en que se anotó el gol, formato HH:mm
 *     Match:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         teamA:
 *           type: string
 *           description: ID del equipo A
 *         teamB:
 *           type: string
 *           description: ID del equipo B
 *         scoreA:
 *           type: integer
 *         scoreB:
 *           type: integer
 *         goals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Goal'
 *       required:
 *         - date
 *         - teamA
 *         - teamB
 *         - scoreA
 *         - scoreB
 */

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Obtener todos los partidos
 *     tags:
 *       - Partidos
 *     responses:
 *       200:
 *         description: Lista de partidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Match'
 *       500:
 *         description: Error al obtener partidos
 */

/**
 * @swagger
 * /api/matches:
 *   post:
 *     summary: Crear un nuevo partido
 *     tags:
 *       - Partidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Match'
 *     responses:
 *       201:
 *         description: Partido creado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Match'
 *       500:
 *         description: Error al crear el partido
 */

/**
 * @swagger
 * /api/matches/{id}:
 *   put:
 *     summary: Actualizar un partido existente
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del partido a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Match'
 *     responses:
 *       200:
 *         description: Partido actualizado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Match'
 *       400:
 *         description: Error al actualizar partido
 *       404:
 *         description: Partido no encontrado
 */
router.post('/', async (req, res) => {
  const teamA = await getTeamByAbbreviation(req.body.teamA)
  if (!teamA) {
    return res.status(400).json({ message: 'Equipo A no encontrado' })
  }

  const teamB = await getTeamByAbbreviation(req.body.teamB)
  if (!teamB) {
    return res.status(400).json({ message: 'Equipo B no encontrado' })
  }

  const { tournament } = req.body
  if (!tournament) {
    return res.status(400).json({ message: 'ID del torneo requerido' })
  }

  try {
    const match = new Match({
      date: req.body.date,
      teamA: teamA.team._id,
      teamB: teamB.team._id,
      scoreA: req.body.scoreA || 0,
      scoreB: req.body.scoreB || 0,
      tournament,
      goals: []
    })

    const savedMatch = await match.save()

    // Estadísticas por jugador
    const playerStats = {}

    if (Array.isArray(req.body.goals)) {
      for (const goal of req.body.goals) {
        const player = await getPlayerByName(goal.player)
        const teamResult = await getTeamByAbbreviation(goal.team)
        const assistPlayer = goal.assist ? await getPlayerByName(goal.assist) : null
        const teamId = teamResult?.team?._id

        const createdGoal = await createGoalForMatch(
          savedMatch._id,
          player._id,
          teamId,
          assistPlayer ? assistPlayer._id : null,
          goal.minute
        )

        savedMatch.goals.push(createdGoal)

        if (!playerStats[player._id]) {
          playerStats[player._id] = { goals: 0, assists: 0 }
        }
        playerStats[player._id].goals += 1

        if (goal.assist && assistPlayer) {
          if (!playerStats[assistPlayer._id]) {
            playerStats[assistPlayer._id] = { goals: 0, assists: 0 }
          }
          playerStats[assistPlayer._id].assists += 1
        }
      }

      await savedMatch.save()
    }

    // Sumar estadísticas a cada jugador
    for (const playerId in playerStats) {
      const stats = playerStats[playerId]
      await addStatsToPlayer(playerId, {
        goals: stats.goals || 0,
        assists: stats.assists || 0
      })
    }

    // Sumar partido jugado a todos los jugadores de ambos equipos
    const playersTeamA = await getPlayersByTeam(teamA.team._id)
    const playersTeamB = await getPlayersByTeam(teamB.team._id)

    for (const player of [...playersTeamA, ...playersTeamB]) {
      await addStatsToPlayer(player._id, { matchesPlayed: 1 })
    }

    // 🔥 Actualizar standings por torneo
    const updateStanding = async (teamId, isWin, isDraw, goalsFor, goalsAgainst) => {
      const standing = await TeamTournamentStanding.findOneAndUpdate(
        { team: teamId, tournament },
        {},
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )

      standing.matchesPlayed += 1
      standing.goalsFor += goalsFor
      standing.goalsAgainst += goalsAgainst
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst

      if (isWin) {
        standing.wins += 1
        standing.points += 3
      } else if (isDraw) {
        standing.draws += 1
        standing.points += 1
      } else {
        standing.losses += 1
      }

      await standing.save()
    }

    const scoreA = req.body.scoreA || 0
    const scoreB = req.body.scoreB || 0
    const isDraw = scoreA === scoreB
    const teamAWins = scoreA > scoreB
    const teamBWins = scoreB > scoreA

    await updateStanding(teamA.team._id, teamAWins, isDraw, scoreA, scoreB)
    await updateStanding(teamB.team._id, teamBWins, isDraw, scoreB, scoreA)

    res.status(201).json({
      match: savedMatch,
      playerStats
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al crear el partido' })
  }
})



// ✅ FUNCIÓN CORREGIDA - createMatchByLiveMatch
export const createMatchByLiveMatch = async (teamA, teamB, date, goals, scoreA, scoreB, tournamentId) => {
  try {
    const match = new Match({
      date: date || new Date(),
      teamA: teamA._id,
      teamB: teamB._id,
      scoreA,
      scoreB,
      tournament: tournamentId,
      goals: [],
    })

    const savedMatch = await match.save()

    // 🧠 Estadísticas acumuladas por jugador
    const playerStats = {}

    if (Array.isArray(goals)) {
      for (const goal of goals) {
        let player = null
        let assistPlayer = null


        // ✅ MANEJAR GOLEADOR
        if (goal.player && goal.player._id) {
          // Jugador existente
          try {
            player = await getPlayerById(goal.player._id)
          } catch (error) {
          }
        } else if (goal.player && goal.player.firstName && goal.player.lastName) {
          // ✅ CREAR JUGADOR CUSTOM
          try {
            player = await createQuickPlayer({
              firstName: goal.player.firstName,
              lastName: goal.player.lastName,
              club: goal.player.team || goal.team._id,
              number: goal.player.number || 0,
              position: goal.player.position || "Delantero",
            })
          } catch (error) {
            console.error("❌ Error creando goleador custom:", error)
          }
        }

        // ✅ MANEJAR ASISTENTE
        if (goal.assist && goal.assist._id) {
          // Asistente existente
          try {
            assistPlayer = await getPlayerById(goal.assist._id)
          } catch (error) {
          }
        } else if (goal.assist && goal.assist.firstName && goal.assist.lastName) {
          // ✅ CREAR ASISTENTE CUSTOM
          try {
            assistPlayer = await createQuickPlayer({
              firstName: goal.assist.firstName,
              lastName: goal.assist.lastName,
              club: goal.assist.team || goal.team._id,
              number: goal.assist.number || 0,
              position: goal.assist.position || "Mediocampista",
            })
          } catch (error) {
            console.error("❌ Error creando asistente custom:", error)
          }
        }

        // Crear el gol solo si tenemos un jugador válido
        if (player) {
          try {
            const createdGoal = await createGoalForMatch(
              savedMatch._id, // Usar el ID del match guardado
              player._id,
              goal.team._id,
              assistPlayer ? assistPlayer._id : null,
              goal.minute || 0,
            )

            savedMatch.goals.push(createdGoal._id)

            // Estadísticas de goles
            if (!playerStats[player._id]) playerStats[player._id] = { goals: 0, assists: 0 }
            playerStats[player._id].goals += 1

            // Estadísticas de asistencias
            if (assistPlayer) {
              if (!playerStats[assistPlayer._id]) playerStats[assistPlayer._id] = { goals: 0, assists: 0 }
              playerStats[assistPlayer._id].assists += 1
            }

          } catch (error) {
            console.error("❌ Error creando gol:", error)
          }
        } else {
        }
      }

      await savedMatch.save()
    }

    // 🧩 Actualizar estadísticas de jugadores
    for (const playerId in playerStats) {
      const stats = playerStats[playerId]
      try {
        await addStatsToPlayer(playerId, {
          goals: stats.goals || 0,
          assists: stats.assists || 0,
        })
      } catch (error) {
        console.error("❌ Error actualizando estadísticas del jugador:", error)
      }
    }

    // 🏃‍♂️ Sumar partido jugado a todos los jugadores de ambos equipos
    try {
      const playersTeamA = await getPlayersByTeam(teamA._id)
      const playersTeamB = await getPlayersByTeam(teamB._id)

      for (const player of [...playersTeamA, ...playersTeamB]) {
        await addStatsToPlayer(player._id, { matchesPlayed: 1 })
      }
    } catch (error) {
      console.error("❌ Error actualizando partidos jugados:", error)
    }

    // 📊 Actualizar standings del torneo
    try {
      const isDraw = scoreA === scoreB
      const teamAWins = scoreA > scoreB
      const teamBWins = scoreB > scoreA

      await updateStanding(teamA._id, tournamentId, teamAWins, isDraw, scoreA, scoreB)
      await updateStanding(teamB._id, tournamentId, teamBWins, isDraw, scoreB, scoreA)
    } catch (error) {
      console.error("❌ Error actualizando standings:", error)
    }

    return savedMatch
  } catch (error) {
    console.error("❌ Error al crear el partido:", error)
    throw new Error("Error al crear el partido")
  }
}

export default router
