import express from 'express';
import Player from '../models/Player.js';
import { addPlayerToTeam } from './team.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         number:
 *           type: integer
 *         position:
 *           type: string
 *         team:
 *           type: string
 *           description: ID del equipo
 *         goals:
 *           type: integer
 *         assists:
 *           type: integer
 *         matchesPlayed:
 *           type: integer
 *       required:
 *         - firstName
 *         - lastName
 *         - team
 */

/**
 * @swagger
 * /api/players:
 *   post:
 *     summary: Crear un nuevo jugador
 *     tags:
 *       - Jugadores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Player'
 *     responses:
 *       201:
 *         description: Jugador creado con éxito
 *       400:
 *         description: Error al crear el jugador
 */
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, number, position, team } = req.body;
    const newPlayer = new Player({
      firstName,
      lastName,
      number,
      position,
      team,
      goals: 0,
      assists: 0,
      matchesPlayed: 0
    });

    // Agregar el jugador al equipo usando addPlayerToTeam
    await addPlayerToTeam(team, newPlayer._id);

    const savedPlayer = await newPlayer.save();
    res.status(201).json(savedPlayer);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el jugador', error });
  }
});

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: Obtener todos los jugadores
 *     tags:
 *       - Jugadores
 *     responses:
 *       200:
 *         description: Lista de todos los jugadores
 *       500:
 *         description: Error al obtener los jugadores
 */
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().populate('team');
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jugadores', error });
  }
});

/**
 * @swagger
 * /api/players/team/{teamId}:
 *   get:
 *     summary: Obtener jugadores por equipo
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Lista de jugadores del equipo
 *       500:
 *         description: Error al obtener los jugadores
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    const players = await Player.find({ team: req.params.teamId });
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jugadores por equipo', error });
  }
});

/**
 * @swagger
 * /api/players/number/{number}:
 *   get:
 *     summary: Obtener jugadores por número
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número del jugador
 *     responses:
 *       200:
 *         description: Lista de jugadores con ese número
 *       500:
 *         description: Error al obtener los jugadores
 */
router.get('/number/:number', async (req, res) => {
  try {
    const players = await Player.find({ number: req.params.number });
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jugadores por número', error });
  }
});

/**
 * @swagger
 * /api/players/position/{position}:
 *   get:
 *     summary: Obtener jugadores por posición
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - in: path
 *         name: position
 *         required: true
 *         schema:
 *           type: string
 *         description: Posición del jugador
 *     responses:
 *       200:
 *         description: Lista de jugadores con esa posición
 *       500:
 *         description: Error al obtener jugadores
 */
router.get('/position/:position', async (req, res) => {
  try {
    const players = await Player.find({ position: req.params.position });
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jugadores por posición', error });
  }
});

/**
 * @swagger
 * /api/players/{id}:
 *   put:
 *     summary: Actualizar datos de un jugador (excepto equipo)
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del jugador
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               number:
 *                 type: integer
 *               position:
 *                 type: string
 *               goals:
 *                 type: integer
 *               assists:
 *                 type: integer
 *               minutesPlayed:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Jugador actualizado
 *       404:
 *         description: Jugador no encontrado
 *       400:
 *         description: Error al actualizar el jugador
 */
router.put('/:id', async (req, res) => {
  try {
    const { team, ...rest } = req.body; // Evitamos actualizar el team acá
    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, rest, { new: true });
    if (!updatedPlayer) return res.status(404).json({ message: 'Jugador no encontrado' });
    res.json(updatedPlayer);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar jugador', error });
  }
});

/**
 * @swagger
 * /api/players/bulk:
 *   post:
 *     summary: Cargar masivamente jugadores
 *     tags:
 *       - Jugadores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 club:
 *                   type: string
 *                   description: ID del club (equipo)
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 number:
 *                   type: integer
 *               required:
 *                 - club
 *                 - firstName
 *                 - lastName
 *                 - number
 *     responses:
 *       201:
 *         description: Jugadores creados exitosamente
 *       400:
 *         description: Error en la carga masiva
 */
