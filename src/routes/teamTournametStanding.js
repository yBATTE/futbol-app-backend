import express from 'express';
import TeamTournamentStanding from '../models/TeamTournamentStanding.js';

const router = express.Router();

// Obtener la tabla de posiciones de un torneo
router.get('/:tournamentId/standings', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Traemos los standings ordenados por puntos, diferencia de gol y goles a favor
    const standings = await TeamTournamentStanding.find({ tournament: tournamentId })
      .populate('team', 'name') // trae el nombre del equipo
      .sort([
        ['points', -1],
        ['goalDifference', -1],
        ['goalsFor', -1]
      ]);

    res.json(standings);
  } catch (err) {
    console.error('Error al obtener la tabla:', err);
    res.status(500).json({ message: 'Error interno al obtener la tabla', error: err?.message || err });
  }
});

export default router;
