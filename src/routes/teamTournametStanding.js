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

// Función para actualizar la tabla de posiciones de un equipo en un torneo
export const updateStanding = async (teamId, tournamentId, isWin, isDraw, goalsFor, goalsAgainst) => {
  const standing = await TeamTournamentStanding.findOneAndUpdate(
    { team: teamId, tournament: tournamentId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  standing.matchesPlayed += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;

  if (isWin) {
    standing.wins += 1;
    standing.points += 3;
  } else if (isDraw) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.losses += 1;
  }

  await standing.save();
};

export default router;
