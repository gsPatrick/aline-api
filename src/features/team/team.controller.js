import * as teamService from './team.service.js';

// Helper to get team data
const fetchTeamData = async (id, res) => {
    const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
    if (!token) {
        res.status(500).json({ error: "Server configuration error: API Token missing" });
        return null;
    }
    try {
        return await teamService.getTeamData(id, token);
    } catch (error) {
        console.error("Controller Error:", error.message);
        res.status(500).json({ error: "Failed to fetch team data" });
        return null;
    }
};

// GET /teams/:id - Full team data
export const getTeam = async (req, res) => {
    const data = await fetchTeamData(req.params.id, res);
    if (data) res.json(data);
};

// GET /teams/:id/info - Basic team info
export const getTeamInfo = async (req, res) => {
    const data = await fetchTeamData(req.params.id, res);
    if (data) {
        res.json({
            id: data.teamInfo?.id || req.params.id,
            name: data.teamInfo?.name,
            image_path: data.teamInfo?.logo,
            country: { name: 'Brazil' },
            founded: null,
            short_code: data.teamInfo?.name?.substring(0, 3).toUpperCase()
        });
    }
};

// GET /teams/:id/schedule - Match schedule (results + upcoming)
export const getTeamSchedule = async (req, res) => {
    const data = await fetchTeamData(req.params.id, res);
    if (data) {
        // Use data directly from service (already formatted)
        const results = data.matchHistory || [];
        const upcoming = data.upcomingMatches || [];

        res.json({
            results: results.slice(0, 20),
            upcoming: upcoming.slice(0, 10)
        });
    }
};

// GET /teams/:id/squad - Team squad
export const getTeamSquad = async (req, res) => {
    const data = await fetchTeamData(req.params.id, res);
    if (data) {
        // Add jersey_number if missing and ensure image is present
        const players = (data.squad?.players || []).map((p, idx) => ({
            ...p,
            jersey_number: p.jersey_number || (idx + 1),
            image: p.image || `https://cdn.sportmonks.com/images/soccer/players/${p.id % 32}/${p.id}.png`
        }));
        res.json(players);
    }
};

// GET /teams/:id/stats - Team statistics
export const getTeamStats = async (req, res) => {
    const data = await fetchTeamData(req.params.id, res);
    if (data) {
        const teamId = Number(req.params.id);
        const matches = data.matchHistory || []; // Already formatted from service

        // Calculate form from last 5 matches
        const form = matches.slice(0, 5).map(m => m.result || 'E');

        // Extract competitions with form and logos
        const competitionsMap = {};
        matches.forEach(m => {
            const leagueName = m.league?.name || 'Unknown';
            if (!competitionsMap[leagueName]) {
                competitionsMap[leagueName] = {
                    id: m.league?.id || 0,
                    name: leagueName,
                    logo: m.league?.logo,
                    form: []
                };
            }
            if (competitionsMap[leagueName].form.length < 5) {
                competitionsMap[leagueName].form.push(m.result || 'E');
            }
        });

        // Also add competitions from teamInfo if they have logos but no matches
        (data.teamInfo?.competitions || []).forEach(comp => {
            if (!competitionsMap[comp.name]) {
                competitionsMap[comp.name] = {
                    id: comp.id || 0,
                    name: comp.name,
                    logo: comp.image,
                    form: []
                };
            } else if (!competitionsMap[comp.name].logo && comp.image) {
                competitionsMap[comp.name].logo = comp.image;
            }
        });

        const competitions = Object.values(competitionsMap);

        // Next match from upcoming matches
        const nextMatch = (data.upcomingMatches && data.upcomingMatches.length > 0)
            ? data.upcomingMatches[0]
            : null;

        // Live match - would need real-time check, placeholder for now
        // In production, this would check livescore API or similar
        const liveMatch = null;

        // Calculate stats from statsGrid
        const grid = data.statsGrid || {};

        res.json({
            radar_data: {
                fisicalidade: data.radar?.defense || 0,
                defesa: data.radar?.defense || 0,
                pressao: data.radar?.pressure || 0,
                finalizacao: data.radar?.attack || 0,
                ataque: data.radar?.attack || 0,
                posse: data.radar?.possession || 0,
                contraAtaque: Math.round((data.radar?.attack + data.radar?.pressure) / 2) || 0
            },
            statsGrid: grid,
            form,
            competitions,
            latest_matches: matches.slice(0, 10),
            upcoming_matches: data.upcomingMatches || [],
            next_match: nextMatch,
            live_match: liveMatch,
            predictions: {
                avgGoals: (grid.avgGoalsScored + grid.avgGoalsConceded) || 0,
                goalsScored: grid.avgGoalsScored || 0,
                goalsConceded: grid.avgGoalsConceded || 0,
                over05HT: grid.over05HT || 0,
                over15FT: grid.over15FT || 0,
                over25FT: Math.round((grid.over15FT || 0) * 0.7),
                btts: grid.btts || 0,
                avgCorners: grid.avgCorners || 0,
                over85Corners: grid.over85Corners || 0,
                over95Corners: Math.round((grid.over85Corners || 0) * 0.7),
                corners37HT: 65,
                corners80FT: 70
            }
        });
    }
};
