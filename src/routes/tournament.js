import express from 'express'
import Tournament from '../models/Tournament.js'
import { addTournamentToTeams } from './team.js'

const router = express.Router()

// Obtener todos los torneos
router.get('/', async (req, res) => {
  try {
    
    const tournaments = await Tournament.find().sort({ startDate: -1 })
    res.status(200).json(tournaments)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener torneos', error })
  }
})

// Obtener un torneo por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const tournament = await Tournament.findById(id).populate('teams')
    if (!tournament) {
      return res.status(404).json({ message: 'Torneo no encontrado' })
    }

    res.status(200).json(tournament)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el torneo', error })
  }
})

    router.post('/', async (req, res) => {
        try {
            // req.body.teams puede ser un array de IDs de equipos
            const tournament = new Tournament(req.body)
            await tournament.save()

            // Si se pasan equipos, se agregan al torneo y se actualizan los equipos
            if (tournament.teams && tournament.teams.length > 0) {
            await addTournamentToTeams(tournament._id, tournament.teams)
            }

            res.status(201).json(tournament)
        } catch (error) {
            res.status(400).json({ message: 'Error al crear el torneo', error })
        }
    })


    router.get('/by-team/:teamId', async (req, res) => {
        const { teamId } = req.params;
        try {
            const tournament = await Tournament.findOne({ teams: teamId }).populate('teams');
            if (!tournament) {
                return res.status(404).json({ message: 'Torneo no encontrado para el equipo' });
            }
            res.status(200).json(tournament);
        } catch (error) {
            res.status(500).json({ message: 'Error al obtener el torneo por equipo', error });
        }
    });

export default router
