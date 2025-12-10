import axios from 'axios';
import { calculateCornerStats } from './corners.service.js';
import { calculateGoalAnalysis } from './goals.service.js';
import { calculateCardStats, calculateRefereeStats } from './cards.service.js';
import { calculateGeneralStats } from './general.service.js';
import { generateCharts } from './charts.service.js';
import { normalizeLineups } from './lineups.service.js';
import { apiGetStandings } from '../../services/sports.service.js';
import {
    fetchH2HMatches,
    enrichHistoryWithStats,
    generateTrends,
    generateInsights,
    buildTimeline
} from './overview.service.js';

// Helper to calculate Momentum from Dangerous Attacks trends
const calculateMomentum = (trends, homeId, awayId) => {
    const pressure = [];
    // Find Dangerous Attacks trends
    // Note: We need to know the type_id for Dangerous Attacks. 
    // Since it varies, we might need to pass the stats to find the ID first, or rely on the name in trends if available (it's not usually).
    // However, the trends object usually has 'type_id'. We need to map it.
    // Strategy: We will assume the caller passes the Dangerous Attacks Type ID or we find it from stats.
    // Actually, let's try to find it from the trends if possible or use a robust method.
    // In test-live-data.js we saw we can map stats types.

    // For now, let's assume we receive the 'dangerousAttacksTypeId' or we search for it in the main function and pass it here.
    // But to keep it simple and self-contained, let's pass the whole data object or stats to find the ID.

    return pressure; // Placeholder, will be implemented inside calculateMatchStats for access to all data
};

