import axios from 'axios';

const BASE_URL = "https://api.sportmonks.com/v3/football";

// Helper to safely get nested properties
const get = (obj, path, def = null) => {
    if (!obj) return def;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || def;
};

// Helper to find specific stat type in array
const findStat = (stats, typeName) => {
    if (!stats) return 0;
    const stat = stats.find(s =>
        s.type?.name === typeName ||
        s.type?.developer_name === typeName ||
        s.type?.code === typeName
    );
    return stat?.data?.value ?? stat?.value ?? 0;
};

import { Team } from '../../models/index.js';

export const getTeamData = async (teamId, token) => {
    if (!token) throw new Error("API Token missing");

    try {
        // 1. Check Cache (TEMPORARILY DISABLED for data structure update)
        const cachedTeam = await Team.findOne({ where: { externalId: teamId } });
        const TTL = 5 * 60 * 1000; // 5 minutes (temporarily reduced for testing)

        if (false && cachedTeam && cachedTeam.statsData && cachedTeam.statsLastUpdated) {
            const isFresh = (Date.now() - new Date(cachedTeam.statsLastUpdated).getTime()) < TTL;
            if (isFresh) {
                console.log(`Returning Team ${teamId} from Cache`);
                return cachedTeam.statsData;
            }
        }

        console.log(`Fetching Team ${teamId} from API...`);

        // Fetch Team Data with Critical Includes
        // activeSeasons.league: Competitions
        // statistics.season: General Stats
        // latest.fixtures.stats: Recent Match Stats (Corners/Cards)
        // latest.fixtures.league: Recent Match League
        // upcoming.fixtures.league: Next Match League
        // squad.player.statistics: Player Stats

        const includes = [
            'activeSeasons.league',
            'statistics.season'
        ].join(';');

        const url = `${BASE_URL}/teams/${teamId}?api_token=${token}&include=${includes}`;
        const response = await axios.get(url);
        const data = response.data.data;

        if (!data) throw new Error("Team not found");

        // 1. Team Info & Competitions
        const competitions = (data.activeSeasons || []).map(season => ({
            name: season.league?.name || "Unknown League",
            image: season.league?.image_path,
            id: season.league_id
        }));

        // 2. Fetch Latest Fixtures Separately
        // Use /fixtures/between for the last 6 months to get recent form
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 180); // Last 180 days

        const formatDate = (d) => d.toISOString().split('T')[0];
        const start = formatDate(pastDate);
        const end = formatDate(today);

        const fixturesUrl = `${BASE_URL}/fixtures/between/${start}/${end}/${teamId}?api_token=${token}&include=league;participants;scores;statistics.type;state`;
        let latestFixtures = [];
        try {
            const resFixtures = await axios.get(fixturesUrl);
            // Filter for finished matches and sort by date desc
            const allFixtures = resFixtures.data.data || [];
            latestFixtures = allFixtures
                .filter(f => {
                    const s = f.state?.state || f.state?.short_code;
                    return s === 'FT' || s === 'AET' || s === 'FT_PEN';
                })
                .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at));
        } catch (e) {
            console.error("Failed to fetch team fixtures:", e.message);
        }

        // 2b. Fetch UPCOMING Fixtures (next 60 days)
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 60);
        const futureEnd = formatDate(futureDate);
        const todayStr = formatDate(today);

        let upcomingFixtures = [];
        try {
            const upcomingUrl = `${BASE_URL}/fixtures/between/${todayStr}/${futureEnd}/${teamId}?api_token=${token}&include=league;participants;venue;state`;
            const resUpcoming = await axios.get(upcomingUrl);
            const allUpcoming = resUpcoming.data.data || [];
            upcomingFixtures = allUpcoming
                .filter(f => {
                    const s = f.state?.state || f.state?.short_code;
                    return s === 'NS' || s === 'TBA' || s === 'POSTP' || !s; // Not started
                })
                .sort((a, b) => new Date(a.starting_at) - new Date(b.starting_at))
                .slice(0, 5);
        } catch (e) {
            console.error("Failed to fetch upcoming fixtures:", e.message);
        }

        let totalGoalsScored = 0;
        let totalGoalsConceded = 0;
        let totalCorners = 0;
        let gamesCount = latestFixtures.length;
        let over05HTCount = 0;
        let over15FTCount = 0;
        let bttsCount = 0;
        let over85CornersCount = 0;

        const matchHistory = latestFixtures.map(fixture => {
            const isHome = fixture.participants?.find(p => p.id == teamId)?.meta?.location === 'home';
            const opponent = fixture.participants?.find(p => p.id != teamId);

            const scores = fixture.scores || [];

            // Helper to get goals for a specific description and location
            const getGoals = (desc, loc) => {
                const scoreObj = scores.find(s => s.description === desc && s.score?.participant === loc);
                return scoreObj?.score?.goals || 0;
            };

            // FT / Current Score
            const homeGoalsFT = getGoals('CURRENT', 'home') || getGoals('FT', 'home');
            const awayGoalsFT = getGoals('CURRENT', 'away') || getGoals('FT', 'away');

            // HT Score
            const homeGoalsHT = getGoals('HT', 'home') || getGoals('1ST_HALF', 'home');
            const awayGoalsHT = getGoals('HT', 'away') || getGoals('1ST_HALF', 'away');

            const goalsScored = isHome ? homeGoalsFT : awayGoalsFT;
            const goalsConceded = isHome ? awayGoalsFT : homeGoalsFT;

            const htGoals = homeGoalsHT + awayGoalsHT;
            const ftGoals = homeGoalsFT + awayGoalsFT;

            // Accumulators
            totalGoalsScored += goalsScored;
            totalGoalsConceded += goalsConceded;

            if (htGoals > 0.5) over05HTCount++;
            if (ftGoals > 1.5) over15FTCount++;
            if (goalsScored > 0 && goalsConceded > 0) bttsCount++;

            // Stats (Corners/Cards) from this fixture - separate by team
            const stats = fixture.statistics || [];
            const homeCorners = stats.find(s => s.type?.name === 'Corners' && s.participant_id === fixture.participants?.find(p => p.meta?.location === 'home')?.id)?.data?.value || 0;
            const awayCorners = stats.find(s => s.type?.name === 'Corners' && s.participant_id === fixture.participants?.find(p => p.meta?.location === 'away')?.id)?.data?.value || 0;
            const matchCorners = homeCorners + awayCorners;

            // Yellow and Red cards
            const homeYellowCards = stats.find(s => s.type?.name === 'Yellowcards' && s.participant_id === fixture.participants?.find(p => p.meta?.location === 'home')?.id)?.data?.value || 0;
            const awayYellowCards = stats.find(s => s.type?.name === 'Yellowcards' && s.participant_id === fixture.participants?.find(p => p.meta?.location === 'away')?.id)?.data?.value || 0;
            const homeRedCards = stats.find(s => s.type?.name === 'Redcards' && s.participant_id === fixture.participants?.find(p => p.meta?.location === 'home')?.id)?.data?.value || 0;
            const awayRedCards = stats.find(s => s.type?.name === 'Redcards' && s.participant_id === fixture.participants?.find(p => p.meta?.location === 'away')?.id)?.data?.value || 0;

            totalCorners += matchCorners;
            if (matchCorners > 8.5) over85CornersCount++;

            // Get participants as home/away teams
            const homeTeamData = fixture.participants?.find(p => p.meta?.location === 'home');
            const awayTeamData = fixture.participants?.find(p => p.meta?.location === 'away');

            return {
                id: fixture.id,
                date: fixture.starting_at,
                timestamp: new Date(fixture.starting_at).getTime() / 1000,
                status: { short: 'FT' },
                home_team: {
                    id: homeTeamData?.id,
                    name: homeTeamData?.name || 'Home',
                    logo: homeTeamData?.image_path,
                    score: homeGoalsFT
                },
                away_team: {
                    id: awayTeamData?.id,
                    name: awayTeamData?.name || 'Away',
                    logo: awayTeamData?.image_path,
                    score: awayGoalsFT
                },
                league: {
                    id: fixture.league?.id,
                    name: fixture.league?.name,
                    logo: fixture.league?.image_path
                },
                corners: {
                    home: homeCorners,
                    away: awayCorners,
                    total: matchCorners
                },
                cards: {
                    yellow: { home: homeYellowCards, away: awayYellowCards },
                    red: { home: homeRedCards, away: awayRedCards }
                },
                result: goalsScored > goalsConceded ? 'V' : (goalsScored === goalsConceded ? 'E' : 'D'),
                isHome
            };
        });

        const avg = (num) => gamesCount > 0 ? parseFloat((num / gamesCount).toFixed(2)) : 0;
        const pct = (num) => gamesCount > 0 ? parseFloat(((num / gamesCount) * 100).toFixed(2)) : 0;

        const statsGrid = {
            avgGoalsScored: avg(totalGoalsScored),
            avgGoalsConceded: avg(totalGoalsConceded),
            over05HT: pct(over05HTCount),
            over15FT: pct(over15FTCount),
            btts: pct(bttsCount),
            avgCorners: avg(totalCorners),
            over85Corners: pct(over85CornersCount)
        };

        // 3. Radar Calculation (Normalized 0-100)
        // Simple heuristics for now
        const attackScore = Math.min(100, (statsGrid.avgGoalsScored / 3) * 100); // 3 goals avg = 100%
        const defenseScore = Math.min(100, Math.max(0, (1 - (statsGrid.avgGoalsConceded / 3)) * 100)); // 0 conceded = 100%
        // Possession needs season stats
        const seasonStats = data.statistics ? data.statistics[0] : null; // Take first season found
        const avgPossession = seasonStats ? findStat(seasonStats.details, 'Ball Possession %') : 50;

        const radar = {
            attack: Math.round(attackScore),
            defense: Math.round(defenseScore),
            possession: Math.round(avgPossession),
            pressure: Math.round((attackScore + avgPossession) / 2) // Placeholder formula
        };

        // 4. Squad (Fetch Separately)
        let squadList = [];
        try {
            const squadUrl = `${BASE_URL}/squads/teams/${teamId}?api_token=${token}&include=player.statistics.details.type`;
            const resSquad = await axios.get(squadUrl);
            const squad = resSquad.data.data || [];

            squadList = squad.map(playerItem => {
                const player = playerItem.player;
                if (!player) return null;

                const stats = player.statistics || [];
                // Try to find stats for the current season (activeSeasons[0])
                // Or just take the first one if we can't match
                const activeSeasonId = data.activeSeasons && data.activeSeasons.length > 0 ? data.activeSeasons[0].season_id : null;

                let stat = stats.find(s => s.season_id === activeSeasonId);
                if (!stat && stats.length > 0) stat = stats[0]; // Fallback

                const details = stat?.details || [];

                // Helper to find stat by type name or developer_name
                const findDetailStat = (typeName, developerName) => {
                    const detail = details.find(d =>
                        d.type?.name === typeName ||
                        d.type?.developer_name === developerName ||
                        d.type?.code === typeName
                    );
                    return detail?.value?.total ?? detail?.value?.average ?? 0;
                };

                return {
                    id: player.id,
                    name: player.common_name || player.display_name,
                    image: player.image_path,
                    position: player.position?.name,
                    rating: findDetailStat('Rating', 'RATING'),
                    goals: findDetailStat('Goals', 'GOALS'),
                    assists: findDetailStat('Assists', 'ASSISTS'),
                    yellowCards: findDetailStat('Yellow Cards', 'YELLOWCARDS'),
                    redCards: findDetailStat('Red Cards', 'REDCARDS'),
                    matchesPlayed: findDetailStat('Appearances', 'APPEARANCES')
                };
            }).filter(p => p);
        } catch (e) {
            console.error("Failed to fetch squad:", e.message);
        }

        // Format upcoming matches
        const upcomingMatches = upcomingFixtures.map(fixture => {
            const homeTeamData = fixture.participants?.find(p => p.meta?.location === 'home');
            const awayTeamData = fixture.participants?.find(p => p.meta?.location === 'away');

            return {
                id: fixture.id,
                date: fixture.starting_at,
                timestamp: new Date(fixture.starting_at).getTime() / 1000,
                status: { short: 'NS' },
                home_team: {
                    id: homeTeamData?.id,
                    name: homeTeamData?.name || 'Home',
                    logo: homeTeamData?.image_path
                },
                away_team: {
                    id: awayTeamData?.id,
                    name: awayTeamData?.name || 'Away',
                    logo: awayTeamData?.image_path
                },
                league: {
                    id: fixture.league?.id,
                    name: fixture.league?.name,
                    logo: fixture.league?.image_path
                },
                venue: fixture.venue ? {
                    name: fixture.venue.name,
                    city: fixture.venue.city_name
                } : null
            };
        });

        const result = {
            teamInfo: {
                id: data.id,
                name: data.name,
                logo: data.image_path,
                competitions
            },
            statsGrid,
            radar,
            matchHistory,
            upcomingMatches,
            squad: {
                hasData: squadList.length > 0,
                players: squadList
            }
        };

        // Save to Cache
        await Team.upsert({
            externalId: teamId,
            name: data.name,
            logo: data.image_path,
            statsData: result,
            statsLastUpdated: new Date()
        });

        return result;

    } catch (error) {
        console.error("Error in getTeamData:", error.message);
        throw error;
    }
};
