import express from 'express';
import Goal from '../models/Goal.js';
import { getTeamByNameTeam } from './team.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Goal:
 *       type: object
 *       properties:
 *         player:
 *           type: string
 *           description: ID del jugador que hizo el gol
 *         team:
 *           type: string
 *           description: ID del equipo
 *         assist:
 *           type: string
 *           description: ID del jugador que asistió (opcional)
 *         minute:
 *           type: integer
 *           description: Minuto en el que se hizo el gol
 *       required:
 *         - player
 *         - team
 *         - minute
 */

/**
 * @swagger
 * /api/goal:
 *   post:
 *     summary: Registrar un nuevo gol
 *     tags:
 *       - Goles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Goal'
 *     responses:
 *       201:
 *         description: Gol creado con éxito
 *       400:
 *         description: Error al registrar el gol
 */
router.post('/', async (req, res) => {
    const team = await getTeamByNameTeam(req.body.team);
    if (!team) {
        return res.status(400).json({ message: 'Equipo A no encontrado' });
    }
  try {
    const goal = new Goal({
        player: req.body.player,
        team: team.team._id, // Aseguramos que se guarde el ID del equipo
        assist: req.body.assist || null, // opcional
        minute: req.body.minute || null, // opcional
        match: req.body.match || null, // opcional
        time: new Date().toTimeString().slice(0, 5) // formato "HH:MM"
    });
    const savedGoal = await goal.save();
    res.status(201).json(savedGoal);
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar el gol', error });
  }
});

/**
 * @swagger
 * /api/goals/team/{teamId}:
 *   get:
 *     summary: Obtener goles por equipo
 *     tags:
 *       - Goles
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Lista de goles del equipo
 *       500:
 *         description: Error al obtener los goles
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    const goals = await Goal.find({ team: req.params.teamId }).populate('player assist match');
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los goles por equipo', error });
  }
});

/**
 * @swagger
 * /api/goals/player/{playerId}:
 *   get:
 *     summary: Obtener goles por jugador
 *     tags:
 *       - Goles
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del jugador
 *     responses:
 *       200:
 *         description: Lista de goles del jugador
 *       500:
 *         description: Error al obtener los goles
 */
router.get('/player/:playerId', async (req, res) => {
  try {
    const goals = await Goal.find({ player: req.params.playerId }).populate('team assist match');
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los goles por jugador', error });
  }
});

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: Obtener todos los goles
 *     tags:
 *       - Goles
 *     responses:
 *       200:
 *         description: Lista de todos los goles
 *       500:
 *         description: Error al obtener los goles
 */
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find().populate('player match');
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los goles', error });
  }
});

export const createGoalForMatch = async (matchId, playerId, teamId, assistId, minute) => {
  try {
    const goal = new Goal({
      player: playerId,
      team: teamId,
      assist: assistId || null,
      minute: minute || null,
      match: matchId,
      time: new Date().toTimeString().slice(0, 5) // formato "HH:MM"
    });
    return await goal.save();
  }
    catch (error) {
        console.error('Error al crear el gol:', error);
        throw new Error('Error al crear el gol');
    }
}

export default router;
