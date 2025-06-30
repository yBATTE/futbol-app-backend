  import express from 'express';
  import Team from '../models/Team.js';
  import { assignTeamToPlayer } from './player.js';

  const router = express.Router();

  /**
   * @swagger
   * components:
   *   schemas:
   *     Team:
   *       type: object
   *       properties:
   *         name:
   *           type: string
   *           description: Nombre del equipo
   *         abreviation:
   *          type: string
   *          description: Abreviatura del equipo
   *         location:
   *           type: string
   *           description: Localidad del equipo
   *         division:
   *           type: string
   *           description: División en la que juega
   *         cup:
   *           type: string
   *           description: Copa en la que participa
   *         stadium:
   *           type: string
   *           description: Estadio donde juega de local
   *         coach:
   *           type: string
   *           description: Nombre del entrenador
   *         players:
   *           type: array
   *           description: Lista de IDs de los jugadores
   *           items:
   *             type: string
   *       required:
   *         - name
   */

  /**
   * @swagger
   * /api/team:
   *   post:
   *     summary: Crear un nuevo equipo
   *     tags:
   *       - Equipos
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Team'
   *     responses:
   *       201:
   *         description: Equipo creado con éxito
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Team'
   *       400:
   *         description: Error al crear el equipo (ej. falta nombre)
   */
  router.post('/', async (req, res) => {
    try {
      const team = new Team(req.body);
      const savedTeam = await team.save();
      res.status(201).json(savedTeam);
    } catch (error) {
      console.error('Error al crear el equipo:', error);
      res.status(400).json({ message: 'Error al crear el equipo', error });
    }
  });

  /**
   * @swagger
   * /api/team/{id}:
   *   put:
   *     summary: Editar datos del equipo (sin jugadores)
   *     tags:
   *       - Equipos
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del equipo a editar
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               division:
   *                 type: string
   *               cup:
   *                 type: string
   *               coach:
   *                 type: string
   *     responses:
   *       200:
   *         description: Equipo actualizado con éxito
   *       400:
   *         description: Error en la solicitud
   *       404:
   *         description: Equipo no encontrado
   */
  router.put('/:id', async (req, res) => {
    try {
      const { division, cup, coach } = req.body;
      const updatedTeam = await Team.findByIdAndUpdate(
        req.params.id,
        { division, cup, coach },
        { new: true }
      );
      if (!updatedTeam) return res.status(404).json({ message: 'Equipo no encontrado' });
      res.json(updatedTeam);
    } catch (error) {
      console.error('Error al actualizar el equipo:', error);
      res.status(400).json({ message: 'Error al actualizar el equipo', error });
    }
  });

  /**
   * @swagger
   * /api/team/{id}/add-player/{playerId}:
   *   put:
   *     summary: Actualizar el equipo del jugador
   *     tags:
   *       - Equipos
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del equipo
   *       - in: path
   *         name: playerId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del jugador a agregar
   *     responses:
   *       200:
   *         description: Jugador agregado al equipo
   *       404:
   *         description: Equipo no encontrado
   *       400:
   *         description: Error al agregar el jugador
   */
  router.put('/:id/add-player/:playerId', async (req, res) => {
    try {
      const { id, playerId } = req.params;

      const team = await Team.findById(id);
      if (!team) return res.status(404).json({ message: 'Equipo no encontrado' });

      // Verificar si el jugador ya está agregado
      if (team.players.includes(playerId)) {
        return res.status(400).json({ message: 'El jugador ya está en el equipo' });
      }

      await assignTeamToPlayer(playerId, id);

      team.players.push(playerId);
      await team.save();

      res.json({ message: 'Jugador agregado al equipo', team });
    } catch (error) {
      console.error('Error al agregar jugador al equipo:', error);
      res.status(400).json({ message: 'Error al agregar jugador', error });
    }
  });

  /**
   * @swagger
   * /api/team/abbreviation/{abbreviation}:
   *   get:
   *     summary: Obtener equipo por abreviatura
   *     tags:
   *       - Equipos
   *     parameters:
   *       - in: path
   *         name: abbreviation
   *         required: true
   *         schema:
   *           type: string
   *         description: Abreviatura del equipo
   *     responses:
   *       200:
   *         description: Equipo encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Team'
   *       404:
   *         description: Equipo no encontrado
   *       400:
   *         description: Error al buscar el equipo
   */
  export const getTeamByAbbreviation = async(abreviation) => {
      try {
          const team = await Team.findOne({ abreviation: abreviation }).lean();
          if (!team) {
          return { status: 404, message: 'Equipo no encontrado' };
          }
          return { status: 200, team };
      } catch (error) {
          console.error('Error al buscar el equipo por abreviatura:', error);
          return { status: 400, message: 'Error al buscar el equipo', error };
      }
  }

  export const getTeamByNameTeam = async(NameTeam) => {
      try {
          const team = await Team.findOne({ name: NameTeam }).lean();
          if (!team) {
          return { status: 404, message: 'Equipo no encontrado' };
          }
          return { status: 200, team };
      } catch (error) {
          console.error('Error al buscar el equipo por abreviatura:', error);
          return { status: 400, message: 'Error al buscar el equipo', error };
      }
  }

  router.get('/abbreviation/:abbreviation', getTeamByAbbreviation);

  /**
   * @swagger
   * /api/team:
   *   get:
   *     summary: Obtener todos los equipos
   *     tags:
   *       - Equipos
   *     responses:
   *       200:
   *         description: Lista de equipos
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Team'
   *       400:
   *         description: Error al obtener los equipos
   */
  router.get('/', async (req, res) => {
      try {
          const teams = await Team.find();
          res.json(teams);
      } catch (error) {
          console.error('Error al obtener los equipos:', error);
          res.status(400).json({ message: 'Error al obtener los equipos', error });
      }
  });

  router.get('/abbreviations', async (req, res) => {
    try {
      const teams = await Team.find({}, 'abreviation -_id');
      const abbreviations = teams.map(team => team.abreviation);
      res.json(abbreviations);
    } catch (error) {
      console.error('Error al obtener las abreviaturas de los equipos:', error);
      res.status(400).json({ message: 'Error al obtener las abreviaturas', error });
    }
  });

  export const addPlayerToTeam = async (teamId, playerId) => {
      const teamUpdated = await Team.findByIdAndUpdate(
          teamId,
          { $addToSet: { players: playerId } },
          { new: true }
      );
      if (!teamUpdated) {
          return { status: 404, message: 'Equipo no encontrado' };
      }
      return { status: 200, team: teamUpdated };
  }

  export const addTournamentToTeams = async (tournamentId, teamIds) => {
      try {
          const teams = await Team.updateMany(
              { _id: { $in: teamIds } },
              { $addToSet: { tournaments: tournamentId } },
              { new: true }
          );
          return { status: 200, teams };
      } catch (error) {
          console.error('Error al agregar torneo a los equipos:', error);
          return { status: 400, message: 'Error al agregar torneo a los equipos', error };
      }
  }

  /**
   * @swagger
   * /api/team/name/{name}:
   *   get:
   *     summary: Obtener equipo por nombre
   *     tags:
   *       - Equipos
   *     parameters:
   *       - in: path
   *         name: name
   *         required: true
   *         schema:
   *           type: string
   *         description: Nombre del equipo
   *     responses:
   *       200:
   *         description: Equipo encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Team'
   *       404:
   *         description: Equipo no encontrado
   *       400:
   *         description: Error al buscar el equipo
   */
  router.get('/name/:name', async (req, res) => {
      try {
          const team = await Team.findOne({ name: req.params.name });
          if (!team) {
              return res.status(404).json({ message: 'Equipo no encontrado' });
          }
          res.json(team);
      } catch (error) {
          console.error('Error al buscar el equipo por nombre:', error);
          res.status(400).json({ message: 'Error al buscar el equipo', error });
      }
  });


  export default router;