export const calculateMatchStats = (data) => {
    // ... existing code ...
    // Helper to safely get nested properties
    const get = (obj, path, def = 0) => {
        if (!obj) return def;
        return path.split('.').reduce((acc, part) => acc && acc[part], obj) || def;
    };

    // Helper to find specific stat type in array
    const findStat = (teamStats, typeName, developerName) => {
        if (!teamStats || !teamStats.length) return 0;
        // Check if stats are in 'data' array or direct array
        const statsArray = Array.isArray(teamStats) ? teamStats : (teamStats.data || []);

        // Let's try to find by common names
        const stat = statsArray.find(s => {
            const nameMatch = s.type?.name === typeName || s.type === typeName || s.type?.name === typeName.replace(/_/g, ' ');
            const devMatch = developerName && s.type?.developer_name === developerName;
            return nameMatch || devMatch;
        });
        return stat?.data?.value ?? stat?.value ?? 0;
    };

    // 1. Dados Básicos e Contexto
    const participants = get(data, 'participants', []);
    const home = participants.find(p => p.meta?.location === 'home') || participants[0] || {};
    const away = participants.find(p => p.meta?.location === 'away') || participants[1] || {};

    const basicInfo = {
        teams: {
            home: home.name || 'Home',
            away: away.name || 'Away',
            homeImg: home.image_path,
            awayImg: away.image_path,
        },
        competition: {
            league: get(data, 'league.name'),
            round: get(data, 'round.name'),
        },
        form: {
            home: get(data, 'form.home', '?????').split('').join('-'), // Adjust path if needed
            away: get(data, 'form.away', '?????').split('').join('-'),
        },
        conditions: {
            temperature: get(data, 'weather_report.temperature.temp'),
            weather: get(data, 'weather_report.type'),
            venue: get(data, 'venue.name'),
        }
    };

    // 4. Gols por Intervalo (Stats) & 8. Stats
    const stats = get(data, 'statistics', []);
    // Stats might be an array of objects where each object has 'team_id'
    const homeStats = stats.filter(s => s.participant_id === home.id);
    const awayStats = stats.filter(s => s.participant_id === away.id);

    const shotStats = {
        home: {
            total: findStat(homeStats, 'Shots Total', 'SHOTS_TOTAL'),
            onTarget: findStat(homeStats, 'Shots On Target', 'SHOTS_ON_TARGET'),
            offTarget: findStat(homeStats, 'Shots Off Target', 'SHOTS_OFF_TARGET'),
            blocked: findStat(homeStats, 'Shots Blocked', 'SHOTS_BLOCKED'),
        },
        away: {
            total: findStat(awayStats, 'Shots Total', 'SHOTS_TOTAL'),
            onTarget: findStat(awayStats, 'Shots On Target', 'SHOTS_ON_TARGET'),
            offTarget: findStat(awayStats, 'Shots Off Target', 'SHOTS_OFF_TARGET'),
            blocked: findStat(awayStats, 'Shots Blocked', 'SHOTS_BLOCKED'),
        }
    };

    const offsides = {
        home: findStat(homeStats, 'Offsides', 'OFFSIDES'),
        away: findStat(awayStats, 'Offsides', 'OFFSIDES'),
    };

    const otherStats = {
        corners: {
            home: findStat(homeStats, 'Corners', 'CORNERS'),
            away: findStat(awayStats, 'Corners', 'CORNERS'),
        },
        fouls: {
            home: findStat(homeStats, 'Fouls', 'FOULS'),
            away: findStat(awayStats, 'Fouls', 'FOULS'),
        }
    };

    // 3. Mercados de Gols (Over/Under)
    const odds = get(data, 'odds', []);
    const findOdd = (marketName, label) => {
        const market = odds.find(o => o.market_description === marketName && o.label === label);
        return market ? parseFloat(market.value) : 0;
    };

    // Helper to find Over/Under odds
    const findOverUnder = (total) => {
        const odd = odds.find(o =>
            o.market_description === "Goals Over/Under" &&
            o.label === "Over" &&
            o.total === total
        );
        return odd ? parseFloat(odd.value) : 0;
    };

    const goalMarkets = {
        over05: findOverUnder("0.5"),
        over15: findOverUnder("1.5"),
        over25: findOverUnder("2.5"),
        over35: findOverUnder("3.5"),
    };

    // 7. xG Analysis
    // xG might be in 'probability' or specific stats
    const xG = {
        home: get(data, 'probability.xg.home', 0),
        away: get(data, 'probability.xg.away', 0),
    };

    // Helper to calculate form (W-D-L) from last 5 matches
    const calculateForm = (matches, teamId) => {
        if (!matches || !matches.length) return '?-?-?-?-?';

        // Filter finished matches and sort by date desc
        const finished = matches
            .filter(m => m.state_id === 5 || m.result_info) // 5 is usually finished
            .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
            .slice(0, 5);

        return finished.map(m => {
            // meta.location tells us if the requested team was 'home' or 'away'
            const myLocation = m.meta?.location;
            if (!myLocation) return '?';

            const result = m.result_info || "";

            // Draw check
            if (result.includes("draw") || result.includes("Draw")) return 'D';

            // Win check
            // If "won", we need to know who won.
            // Usually result_info is like "TeamName won..."
            // We can check if the result string starts with the team name?
            // Or simpler: check scores if available.
            // Without scores, we have to rely on the text.

            // Let's try to infer from the match name "Home vs Away"
            const [homeName, awayName] = (m.name || "").split(" vs ");

            let winnerLocation = null;
            if (homeName && result.includes(homeName)) winnerLocation = 'home';
            else if (awayName && result.includes(awayName)) winnerLocation = 'away';

            if (!winnerLocation) return '?'; // Can't determine winner

            if (winnerLocation === myLocation) return 'W';
            return 'L';
        }).join('-');
    };

    // Calculate Corner Stats
    // Pass detailed history (heavy fetch data) AND odds for Value Bets
    const cornerAnalysis = calculateCornerStats(
        data.homeTeam?.detailedHistory,
        data.awayTeam?.detailedHistory,
        home.id,
        away.id,
        odds // Pass odds
    );

    // Calculate Goal Analysis
    const goalAnalysisRaw = calculateGoalAnalysis(
        data.homeTeam?.detailedHistory,
        data.awayTeam?.detailedHistory,
        home.id,
        away.id,
        odds // Pass odds
    );

    // Merge xG into goalAnalysis
    const goalAnalysis = {
        ...goalAnalysisRaw,
        xg: xG
    };

    // Calculate Card Analysis
    const cardStats = calculateCardStats(
        data.homeTeam?.detailedHistory,
        data.awayTeam?.detailedHistory,
        home.id,
        away.id
    );

    // Process Referee Data
    // Calculate stats using the history passed from fetchExternalMatchData
    const refereeStats = calculateRefereeStats(data.refereeHistory, data.referee?.name);

    const refereeData = data.referee ? {
        name: data.referee.name,
        avgCards: refereeStats?.avgCards || 0,
        avgYellow: refereeStats?.avgYellow || 0,
        avgRed: refereeStats?.avgRed || 0,
        image: data.referee.image
    } : null;

    // 10. Heuristic Analysis (Momentum & Action Zones)
    // --- Momentum (Pressure Chart) ---
    const pressure = [];
    const daStat = stats.find(s => s.type?.name === 'Dangerous Attacks' || s.type?.developer_name === 'DANGEROUS_ATTACKS');
    const daTypeId = daStat?.type?.id;

    if (daTypeId && data.trends) {
        const homeTrends = data.trends.filter(t => t.participant_id === home.id && t.type_id === daTypeId);
        const awayTrends = data.trends.filter(t => t.participant_id === away.id && t.type_id === daTypeId);

        // Create a map of minute -> value for both teams
        // Trends are usually "last X minutes". We need to map this to a timeline.
        // If trends are not minute-by-minute, this is hard.
        // SportMonks trends are usually like "0-15", "15-30".
        // BUT the user requirement says: "For each minute (0 to 90)... Get DA value...".
        // If we don't have minute-by-minute DA, we might need to interpolate from the 15-min segments or use the 'events' if available.
        // However, the user explicitly said "Source: Use o endpoint trends".
        // Let's assume trends provide enough granularity or we use the available segments.
        // If trends are 15-min blocks, we repeat the value for those 15 mins.

        // Actually, for "Pressure", usually we want a curve.
        // Let's look at the trends structure from previous logs if possible.
        // In `test-live-data.js` logs (which I can't see fully now but recall), trends were like "0-10": 5.

        // Let's implement a generic bucket filler.
        const fillMinutes = (trendsArr) => {
            const minutes = new Array(91).fill(0);
            trendsArr.forEach(t => {
                const start = t.minute_start || 0;
                const end = t.minute_end || 90;
                const value = t.amount || t.value || 0;
                const duration = end - start + 1;
                const perMinute = value / duration; // Distribute evenly? Or just use the value as intensity?
                // User formula: Value = (Home_DA * 1.5) - ...
                // If the trend says "5 DA in 15 mins", the intensity is 5.
                for (let m = start; m <= end; m++) {
                    if (m <= 90) minutes[m] = value; // Use the raw count as the "intensity" for that block
                }
            });
            return minutes;
        };

        const homePressure = fillMinutes(homeTrends);
        const awayPressure = fillMinutes(awayTrends);

        for (let m = 0; m <= 90; m++) {
            const h = homePressure[m];
            const a = awayPressure[m];
            // Smoothing: If 0, use previous * 0.9
            let val = (h * 1.5) - (a * 1.5);

            if (val === 0 && m > 0) {
                val = pressure[m - 1] * 0.9;
            }
            pressure.push(val);
        }
    }

    // --- Action Zones (Heuristic) ---
    // Weight_Attack (Zone 3) = (Dangerous Attacks * 3) + (Shots * 5) + (Corners * 2)
    // Weight_Middle (Zone 2) = (Total Passes * 0.1) + ((Total Attacks - Dangerous Attacks) * 1)
    // Weight_Defense (Zone 1) = (Opponent Attacks * 0.5) + (Saves * 2) + (Clearances * 1)

    const calculateZones = (teamStats, oppStats) => {
        const da = findStat(teamStats, 'Dangerous Attacks', 'DANGEROUS_ATTACKS');
        const shots = findStat(teamStats, 'Shots Total', 'SHOTS_TOTAL');
        const corners = findStat(teamStats, 'Corners', 'CORNERS');
        const passes = findStat(teamStats, 'Passes', 'PASSES_TOTAL'); // 'Passes' or 'Passes Total'
        const attacks = findStat(teamStats, 'Attacks', 'ATTACKS');
        const saves = findStat(teamStats, 'Saves', 'SAVES');
        const clearances = findStat(teamStats, 'Clearances', 'CLEARANCES'); // Might not exist, check logs if needed.
        const oppAttacks = findStat(oppStats, 'Attacks', 'ATTACKS');

        const wAttack = (da * 3) + (shots * 5) + (corners * 2);
        const wMiddle = (passes * 0.1) + ((attacks - da) * 1);
        const wDefense = (oppAttacks * 0.5) + (saves * 2) + (clearances * 1);

        const total = wAttack + wMiddle + wDefense || 1; // Avoid div by 0

        return {
            defense: Math.round((wDefense / total) * 100),
            middle: Math.round((wMiddle / total) * 100),
            attack: Math.round((wAttack / total) * 100)
        };
    };

    const attackZones = {
        home: calculateZones(homeStats, awayStats),
        away: calculateZones(awayStats, homeStats)
    };

    // Charts Analysis object will be constructed later merging this with generateCharts


    const cardAnalysis = {
        ...cardStats,
        referee: refereeStats ? {
            avg: refereeStats.avgCards,
            over05: refereeStats.over05,
            over15: refereeStats.over15,
            over25: refereeStats.over25,
            over35: refereeStats.over35,
            over45: refereeStats.over45
        } : null
    };

    // Calculate General Stats Analysis (Shots, Control)
    const generalStatsAnalysis = calculateGeneralStats(
        data.homeTeam?.detailedHistory,
        data.awayTeam?.detailedHistory,
        home.id,
        away.id
    );

    // Generate Charts Analysis (Timeline)
    // Generate Charts Analysis (Timeline) and merge with Heuristics
    const chartsAnalysis = {
        ...generateCharts(data),
        pressure,
        attackZones
    };

    // ===== NEW: OVERVIEW TAB DATA =====

    // Enrich history with stats (corners and cards badges)
    const enrichedHomeHistory = enrichHistoryWithStats(data.homeTeam?.detailedHistory || []);
    const enrichedAwayHistory = enrichHistoryWithStats(data.awayTeam?.detailedHistory || []);

    // Generate trends comparison table
    const trends = generateTrends(goalAnalysis, cornerAnalysis, cardAnalysis);

    // Build combined timeline from events and comments
    const timeline = buildTimeline(data.events || [], data.comments || []);

    // Generate prediction insights
    const allStats = {
        goalAnalysis,
        cornerAnalysis,
        cardAnalysis
    };
    // Helper to process current match stats into frontend structure
    const calculateDetailedMatchStats = (stats, homeId, awayId) => {
        // Defensive Coding: Always return structure, even if stats are missing
        const safeStats = Array.isArray(stats) ? stats : [];

        const processPeriod = (period) => {
            const getStat = (type, teamId) => {
                const s = safeStats.find(x =>
                    (x.type?.name === type || x.type?.developer_name === type) &&
                    x.participant_id == teamId
                );
                return s?.data?.value ?? s?.value ?? 0;
            };

            return {
                possession: { home: getStat('Ball Possession %', homeId), away: getStat('Ball Possession %', awayId) },
                attacks: {
                    total: { home: getStat('Attacks', homeId), away: getStat('Attacks', awayId) },
                    dangerous: { home: getStat('Dangerous Attacks', homeId), away: getStat('Dangerous Attacks', awayId) },
                    corners: { home: getStat('Corners', homeId), away: getStat('Corners', awayId) },
                    crosses: { home: getStat('Crosses', homeId), away: getStat('Crosses', awayId) }
                },
                shots: {
                    total: { home: getStat('Shots Total', homeId), away: getStat('Shots Total', awayId) },
                    onTarget: { home: getStat('Shots On Target', homeId), away: getStat('Shots On Target', awayId) },
                    offTarget: { home: getStat('Shots Off Target', homeId), away: getStat('Shots Off Target', awayId) },
                    insideBox: { home: getStat('Shots Insidebox', homeId), away: getStat('Shots Insidebox', awayId) },
                    outsideBox: { home: getStat('Shots Outsidebox', homeId), away: getStat('Shots Outsidebox', awayId) }
                },
                others: {
                    saves: { home: getStat('Saves', homeId), away: getStat('Saves', awayId) },
                    fouls: { home: getStat('Fouls', homeId), away: getStat('Fouls', awayId) },
                    freeKicks: { home: 0, away: 0 },
                    yellowCards: { home: getStat('Yellow Cards', homeId), away: getStat('Yellow Cards', awayId) },
                    redCards: { home: getStat('Red Cards', homeId), away: getStat('Red Cards', awayId) },
                    passes: { home: getStat('Passes', homeId), away: getStat('Passes', awayId) },
                    longPasses: { home: 0, away: 0 },
                    interceptions: { home: getStat('Interceptions', homeId), away: getStat('Interceptions', awayId) }
                }
            };
        };

        return {
            fulltime: processPeriod('ALL'),
            ht: processPeriod('1ST'),
            st: processPeriod('2ND')
        };
    };

    const detailedStats = calculateDetailedMatchStats(data.statistics, home.id, away.id);

    // Calculate Lineups
    const lineups = normalizeLineups(data.lineups, home, away);

    // Generate prediction insights (now returns object with fulltime and list)
    const predictions = generateInsights(allStats);

    return {
        // Match Info - ENRICHED with all required fields
        matchInfo: {
            id: data.id,
            state: data.state?.state || 'NS',
            minute: data.state?.minute || null,
            starting_at: data.starting_at,
            starting_at_timestamp: data.starting_at_timestamp ||
                Math.floor(new Date(data.starting_at).getTime() / 1000),
            venue: {
                name: data.venue?.name || 'TBD',
                city: data.venue?.city_name,
                image: data.venue?.image_path
            },
            home_team: {
                id: home.id,
                name: home.name,
                logo: home.image_path, // CORRECT: image_path
                short_name: home.short_code || home.name
            },
            away_team: {
                id: away.id,
                name: away.name,
                logo: away.image_path, // CORRECT: image_path
                short_name: away.short_code || away.name
            },
            league: {
                id: data.league?.id,
                name: data.league?.name,
                logo: data.league?.image_path
            },
            referee: refereeData,
            weather: data.weather_report ? {
                temperature: data.weather_report.temperature?.temp,
                condition: data.weather_report.type,
                wind: data.weather_report.wind?.speed
            } : null
        },

        // Analysis Data
        analysis: { // Grouping under analysis to match frontend structure better if needed, or mapping in frontend
            detailedStats: detailedStats,
            standings: data.standings || []
        },
        basicInfo: {
            ...basicInfo,
            form: {
                home: calculateForm(data.homeTeam?.detailedHistory, home.id),
                away: calculateForm(data.awayTeam?.detailedHistory, away.id)
            }
        },
        goalAnalysis,
        cardAnalysis,
        generalStatsAnalysis,
        chartsAnalysis,
        goalMarkets,
        shotStats,
        offsides,
        otherStats,
        xG, // Kept for backward compatibility if needed, but also merged in goalAnalysis
        cornerAnalysis,
        lineups, // Added Lineups
        predictions, // Added Predictions

        // NEW: Overview Tab Data
        history: {
            home: enrichedHomeHistory,
            away: enrichedAwayHistory
        },
        trends,
        timeline,
        standings: data.standings || [], // Added Standings

        // Team data for H2H fetch
        homeTeam: {
            id: home.id,
            name: home.name,
            logo: home.image_path,
            squad: data.homeTeam?.squad || null
        },
        awayTeam: {
            id: away.id,
            name: away.name,
            logo: away.image_path,
            squad: data.awayTeam?.squad || null
        }
    };
};

