import sportMonksProvider from '../../../sportmonks/provider/SportMonksProvider.js';

const RACE_TARGETS = [3, 5, 7, 9];
const INTERVALS = [
    { label: '0-15', start: 0, end: 15 },
    { label: '16-30', start: 16, end: 30 },
    { label: '31-45', start: 31, end: 45 }, // Inclui acréscimos 1T
    { label: '46-60', start: 46, end: 60 },
    { label: '61-75', start: 61, end: 75 },
    { label: '76-90', start: 76, end: 90 }  // Inclui acréscimos 2T
];

// --- HELPERS ---

/**
 * Busca histórico de partidas
 */
const fetchHistory = async (teamId, location) => {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6);
    const startDate = pastDate.toISOString().split('T')[0];

    const response = await sportMonksProvider.get(
        `/fixtures/between/${startDate}/${today}/${teamId}`,
        {
            include: 'participants;statistics.type;events.type',
            per_page: 20,
            order: 'desc'
        }
    );

    const allMatches = response.data || [];

    // Filtra por location (home/away)
    return allMatches.filter(m => {
        const p = m.participants.find(part => part.id == teamId);
        return p && p.meta && p.meta.location === location;
    });
};

/**
 * Processa estatísticas de cantos
 */
const processCornerStats = (matches, teamId) => {
    const totalGames = matches.length;
    if (totalGames === 0) return null;

    let stats = {
        corners_for: 0,
        corners_against: 0,
        races: { 3: 0, 5: 0, 7: 0, 9: 0 },
        intervals: {
            '0-15': { for: 0, against: 0 },
            '16-30': { for: 0, against: 0 },
            '31-45': { for: 0, against: 0 },
            '46-60': { for: 0, against: 0 },
            '61-75': { for: 0, against: 0 },
            '76-90': { for: 0, against: 0 }
        },
        handicaps: {
            // Exemplo: Quantas vezes cobriu handicap -1.5
            minus_1_5: 0,
            plus_1_5: 0
        },
        overs: {
            ft_85: 0, ft_95: 0, ft_105: 0,
            ht_45: 0
        }
    };

    matches.forEach(match => {
        const isHome = match.participants.find(p => p.meta.location === 'home').id == teamId;
        const myLoc = isHome ? 'home' : 'away';
        const opLoc = isHome ? 'away' : 'home';

        // Helper para pegar valor de estatística
        const getStat = (code, loc) => {
            const s = match.statistics.find(stat => stat.location === loc && stat.type.code === code);
            return s ? s.data.value : 0;
        };

        const myCorners = getStat('corners', myLoc);
        const opCorners = getStat('corners', opLoc);
        const totalCorners = myCorners + opCorners;

        // 1. Médias
        stats.corners_for += myCorners;
        stats.corners_against += opCorners;

        // 2. Overs
        if (totalCorners > 8.5) stats.overs.ft_85++;
        if (totalCorners > 9.5) stats.overs.ft_95++;
        if (totalCorners > 10.5) stats.overs.ft_105++;

        // 3. Handicaps (Exemplo simples)
        if (myCorners - opCorners > 1.5) stats.handicaps.minus_1_5++;
        if (opCorners - myCorners < 1.5) stats.handicaps.plus_1_5++;

        // 4. Race to X (Requer análise de eventos minuto a minuto)
        // Se a API não der timeline de cantos fácil, usamos o total como proxy (impreciso)
        // Ou iteramos sobre events type 'corner'
        if (match.events) {
            const corners = match.events.filter(e => e.type.name.toLowerCase().includes('corner'));
            corners.sort((a, b) => a.minute - b.minute);

            let myCount = 0;
            let raceWon = { 3: false, 5: false, 7: false, 9: false };

            corners.forEach(c => {
                if (c.participant_id == teamId) myCount++;

                RACE_TARGETS.forEach(target => {
                    if (myCount === target && !raceWon[target]) {
                        stats.races[target]++;
                        raceWon[target] = true;
                    }
                });

                // Intervalos
                const label = INTERVALS.find(i => c.minute >= i.start && c.minute <= i.end)?.label;
                if (label) {
                    if (c.participant_id == teamId) stats.intervals[label].for++;
                    else stats.intervals[label].against++;
                }
            });
        }
    });

    const pct = (val) => Math.round((val / totalGames) * 100);

    return {
        total_games: totalGames,
        averages: {
            for: (stats.corners_for / totalGames).toFixed(2),
            against: (stats.corners_against / totalGames).toFixed(2),
            total: ((stats.corners_for + stats.corners_against) / totalGames).toFixed(2)
        },
        percentages: {
            over_85: pct(stats.overs.ft_85),
            over_95: pct(stats.overs.ft_95),
            over_105: pct(stats.overs.ft_105)
        },
        races: {
            race_3: pct(stats.races[3]),
            race_5: pct(stats.races[5]),
            race_7: pct(stats.races[7]),
            race_9: pct(stats.races[9])
        },
        intervals: stats.intervals
    };
};

// --- CONTROLLER ---

const handleRequest = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        if (!fixtureId) return res.status(400).json({ error: 'Fixture ID required' });

        const matchRes = await sportMonksProvider.get(`/fixtures/${fixtureId}`, {
            include: 'participants;league'
        });
        const match = matchRes.data;
        if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

        const homeId = match.participants.find(p => p.meta.location === 'home').id;
        const awayId = match.participants.find(p => p.meta.location === 'away').id;

        const [homeHistory, awayHistory] = await Promise.all([
            fetchHistory(homeId, 'home'),
            fetchHistory(awayId, 'away')
        ]);

        const homeStats = processCornerStats(homeHistory, homeId);
        const awayStats = processCornerStats(awayHistory, awayId);

        if (!homeStats || !awayStats) {
            return res.status(200).json({ success: false, message: 'Dados insuficientes' });
        }

        // Combine Predictions
        const combine = (key) => Math.round((homeStats.percentages[key] + awayStats.percentages[key]) / 2);

        const responseData = {
            match: { id: match.id, home: match.participants.find(p => p.id === homeId).name, away: match.participants.find(p => p.id === awayId).name },
            predictions_table: {
                full_time: {
                    over_85: { home: homeStats.percentages.over_85, away: awayStats.percentages.over_85, match: combine('over_85') },
                    over_95: { home: homeStats.percentages.over_95, away: awayStats.percentages.over_95, match: combine('over_95') },
                    over_105: { home: homeStats.percentages.over_105, away: awayStats.percentages.over_105, match: combine('over_105') }
                }
            },
            analysis: {
                home: homeStats,
                away: awayStats
            }
        };

        return res.json({ success: true, data: responseData });

    } catch (error) {
        console.error("Erro MatchCornersAnalysis:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// --- ROTA ---
export default {
    path: '/sportmonks/match/:fixtureId/corners-analysis',
    method: 'GET',
    handler: handleRequest
};