router.post('/bulk', async (req, res) => {
    try {
        const playersData = req.body;
        if (!Array.isArray(playersData) || playersData.length === 0) {
            return res.status(400).json({ message: 'Debe enviar un array de jugadores' });
        }

        const createdPlayers = [];
        for (const data of playersData) {
            const { club, firstName, lastName, number, position } = data;
            if (!club || !firstName || !lastName || number === undefined) {
                continue; // skip invalid
            }
            const newPlayer = new Player({
                team: club,
                firstName,
                lastName,
                number,
                position,
                goals: 0,
                assists: 0,
                matchesPlayed: 0
            });
            await addPlayerToTeam(club, newPlayer._id);
            await newPlayer.save();
            createdPlayers.push(newPlayer);
        }

        res.status(201).json(createdPlayers);
    } catch (error) {
        res.status(400).json({ message: 'Error en la carga masiva', error });
    }
});

    /**
     * @swagger
     * /api/players/idteam/{teamId}:
     *   get:
     *     summary: Obtener jugadores por ID del equipo
     *     tags:
     *       - Jugadores
     *     parameters:
     *       - in: path
     *         name: teamId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del equipo
     *     responses:
     *       200:
     *         description: Lista de jugadores del equipo
     *       500:
     *         description: Error al obtener los jugadores
     */
router.get('/lineup/:teamId', async (req, res) => {
  try {
    const players = await Player.find({ team: req.params.teamId });
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener alineación', error });
  }
});


/**
 * @swagger
 * /api/players/topscorer:
 *   get:
 *     summary: Obtener el jugador con más goles (global)
 *     tags:
 *       - Jugadores
 *     responses:
 *       200:
 *         description: Jugador con más goles
 *       404:
 *         description: No hay jugadores
 *       500:
 *         description: Error al obtener el jugador
 */
router.get('/topscorer', async (req, res) => {
  try {
    const topScorer = await Player.findOne().sort({ goals: -1 }).populate('team');
    if (!topScorer) return res.status(404).json({ message: 'No hay jugadores' });
    res.json(topScorer);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el máximo goleador', error });
  }
});

/**
 * @swagger
 * /api/players/topscorer/{teamId}:
 *   get:
 *     summary: Obtener el jugador con más goles de un equipo
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Jugador con más goles del equipo
 *       404:
 *         description: No hay jugadores en el equipo
 *       500:
 *         description: Error al obtener el jugador
 */
router.get('/topscorer/:teamId', async (req, res) => {
  try {
    const topScorer = await Player.findOne({ team: req.params.teamId }).sort({ goals: -1 }).populate('team');
    if (!topScorer) return res.status(404).json({ message: 'No hay jugadores en el equipo' });
    res.json(topScorer);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el máximo goleador del equipo', error });
  }
});



export const assignTeamToPlayer = async (playerId, teamId) => {
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Jugador no encontrado');
  player.team = teamId;
  await player.save();
  return player;
};

export const getPlayerByName = async (firstName) => {
  const player = await Player.findOne({ firstName });
  if (!player) throw new Error('Jugador no encontrado');
  return player;
};

export const addStatsToPlayer = async (playerId, { goals = 0, assists = 0, matchesPlayed = 0 }) => {
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Jugador no encontrado');

  // Asegurarse que los campos sean números y no undefined/null
  player.goals = (typeof player.goals === 'number' ? player.goals : 0) + goals;
  player.assists = (typeof player.assists === 'number' ? player.assists : 0) + assists;
  player.matchesPlayed = (typeof player.matchesPlayed === 'number' ? player.matchesPlayed : 0) + matchesPlayed;

  await player.save();
  return player;
};


export const getPlayersByTeam = async (teamId) => {
  const players = await Player.find({ team: teamId }).populate('team');
  return players;
}


export const getPlayerById = async (id) => {
  const player = await Player.findById(id).populate('team');
  if (!player) throw new Error('Jugador no encontrado');
  return player;
};


export default router;