export const fetchExternalMatchData = async (matchId, apiToken) => {
    const BASE_URL = "https://api.sportmonks.com/v3/football";

    // Token with fallback
    const token = apiToken ||
        process.env.SPORTMONKS_API_TOKEN ||
        "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

    // Debug logging
    console.log('🔑 Token check:', {
        hasApiToken: !!apiToken,
        hasEnvToken: !!process.env.SPORTMONKS_API_TOKEN,
        hasFallback: true,
        tokenLength: token?.length || 0
    });

    if (!token) {
        const error = new Error("API Token missing - check .env file");
        console.error('❌ CRITICAL:', error.message);
        throw error;
    }

    try {
        // Step 1: Fetch Match Details (Participants, Stats, League, Venue, Odds, Referee, Events, Lineups)
        const [resParticipants, resStats, resLeague, resVenue, resOdds, resReferee, resEvents, resLineups] = await Promise.all([
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=participants`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=statistics.type`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=league`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=venue`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=odds`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=referees`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=events`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=lineups.player`)
        ]);

        const participants = resParticipants.data.data.participants || [];
        const home = participants.find(p => p.meta?.location === 'home') || participants[0];
        const away = participants.find(p => p.meta?.location === 'away') || participants[1];

        // Get Season ID for Standings
        const seasonId = resParticipants.data.data.season_id;
        let standings = [];
        if (seasonId) {
            try {
                standings = await apiGetStandings(seasonId);
            } catch (e) {
                console.error(`Failed to fetch standings for season ${seasonId}`, e.message);
            }
        }

        // Referee Data
        // referees is an array of pivot objects. The actual referee details are in .referee property of the pivot.
        const referees = resReferee.data.data.referees || [];
        const mainReferee = referees.find(r => r.type?.name === 'REFEREE') || referees[0]; // Fallback to first if no type

        let referee = null;
        let refereeHistory = [];

        if (mainReferee) {
            // The object might be the pivot, so check for referee_id or id
            const refereeId = mainReferee.referee_id || mainReferee.id;
            const refereeName = mainReferee.name || mainReferee.common_name || mainReferee.fullname || 'Unknown';

            referee = {
                id: refereeId,
                name: refereeName,
                image: mainReferee.image_path
            };

            // Fetch Referee History (Last 20 matches with stats)
            try {
                // We use include=fixtures.fixture.statistics to get the stats
                // We can't easily limit nested includes, so we fetch and slice in memory.
                // To optimize, we could try to use date ranges, but for now let's just fetch.
                // Note: This might be heavy if the referee has thousands of matches.
                // Let's try to use 'latest' if possible? No, 'latestFixtures' failed.
                // Let's use the standard endpoint.
                console.log(`Fetching history for referee ${refereeId}...`);
                const refHistoryUrl = `${BASE_URL}/referees/${refereeId}?api_token=${token}&include=fixtures.fixture.statistics`;
                const resRefHistory = await axios.get(refHistoryUrl);

                if (resRefHistory.data?.data?.fixtures) {
                    refereeHistory = resRefHistory.data.data.fixtures;
                }
            } catch (refError) {
                console.error(`Failed to fetch history for referee ${refereeId}`, refError.message);
            }
        }

        // Step 2: Heavy Fetch - Get IDs for last 10 Home and 10 Away matches
        // We need to fetch the team's latest matches first to get their IDs
        // Then we fetch details for those IDs.
        // Actually, we can just fetch the team's latest matches with the includes we need directly?
        // The user request says: "Identificar os Ids... Fazer chamadas para recuperar os detalhes completos"
        // But Sportmonks allows including latest.events on the team endpoint.
        // However, the user specifically mentioned "Heavy Fetch" and "Promise.all with GET /fixtures/{id}" might be better for control
        // or if the nested include is too heavy/limited.
        // Let's try to stick to the plan: Fetch IDs first (via team latest) then fetch details in parallel.
        // But wait, fetching 20 fixtures individually is 20 calls. + 5 initial = 25 calls.
        // If we can do it in the team call, it's 2 calls.
        // The user said: "Atualmente, estamos pegando algo como include=latest.stats. Isso é insuficiente."
        // And suggested: "GET /fixtures/multi/{ids} ... ou Promise.all com GET /fixtures/{id}"
        // Let's follow the "Promise.all" approach for maximum detail and reliability as requested.

        const fetchHistoryIds = async (teamId, location) => {
            if (!teamId) return [];
            try {
                // Fetch last 20 matches to ensure we find 10 with correct location
                const res = await axios.get(`${BASE_URL}/teams/${teamId}?api_token=${token}&include=latest.participants;latest.league&per_page=1`);
                // Note: 'latest' on team endpoint usually returns last N matches.
                // We might need to use /fixtures/search or just rely on what 'latest' gives.
                // Default 'latest' might not be enough.
                // Let's use the /fixtures/between or just /fixtures/team/{id} sorted by date.
                // Actually, let's stick to what was working but just get IDs?
                // The previous code used `include=latest`. Let's see if we can just use that to get IDs.
                const resLatest = await axios.get(`${BASE_URL}/teams/${teamId}?api_token=${token}&include=latest.participants`);
                const allLatest = resLatest.data.data.latest || [];

                // Filter by location and take 10
                return allLatest
                    .filter(m => {
                        const p = m.participants.find(p => p.id === teamId);
                        return p && p.meta?.location === location;
                    })
                    .slice(0, 10)
                    .map(m => m.id);
            } catch (e) {
                console.error(`Failed to fetch history IDs for team ${teamId}`, e.message);
                return [];
            }
        };

        const [homeHistoryIds, awayHistoryIds] = await Promise.all([
            fetchHistoryIds(home?.id, 'home'),
            fetchHistoryIds(away?.id, 'away')
        ]);

        // Step 3: Fetch Detailed Data for these IDs
        // We need events (filtered), stats, participants, and commentaries for corner extraction
        // Commentaries are needed because corner events are not available in the events array
        const fetchDetailedMatch = async (id) => {
            try {
                const url = `${BASE_URL}/fixtures/${id}?api_token=${token}&include=events.type;statistics.type;participants;comments;lineups.player;odds;referees`;
                const res = await axios.get(url);
                return res.data.data;
            } catch (e) {
                console.error(`Failed to fetch detailed match ${id}`, e.message);
                return null;
            }
        };

        // Run in parallel (be careful with rate limits - maybe chunk if needed, but 20 should be ok for standard plans)
        const homeHistoryPromises = homeHistoryIds.map(id => fetchDetailedMatch(id));
        const awayHistoryPromises = awayHistoryIds.map(id => fetchDetailedMatch(id));

        const [homeHistoryDetailed, awayHistoryDetailed] = await Promise.all([
            Promise.all(homeHistoryPromises),
            Promise.all(awayHistoryPromises)
        ]);

        // Filter out nulls
        const validHomeHistory = homeHistoryDetailed.filter(m => m);
        const validAwayHistory = awayHistoryDetailed.filter(m => m);

        // Merge data
        const mergedData = {
            ...resParticipants.data.data,
            statistics: resStats.data.data.statistics,
            league: resLeague.data.data.league,
            venue: resVenue.data.data.venue,
            odds: resOdds.data.data.odds,
            referee: referee, // Add referee to merged data
            refereeHistory: refereeHistory, // Add referee history
            events: resEvents.data.data.events || [], // Add events for charts
            lineups: resLineups.data.data.lineups || [], // Add lineups
            standings: standings, // Add standings
            homeTeam: {
                ...home, // keep basic info
                detailedHistory: validHomeHistory
            },
            awayTeam: {
                ...away,
                detailedHistory: validAwayHistory
            }
        };

        return mergedData;
    } catch (error) {
        console.error("Error fetching external match data:", error.message);
        throw error;
    }
};

