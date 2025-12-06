const sportMonksProvider = require('../../../sportmonks/provider/SportMonksProvider');

const RACE_TARGETS = [3, 5, 7, 9];
const INTERVALS = [
    { label: '0-10', min: 0, max: 10 },
    { label: '11-20', min: 11, max: 20 },
    { label: '21-30', min: 21, max: 30 },
    { label: '31-HT', min: 31, max: 45 },
    { label: '46-55', min: 46, max: 55 },
    { label: '56-65', min: 56, max: 65 },
    { label: '66-75', min: 66, max: 75 },
    { label: '76-FT', min: 76, max: 95 }
];

const fetchCornerHistory = async (teamId, location) => {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6);
    const startDate = pastDate.toISOString().split('T')[0];

    const response = await sportMonksProvider.get(
        `/fixtures/between/${startDate}/${today}/${teamId}`,
        {
            include: 'league;participants;events.type', // Eventos são mais confiáveis para 1T/2T
            per_page: 20,
            order: 'desc'
        }
    );

    const allMatches = response.data || [];
    return allMatches.filter(m => {
        const p = m.participants.find(part => part.id == teamId);
        return p && p.meta && p.meta.location === location;
    });
};

const processCornerStats = (matches, teamId, period = 'FT') => {
    const totalGames = matches.length;
    if (totalGames === 0) return null;

    let stats = {
        corners_for: 0,
        corners_against: 0,
        overs: {
            // Mercados dinâmicos (ajustamos abaixo conforme periodo)
        },
        races: {},
        intervals: {}
    };

    // Define quais OVERS contar baseado no periodo (Escala muda de FT para HT)
    const thresholds = period === 'FT'
        ? [6.5, 7.5, 8.5, 9.5, 10.5, 11.5]
        : [2.5, 3.5, 4.5, 5.5]; // Escala menor para 1T/2T

    thresholds.forEach(t => stats.overs[t] = 0);
    RACE_TARGETS.forEach(r => stats.races[`race_${r}`] = 0);
    INTERVALS.forEach(i => stats.intervals[i.label] = { for: 0, against: 0 });

    matches.forEach(match => {
        if (!match.events) return;

        // Filtrar e contar Corners via Eventos (Melhor para separar periodos)
        const cornerEvents = match.events
            .filter(e => e.type && e.type.name === 'Corner')
            .filter(e => {
                if (period === '1T') return e.minute <= 45;
                if (period === '2T') return e.minute > 45;
                return true;
            })
            .sort((a, b) => a.minute - b.minute);

        let countFor = 0;
        let countAgainst = 0;
        let racesWon = {};

        cornerEvents.forEach(ev => {
            const isForMe = ev.participant_id == teamId;
            const min = ev.minute;

            if (isForMe) countFor++; else countAgainst++;

            // Intervals (Apenas FT para tabela completa)
            if (period === 'FT') {
                const intv = INTERVALS.find(i => min >= i.min && min <= i.max);
                if (intv) {
                    if (isForMe) stats.intervals[intv.label].for++;
                    else stats.intervals[intv.label].against++;
                }
            }

            // Races (Apenas FT ou logica especifica)
            if (period === 'FT') {
                RACE_TARGETS.forEach(target => {
                    const key = `race_${target}`;
                    if (isForMe && countFor === target && countAgainst < target && !racesWon[key]) {
                        stats.races[key]++;
                        racesWon[key] = true;
                    }
                    if (!isForMe && countAgainst === target && countFor < target) {
                        racesWon[key] = true; // Perdeu a race
                    }
                });
            }
        });

        const total = countFor + countAgainst;
        stats.corners_for += countFor;
        stats.corners_against += countAgainst;

        // Overs
        thresholds.forEach(t => {
            if (total > t) stats.overs[t]++;
        });
    });

    const pct = (val) => Math.round((val / totalGames) * 100);
    const avg = (val) => (val / totalGames).toFixed(1);

    // Formata objeto de porcentagens de Overs
    let oversPct = {};
    thresholds.forEach(t => oversPct[`over_${t.toString().replace('.', '')}`] = pct(stats.overs[t]));

    return {
        averages: {
            for: avg(stats.corners_for),
            against: avg(stats.corners_against),
            total: avg(stats.corners_for + stats.corners_against)
        },
        percentages: oversPct, // Ex: { over_85: 60, over_95: 40 }
        races: stats.races,
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
            fetchCornerHistory(homeId, 'home'),
            fetchCornerHistory(awayId, 'away')
        ]);

        const processAll = (hist, id) => ({
            ft: processCornerStats(hist, id, 'FT'),
            ht: processCornerStats(hist, id, '1T'),
            st: processCornerStats(hist, id, '2T')
        });

        const homeStats = processAll(homeHistory, homeId);
        const awayStats = processAll(awayHistory, awayId);

        // --- PREDICTION TABLE BUILDER ---
        const buildTable = (periodKey) => {
            const h = homeStats[periodKey].percentages;
            const a = awayStats[periodKey].percentages;
            const combine = (valH, valA) => Math.round((valH + valA) / 2);

            let table = {};
            // Itera pelas chaves disponíveis (ex: over_85, over_95 para FT; over_35 para HT)
            Object.keys(h).forEach(key => {
                table[key] = {
                    home: h[key],
                    away: a[key],
                    match: combine(h[key], a[key])
                };
            });
            return table;
        };

        return res.json({
            success: true,
            data: {
                match: {
                    id: match.id,
                    home_team: match.participants.find(p => p.id === homeId).name,
                    away_team: match.participants.find(p => p.id === awayId).name
                },
                // Tabela de Previsões com abas
                predictions_table: {
                    full_time: buildTable('ft'),
                    first_half: buildTable('ht'),
                    second_half: buildTable('st')
                },
                analysis: {
                    home: homeStats,
                    away: awayStats
                }
            }
        });

    } catch (error) {
        console.error("Erro MatchCornersAnalysis:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    path: '/sportmonks/match/:fixtureId/corners-analysis',
    method: 'GET',
    handler: handleRequest
};