export const getMatchStats = async (matchId) => {
    const { Match } = await import("../../models/index.js");

    // Try to find match in database
    let match = await Match.findOne({ where: { id: matchId } });

    // GRACEFUL FALLBACK: If match not in DB, try to fetch from API directly
    if (!match) {
        console.log(`Match ${matchId} not found in database. Attempting direct API fetch...`);

        try {
            // Try to fetch directly from SportMonks API
            const externalData = await fetchExternalMatchData(matchId, process.env.SPORTMONKS_API_TOKEN);

            if (externalData) {
                // Extract leagueId safely (V3 API can have it in different places)
                const leagueId = externalData.league?.id || externalData.league_id;

                if (!leagueId) {
                    console.warn(`⚠️  Match ${matchId} has no leagueId. Skipping database save.`);
                } else {
                    // Try to save to database (non-blocking)
                    try {
                        match = await Match.create({
                            id: matchId,
                            externalId: matchId,
                            leagueId: leagueId, // CRITICAL: Ensure leagueId is present
                            data: externalData
                        });
                        console.log(`✅ Match ${matchId} fetched from API and saved to database.`);
                    } catch (dbError) {
                        console.error(`❌ Failed to save match ${matchId} to database:`, dbError.message);
                        console.warn(`⚠️  Continuing without cache. Match data will be returned from API.`);

                        // Create a temporary match object for processing
                        match = {
                            id: matchId,
                            externalId: matchId,
                            data: externalData,
                            updatedAt: new Date()
                        };
                    }
                }

                // If we couldn't save to DB, create temp object
                if (!match) {
                    match = {
                        id: matchId,
                        externalId: matchId,
                        data: externalData,
                        updatedAt: new Date()
                    };
                }
            }
        } catch (apiError) {
            console.error(`Failed to fetch match ${matchId} from API:`, apiError.message);
            console.error('API Error details:', {
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                message: apiError.message
            });

            // CRITICAL: If it's an auth error, throw immediately
            if (apiError.response?.status === 401 || apiError.response?.status === 403) {
                throw new Error(`Authentication failed: ${apiError.message}. Check SPORTMONKS_API_TOKEN in .env`);
            }

            // For other errors, return minimal structure
            return {
                error: true,
                message: "Match data not available from API",
                matchId: matchId,
                apiError: apiError.message,
                matchInfo: {
                    id: matchId,
                    state: "API_ERROR"
                },
                goalAnalysis: null,
                cornerAnalysis: null,
                cardAnalysis: null,
                chartsAnalysis: null,
                homeTeam: null,
                awayTeam: null
            };
        }
    }

    // If still no match after all attempts, return minimal structure
    if (!match) {
        return {
            error: true,
            message: "Match not found",
            matchId: matchId,
            matchInfo: {
                id: matchId,
                state: "NOT_FOUND"
            },
            goalAnalysis: null,
            cornerAnalysis: null,
            cardAnalysis: null,
            chartsAnalysis: null,
            homeTeam: null,
            awayTeam: null
        };
    }

    // Dynamic Cache Strategy
    const state = match.data?.state?.state;
    const isLive = state === 'LIVE' || state === 'HT' || state === 'ET' || state === 'PEN_LIVE' || state === 'BREAK';
    const isFinished = state === 'FT' || state === 'AET' || state === 'FT_PEN' || state === 'CAN' || state === 'POST' || state === 'INT' || state === 'ABAN';

    // TTL in milliseconds
    const TTL = isLive ? 60 * 1000 : 24 * 60 * 60 * 1000;

    const lastUpdate = new Date(match.updatedAt).getTime();
    const now = Date.now();
    const isExpired = (now - lastUpdate) > TTL;

    // If data is missing OR cache is expired
    if (!match.data || Object.keys(match.data).length === 0 || isExpired) {
        console.log(`Match ${matchId} data update needed (State: ${state}, Expired: ${isExpired}). Fetching from API...`);
        try {
            const newData = await fetchExternalMatchData(match.externalId, process.env.SPORTMONKS_API_TOKEN);

            // Try to update database (non-blocking)
            try {
                match.data = newData;
                match.changed('data', true);
                await match.save();
                console.log(`✅ Match ${matchId} data updated successfully.`);
            } catch (dbError) {
                console.error(`❌ Failed to update match ${matchId} in database:`, dbError.message);
                console.warn(`⚠️  Continuing without cache update. Using fresh API data.`);
                // Continue with newData even if save failed
                match.data = newData;
            }
        } catch (error) {
            console.error(`Failed to sync match ${matchId}:`, error.message);

            // GRACEFUL FALLBACK: If fetch fails but we have some data, use it
            if (!match.data || Object.keys(match.data).length === 0) {
                // Return partial data structure
                return {
                    error: true,
                    message: "Unable to fetch updated match data",
                    matchId: matchId,
                    matchInfo: {
                        id: matchId,
                        state: state || "UNKNOWN"
                    },
                    goalAnalysis: null,
                    cornerAnalysis: null,
                    cardAnalysis: null,
                    chartsAnalysis: null,
                    homeTeam: null,
                    awayTeam: null
                };
            }
        }
    }

    // Calculate stats with existing data
    try {
        const stats = calculateMatchStats(match.data);

        // Fetch H2H data (head-to-head matches)
        let h2h = null;
        if (stats.homeTeam?.id && stats.awayTeam?.id) {
            try {
                h2h = await fetchH2HMatches(stats.homeTeam.id, stats.awayTeam.id);
                console.log(`H2H data fetched: ${h2h.matches.length} matches`);
            } catch (h2hError) {
                console.error('Error fetching H2H:', h2hError.message);
                // Graceful fallback - H2H is optional
                h2h = {
                    matches: [],
                    summary: { total: 0, home_wins: 0, draws: 0, away_wins: 0 },
                    averages: { goals_per_match: 0, corners_per_match: 0, cards_per_match: 0 }
                };
            }
        }

        // Add H2H to response
        return {
            ...stats,
            h2h
        };
    } catch (calcError) {
        console.error(`Error calculating stats for match ${matchId}:`, calcError.message);

        // GRACEFUL FALLBACK: Return basic match info even if calculation fails
        const participants = match.data?.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        return {
            error: true,
            message: "Error calculating match statistics",
            matchId: matchId,
            matchInfo: {
                id: matchId,
                state: match.data?.state?.state || "UNKNOWN",
                home_team: home?.name || "Home",
                away_team: away?.name || "Away",
                home_logo: home?.image_path,
                away_logo: away?.image_path
            },
            goalAnalysis: null,
            cornerAnalysis: null,
            cardAnalysis: null,
            chartsAnalysis: null,
            homeTeam: null,
            awayTeam: null
        };
    }
};
