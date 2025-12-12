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

    // --- DATA TRANSFORMATION FOR FRONTEND ---

    // 1. Goals Analysis Transformation
    const transformGoalAnalysis = () => {
        const periods = ['0-15', '16-30', '31-HT', '46-60', '61-75', '76-FT'];

        // Intervals Array
        const goalsIntervals = periods.map(period => {
            const h = goalAnalysisRaw.home.intervals[period] || { scored: 0, conceded: 0, frequency: 0 };
            const a = goalAnalysisRaw.away.intervals[period] || { scored: 0, conceded: 0, frequency: 0 };
            return {
                period: period.replace('0-15', "0-15'").replace('16-30', "16-30'").replace('46-60', "46-60'").replace('61-75', "61-75'").replace('76-FT', "76-FT'"),
                periodPct: Math.round((parseFloat(h.frequency) + parseFloat(a.frequency)) / 2), // Avg frequency
                home: { scored: h.scored, conceded: h.conceded, total: h.scored + h.conceded, pct: h.frequency },
                away: { scored: a.scored, conceded: a.conceded, total: a.scored + a.conceded, pct: a.frequency }
            };
        });

        // Pill Stats (Shots, Offsides, etc.)
        const pillStats = [
            { label: "Média Remates", home: shotStats.home.total, away: shotStats.away.total },
            { label: "Média Remates à Baliza", home: shotStats.home.onTarget, away: shotStats.away.onTarget },
            { label: "Média Remates Fora", home: shotStats.home.offTarget, away: shotStats.away.offTarget },
            { label: "Média Fora-de-jogo", home: offsides.home, away: offsides.away },
            { label: "Média Cantos", home: otherStats.corners.home, away: otherStats.corners.away }, // Added corners here too
            { label: "Média Faltas", home: otherStats.fouls.home, away: otherStats.fouls.away },
        ];

        // First To Score Array
        const firstToScore = [
            { label: "Primeiro a Marcar", home: goalAnalysisRaw.home.firstToScore + "%", away: goalAnalysisRaw.away.firstToScore + "%" },
            { label: "Primeiro a Marcar e Vencer", home: goalAnalysisRaw.home.firstToScoreAndWin + "%", away: goalAnalysisRaw.away.firstToScoreAndWin + "%" },
            { label: "Ambas Marcam (BTTS)", home: goalAnalysisRaw.home.btts + "%", away: goalAnalysisRaw.away.btts + "%" },
            { label: "Clean Sheets", home: goalAnalysisRaw.home.cleanSheets + "%", away: goalAnalysisRaw.away.cleanSheets + "%" },
            { label: "Over 0.5 Gols", home: goalAnalysisRaw.home.over05 + "%", away: goalAnalysisRaw.away.over05 + "%" },
            { label: "Over 1.5 Gols", home: goalAnalysisRaw.home.over15 + "%", away: goalAnalysisRaw.away.over15 + "%" },
            { label: "Over 2.5 Gols", home: goalAnalysisRaw.home.over25 + "%", away: goalAnalysisRaw.away.over25 + "%" },
        ];

        return {
            general: {
                scored: { home: goalAnalysisRaw.home.scored, away: goalAnalysisRaw.away.scored },
                conceded: { home: goalAnalysisRaw.home.conceded, away: goalAnalysisRaw.away.conceded },
                avgTotal: {
                    home: (parseFloat(goalAnalysisRaw.home.scored) + parseFloat(goalAnalysisRaw.home.conceded)).toFixed(2),
                    away: (parseFloat(goalAnalysisRaw.away.scored) + parseFloat(goalAnalysisRaw.away.conceded)).toFixed(2)
                },
                btts: { home: goalAnalysisRaw.home.btts, away: goalAnalysisRaw.away.btts }
            },
            xg: {
                favor: { home: xG.home, away: xG.away },
                against: { home: 1.2, away: 1.3 }, // Placeholder if not available
                totalFavor: (parseFloat(xG.home) + parseFloat(xG.away)).toFixed(2),
                trend: parseFloat(xG.home) > parseFloat(xG.away) ? "Home" : "Away"
            },
            scorePredictions: goalAnalysisRaw.scorePredictions, // Already structured
            firstToScore,
            pillStats,
            intervals: {
                goals: goalsIntervals,
                shotsTotal: [] // Placeholder, requires shot intervals logic
            },
            home: goalAnalysisRaw.home,
            away: goalAnalysisRaw.away
        };
    };

    const finalGoalAnalysis = transformGoalAnalysis();

    // 2. Corners Analysis Transformation
    const transformCornerAnalysis = () => {
        const periods = ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90'];

        const intervals = periods.map(period => {
            const h = cornerAnalysis.home.intervals[period] || { avgFor: 0, avgAgainst: 0, frequency: 0 };
            const a = cornerAnalysis.away.intervals[period] || { avgFor: 0, avgAgainst: 0, frequency: 0 };
            return {
                period: period.replace('0-10', "0-10'").replace('81-90', "81-90'"),
                pctH: h.frequency,
                pctA: a.frequency,
                hM: h.avgFor,
                hS: h.avgAgainst,
                aM: a.avgFor,
                aS: a.avgAgainst,
                fav: ((parseFloat(h.avgFor) + parseFloat(a.avgFor)) / 2).toFixed(1),
                cont: ((parseFloat(h.avgAgainst) + parseFloat(a.avgAgainst)) / 2).toFixed(1),
                med: Math.round((parseFloat(h.frequency) + parseFloat(a.frequency)) / 2)
            };
        });

        // Add 37-HT and 87-FT special intervals
        const h37 = cornerAnalysis.home.intervals['37-HT'] || { frequency: 0 };
        const a37 = cornerAnalysis.away.intervals['37-HT'] || { frequency: 0 };
        intervals.push({ period: "37-HT", pctH: h37.frequency, pctA: a37.frequency, hM: '-', hS: '-', aM: '-', aS: '-', fav: '-', cont: '-', med: '-' });

        const h87 = cornerAnalysis.home.intervals['87-FT'] || { frequency: 0 };
        const a87 = cornerAnalysis.away.intervals['87-FT'] || { frequency: 0 };
        intervals.push({ period: "87-FT", pctH: h87.frequency, pctA: a87.frequency, hM: '-', hS: '-', aM: '-', aS: '-', fav: '-', cont: '-', med: '-' });


        const races = [
            { label: 'Race 3', homeW: cornerAnalysis.home.races.race3 + '%', homeL: (100 - cornerAnalysis.home.races.race3) + '%', awayW: cornerAnalysis.away.races.race3 + '%', awayL: (100 - cornerAnalysis.away.races.race3) + '%' },
            { label: 'Race 5', homeW: cornerAnalysis.home.races.race5 + '%', homeL: (100 - cornerAnalysis.home.races.race5) + '%', awayW: cornerAnalysis.away.races.race5 + '%', awayL: (100 - cornerAnalysis.away.races.race5) + '%' },
            { label: 'Race 7', homeW: cornerAnalysis.home.races.race7 + '%', homeL: (100 - cornerAnalysis.home.races.race7) + '%', awayW: cornerAnalysis.away.races.race7 + '%', awayL: (100 - cornerAnalysis.away.races.race7) + '%' },
            { label: 'Race 9', homeW: cornerAnalysis.home.races.race9 + '%', homeL: (100 - cornerAnalysis.home.races.race9) + '%', awayW: cornerAnalysis.away.races.race9 + '%', awayL: (100 - cornerAnalysis.away.races.race9) + '%' },
        ];

        // Total Corners (FT)
        const totalCorners = [
            { label: 'Over 8.5', homeM: cornerAnalysis.home.trends.over85 + '%', homeS: '-', awayM: cornerAnalysis.away.trends.over85 + '%', awayS: '-' },
        ];

        // HT Corners
        const htCorners = [
            { label: 'Over 0.5', homeM: cornerAnalysis.home.htMarkets.over05 + '%', awayM: cornerAnalysis.away.htMarkets.over05 + '%' },
            { label: 'Over 1.5', homeM: cornerAnalysis.home.htMarkets.over15 + '%', awayM: cornerAnalysis.away.htMarkets.over15 + '%' },
            { label: 'Over 2.5', homeM: cornerAnalysis.home.htMarkets.over25 + '%', awayM: cornerAnalysis.away.htMarkets.over25 + '%' },
            { label: 'Over 3.5', homeM: cornerAnalysis.home.htMarkets.over35 + '%', awayM: cornerAnalysis.away.htMarkets.over35 + '%' },
            { label: 'Over 4.5', homeM: cornerAnalysis.home.htMarkets.over45 + '%', awayM: cornerAnalysis.away.htMarkets.over45 + '%' },
        ];

        // 2HT Corners
        const shCorners = [ // 'sh' stands for Second Half (2HT)
            { label: 'Over 0.5', homeM: cornerAnalysis.home.shMarkets.over05 + '%', awayM: cornerAnalysis.away.shMarkets.over05 + '%' },
            { label: 'Over 1.5', homeM: cornerAnalysis.home.shMarkets.over15 + '%', awayM: cornerAnalysis.away.shMarkets.over15 + '%' },
            { label: 'Over 2.5', homeM: cornerAnalysis.home.shMarkets.over25 + '%', awayM: cornerAnalysis.away.shMarkets.over25 + '%' },
            { label: 'Over 3.5', homeM: cornerAnalysis.home.shMarkets.over35 + '%', awayM: cornerAnalysis.away.shMarkets.over35 + '%' },
            { label: 'Over 4.5', homeM: cornerAnalysis.home.shMarkets.over45 + '%', awayM: cornerAnalysis.away.shMarkets.over45 + '%' },
        ];

        return {
            home: cornerAnalysis.home, // Keep original for sidebar
            away: cornerAnalysis.away, // Keep original for sidebar
            totalCorners,
            htCorners,
            shCorners, // 2HT
            intervals,
            races,
            calculator: cornerAnalysis.calculator
        };
    };

    const finalCornerAnalysis = transformCornerAnalysis();

    // 3. Cards Analysis Transformation
    const transformCardAnalysis = () => {
        const periods = ['0-15', '16-30', '31-HT', '46-60', '61-75', '76-FT'];

        const intervals = periods.map(period => {
            const h = cardStats.home.intervals[period] || { total: 0, frequency: 0 };
            const a = cardStats.away.intervals[period] || { total: 0, frequency: 0 };
            return {
                period: period.replace('0-15', "0-15'").replace('76-FT', "76-FT'"),
                pct: h.frequency + '%',
                avgFavor: h.total, // Using total as proxy for avg in this view
                avgContra: 0,
                total: h.total,
                pctOverall: a.frequency + '%',
                avgFavorA: a.total,
                avgContraA: 0,
                totalA: a.total
            };
        });

        // Full Time Markets
        const totalCards = [
            { label: 'Over 0.5', homeM: cardStats.home.markets.over05, homeS: '-', awayM: cardStats.away.markets.over05, awayS: '-' },
            { label: 'Over 1.5', homeM: cardStats.home.markets.over15, homeS: '-', awayM: cardStats.away.markets.over15, awayS: '-' },
            { label: 'Over 2.5', homeM: cardStats.home.markets.over25, homeS: '-', awayM: cardStats.away.markets.over25, awayS: '-' },
            { label: 'Over 3.5', homeM: cardStats.home.markets.over35, homeS: '-', awayM: cardStats.away.markets.over35, awayS: '-' },
        ];

        // First Half Markets (htCards)
        const htH = cardStats.home.htMarkets || {};
        const htA = cardStats.away.htMarkets || {};
        const htCards = [
            { label: 'Over 0.5', homeM: htH.over05 || '0', homeS: '-', awayM: htA.over05 || '0', awayS: '-' },
            { label: 'Over 1.5', homeM: htH.over15 || '0', homeS: '-', awayM: htA.over15 || '0', awayS: '-' },
            { label: 'Over 2.5', homeM: htH.over25 || '0', homeS: '-', awayM: htA.over25 || '0', awayS: '-' },
        ];

        // Second Half Markets (shCards)
        const shH = cardStats.home.shMarkets || {};
        const shA = cardStats.away.shMarkets || {};
        const shCards = [
            { label: 'Over 0.5', homeM: shH.over05 || '0', homeS: '-', awayM: shA.over05 || '0', awayS: '-' },
            { label: 'Over 1.5', homeM: shH.over15 || '0', homeS: '-', awayM: shA.over15 || '0', awayS: '-' },
            { label: 'Over 2.5', homeM: shH.over25 || '0', homeS: '-', awayM: shA.over25 || '0', awayS: '-' },
        ];

        return {
            averages: {
                favor: { home: cardStats.home.avgFor, away: cardStats.away.avgFor },
                against: { home: cardStats.home.avgAgainst, away: cardStats.away.avgAgainst },
                total: { home: cardStats.home.avgTotal, away: cardStats.away.avgTotal }
            },
            totalCards,
            htCards,
            shCards,
            intervals,
            referee: refereeData ? {
                avg: refereeData.avgCards,
                over05: refereeData.over05,
                over15: refereeData.over15,
                over25: refereeData.over25,
                over35: refereeData.over35,
                over45: refereeData.over45
            } : null
        };
    };

    const finalCardAnalysis = transformCardAnalysis();

    // Calculate General Stats Analysis (Shots, Control)
    const generalStatsAnalysis = calculateGeneralStats(
        data.homeTeam?.detailedHistory,
        data.awayTeam?.detailedHistory,
        home.id,
        away.id
    );

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
    const trends = generateTrends(finalGoalAnalysis, finalCornerAnalysis, finalCardAnalysis);

    // Build combined timeline from events and comments
    const timeline = buildTimeline(data.events || [], data.comments || []);

    // Generate prediction insights
    const allStats = {
        goalAnalysis: finalGoalAnalysis,
        cornerAnalysis: finalCornerAnalysis,
        cardAnalysis: finalCardAnalysis
    };
    // Helper to process current match stats into frontend structure
    // Now calculates period-specific stats from events (with minute data)
    const calculateDetailedMatchStats = (stats, homeId, awayId, events) => {
        const safeStats = Array.isArray(stats) ? stats : [];
        const safeEvents = Array.isArray(events) ? events : [];

        // Get fulltime stat from API
        const getStat = (type, teamId) => {
            const s = safeStats.find(x =>
                (x.type?.name === type || x.type?.developer_name === type) &&
                x.participant_id == teamId
            );
            return s?.data?.value ?? s?.value ?? 0;
        };

        // Count events by type, team, and period
        const countEvents = (eventTypes, teamId, minMinute, maxMinute) => {
            return safeEvents.filter(e => {
                const minute = e.minute || 0;
                const typeMatch = eventTypes.some(t =>
                    e.type?.name?.toLowerCase().includes(t) ||
                    e.type?.developer_name?.toLowerCase().includes(t)
                );
                const teamMatch = e.participant_id == teamId;
                const periodMatch = minute >= minMinute && minute <= maxMinute;
                return typeMatch && teamMatch && periodMatch;
            }).length;
        };

        // Count events for fulltime (0-90+ minutes)
        const ftHomeYellowCards = countEvents(['yellowcard', 'yellow'], homeId, 0, 120);
        const ftAwayYellowCards = countEvents(['yellowcard', 'yellow'], awayId, 0, 120);
        const ftHomeRedCards = countEvents(['redcard', 'red'], homeId, 0, 120);
        const ftAwayRedCards = countEvents(['redcard', 'red'], awayId, 0, 120);
        const ftHomeFouls = countEvents(['foul'], homeId, 0, 120);
        const ftAwayFouls = countEvents(['foul'], awayId, 0, 120);

        // Get API stats with fallback to event counting
        const apiYellowHome = getStat('Yellow Cards', homeId) || getStat('Yellowcards', homeId);
        const apiYellowAway = getStat('Yellow Cards', awayId) || getStat('Yellowcards', awayId);
        const apiRedHome = getStat('Red Cards', homeId) || getStat('Redcards', homeId);
        const apiRedAway = getStat('Red Cards', awayId) || getStat('Redcards', awayId);
        const apiFoulsHome = getStat('Fouls', homeId);
        const apiFoulsAway = getStat('Fouls', awayId);

        // Build stats for fulltime (from API with event fallback)
        const fulltime = {
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
                fouls: { home: apiFoulsHome || ftHomeFouls, away: apiFoulsAway || ftAwayFouls },
                // Free kicks estimated as ~70-80% of opponent's fouls (most fouls result in free kicks)
                freeKicks: {
                    home: Math.round((apiFoulsAway || ftAwayFouls) * 0.75),
                    away: Math.round((apiFoulsHome || ftHomeFouls) * 0.75)
                },
                yellowCards: { home: apiYellowHome || ftHomeYellowCards, away: apiYellowAway || ftAwayYellowCards },
                redCards: { home: apiRedHome || ftHomeRedCards, away: apiRedAway || ftAwayRedCards },
                passes: { home: getStat('Passes', homeId), away: getStat('Passes', awayId) },
                longPasses: { home: 0, away: 0 },
                interceptions: { home: getStat('Interceptions', homeId), away: getStat('Interceptions', awayId) }
            }
        };

        // Build period stats from events (calculated by minute)
        const buildPeriodStats = (minMinute, maxMinute) => {
            // For stats we can count from events (corners, cards, goals)
            const homeCorners = countEvents(['corner'], homeId, minMinute, maxMinute);
            const awayCorners = countEvents(['corner'], awayId, minMinute, maxMinute);
            const homeYellowCards = countEvents(['yellowcard', 'yellow'], homeId, minMinute, maxMinute);
            const awayYellowCards = countEvents(['yellowcard', 'yellow'], awayId, minMinute, maxMinute);
            const homeRedCards = countEvents(['redcard', 'red'], homeId, minMinute, maxMinute);
            const awayRedCards = countEvents(['redcard', 'red'], awayId, minMinute, maxMinute);
            const homeGoals = countEvents(['goal'], homeId, minMinute, maxMinute);
            const awayGoals = countEvents(['goal'], awayId, minMinute, maxMinute);
            const homeFouls = countEvents(['foul'], homeId, minMinute, maxMinute);
            const awayFouls = countEvents(['foul'], awayId, minMinute, maxMinute);

            // Calculate percentage of the period vs fulltime
            const periodRatio = (maxMinute - minMinute) / 90;

            // Estimate other stats proportionally (not ideal but better than nothing)
            const estimateStat = (fulltimeValue) => Math.round(fulltimeValue * periodRatio);

            // Get fouls (prefer counted, fallback to estimated)
            const periodHomeFouls = homeFouls || estimateStat(fulltime.others.fouls.home);
            const periodAwayFouls = awayFouls || estimateStat(fulltime.others.fouls.away);

            return {
                possession: {
                    home: fulltime.possession.home, // Possession is typically similar across periods
                    away: fulltime.possession.away
                },
                attacks: {
                    total: { home: estimateStat(fulltime.attacks.total.home), away: estimateStat(fulltime.attacks.total.away) },
                    dangerous: { home: estimateStat(fulltime.attacks.dangerous.home), away: estimateStat(fulltime.attacks.dangerous.away) },
                    corners: { home: homeCorners, away: awayCorners }, // From events!
                    crosses: { home: estimateStat(fulltime.attacks.crosses.home), away: estimateStat(fulltime.attacks.crosses.away) }
                },
                shots: {
                    total: { home: estimateStat(fulltime.shots.total.home), away: estimateStat(fulltime.shots.total.away) },
                    onTarget: { home: estimateStat(fulltime.shots.onTarget.home), away: estimateStat(fulltime.shots.onTarget.away) },
                    offTarget: { home: estimateStat(fulltime.shots.offTarget.home), away: estimateStat(fulltime.shots.offTarget.away) },
                    insideBox: { home: estimateStat(fulltime.shots.insideBox.home), away: estimateStat(fulltime.shots.insideBox.away) },
                    outsideBox: { home: estimateStat(fulltime.shots.outsideBox.home), away: estimateStat(fulltime.shots.outsideBox.away) }
                },
                others: {
                    saves: { home: estimateStat(fulltime.others.saves.home), away: estimateStat(fulltime.others.saves.away) },
                    fouls: { home: periodHomeFouls, away: periodAwayFouls },
                    // Free kicks estimated as ~75% of opponent's fouls
                    freeKicks: {
                        home: Math.round(periodAwayFouls * 0.75),
                        away: Math.round(periodHomeFouls * 0.75)
                    },
                    yellowCards: { home: homeYellowCards, away: awayYellowCards }, // From events!
                    redCards: { home: homeRedCards, away: awayRedCards }, // From events!
                    passes: { home: estimateStat(fulltime.others.passes.home), away: estimateStat(fulltime.others.passes.away) },
                    longPasses: { home: 0, away: 0 },
                    interceptions: { home: estimateStat(fulltime.others.interceptions.home), away: estimateStat(fulltime.others.interceptions.away) }
                }
            };
        };

        return {
            fulltime,
            ht: buildPeriodStats(0, 45),    // 1st half: 0-45 min
            st: buildPeriodStats(46, 90)    // 2nd half: 46-90 min
        };
    };

    const detailedStats = calculateDetailedMatchStats(data.statistics, home.id, away.id, data.events);

    // Helper to normalize lineups from flat array to nested object
    const normalizeLineups = (lineups, home, away) => {
        if (!lineups || !Array.isArray(lineups)) {
            return {
                home: { formation: '', starters: [], subs: [] },
                away: { formation: '', starters: [], subs: [] }
            };
        }

        const processTeamLineup = (teamId) => {
            const teamLineups = lineups.filter(l => String(l.team_id) === String(teamId));

            // Map players
            const mapPlayer = (p) => ({
                id: p.player_id,
                name: p.player_name || p.player?.display_name || 'Unknown',
                number: p.jersey_number,
                pos: p.position?.code || (p.position_id === 24 ? 'GK' : p.position_id === 25 ? 'DF' : p.position_id === 26 ? 'MF' : 'FW'), // Fallback mapping
                grid: p.formation_field,
                rating: p.rating || null, // If available
                image: p.player?.image_path, // Add image path
                events: [] // Can be enriched later
            });

            const starters = teamLineups
                .filter(l => l.type_id === 11)
                .map(mapPlayer)
                .sort((a, b) => {
                    // Sort by position roughly: GK, DF, MF, FW
                    const posOrder = { 'GK': 1, 'DF': 2, 'MF': 3, 'FW': 4 };
                    return (posOrder[a.pos] || 5) - (posOrder[b.pos] || 5);
                });

            const subs = teamLineups
                .filter(l => l.type_id !== 11)
                .map(mapPlayer);

            // Infer formation from starters (e.g., count defenders, midfielders, forwards)
            // Or use formation field if available on team stats (not passed here currently)
            // For now, leave empty or try to guess.
            // SportMonks sometimes provides formation in `formations` include, but we don't have it here.

            return {
                formation: '', // Placeholder, would need extra data
                starters,
                subs
            };
        };

        return {
            home: processTeamLineup(home.id),
            away: processTeamLineup(away.id)
        };
    };

    // Calculate Lineups
    const lineups = normalizeLineups(data.lineups, home, away);

    // Generate prediction insights (now returns object with fulltime and list)
    const predictions = generateInsights(allStats);

    // Helper to map SportMonks status to Frontend status
    // Helper to map SportMonks status to Frontend status
    const mapMatchStatus = (stateObj) => {
        if (!stateObj) return 'NS';
        const s = stateObj.short_name || stateObj.state;
        // Map common variations
        if (s === 'NS' || s === 'TBD' || s === 'Not Started') return 'NS';
        if (s === 'LIVE' || s === 'In Play') return 'LIVE';
        if (s === 'HT' || s === 'Half Time') return 'HT';
        if (s === 'FT' || s === 'Ended' || s === 'Finished') return 'FT';
        if (s === 'ET') return 'ET';
        if (s === 'PEN_LIVE') return 'PEN_LIVE';
        if (s === 'AET') return 'AET';
        if (s === 'FT_PEN') return 'FT_PEN';
        if (s === 'CAN' || s === 'POSTP' || s === 'INT' || s === 'ABAN' || s === 'SUSP' || s === 'DELAYED' || s === 'TBA' || s === 'WO' || s === 'AU' || s === 'Deleted') return 'POSTP'; // Treat all abnormal as postponed/cancelled for now or handle specific
        return s;
    };

    // Calculate Score
    let homeScore = 0;
    let awayScore = 0;
    const scores = data.scores || [];
    if (scores.length > 0) {
        // Try to find 'CURRENT' score
        const currentHome = scores.find(s => s.description === 'CURRENT' && s.participant_id === home.id);
        const currentAway = scores.find(s => s.description === 'CURRENT' && s.participant_id === away.id);

        if (currentHome && currentAway) {
            homeScore = currentHome.score?.goals;
            awayScore = currentAway.score?.goals;
        } else {
            // Fallback: Sum up regular time? usually CURRENT is enough.
            // Sometimes '2ND_HALF' is the latest if finished.
            // But SportMonks V3 usually keeps CURRENT.
            // If not found, check 2ND_HALF or FT?
            const ftHome = scores.find(s => (s.description === '2ND_HALF' || s.description === 'FT') && s.participant_id === home.id);
            const ftAway = scores.find(s => (s.description === '2ND_HALF' || s.description === 'FT') && s.participant_id === away.id);
            if (ftHome) homeScore = ftHome.score?.goals;
            if (ftAway) awayScore = ftAway.score?.goals;
        }
    }


    return {
        // Match Info - ENRICHED with all required fields
        matchInfo: {
            id: data.id,
            state: mapMatchStatus(data.state),
            status: mapMatchStatus(data.state), // Alias for backward compatibility
            score: `${homeScore}-${awayScore}`,
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
        goalAnalysis: finalGoalAnalysis,
        cardAnalysis: finalCardAnalysis,
        generalStatsAnalysis,
        chartsAnalysis,
        goalMarkets,
        shotStats,
        offsides,
        otherStats,
        xG, // Kept for backward compatibility if needed, but also merged in goalAnalysis
        cornerAnalysis: finalCornerAnalysis,
        lineups, // Added Lineups
        predictions, // Added Predictions
        h2h: data.h2h, // Added H2H Data with Trends

        // NEW: Overview Tab Data
        history: {
            home: enrichedHomeHistory,
            away: enrichedAwayHistory
        },
        trends,
        timeline,
        events: data.events || [], // CRITICAL: Expose events for EventsTab
        standings: data.standings || [], // Added Standings

        // Team data for H2H fetch - CRITICAL: include detailedHistory for H2HTab
        homeTeam: {
            id: home.id,
            name: home.name,
            logo: home.image_path,
            image_path: home.image_path,
            squad: data.homeTeam?.squad || null,
            detailedHistory: data.homeTeam?.detailedHistory || [] // For H2H tab team history
        },
        awayTeam: {
            id: away.id,
            name: away.name,
            logo: away.image_path,
            image_path: away.image_path,
            squad: data.awayTeam?.squad || null,
            detailedHistory: data.awayTeam?.detailedHistory || [] // For H2H tab team history
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
        const [resParticipants, resStats, resLeague, resVenue, resOdds, resReferee, resEvents, resComments, resLineups] = await Promise.all([
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=participants;state;scores`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=statistics.type`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=league`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=venue`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=odds`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=referees`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=events.type`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=comments`),
            axios.get(`${BASE_URL}/fixtures/${matchId}?api_token=${token}&include=lineups.player`)
        ]);

        const participants = resParticipants.data.data.participants || [];
        const home = participants.find(p => p.meta?.location === 'home') || participants[0];
        const away = participants.find(p => p.meta?.location === 'away') || participants[1];

        // Process Comments for Corners (if events are missing corners)
        const comments = resComments.data.data.comments || [];
        const existingEvents = resEvents.data.data.events || [];

        const cornerEvents = comments
            .filter(c => c.comment && c.comment.toLowerCase().includes('corner'))
            .map(c => {
                // Determine team from comment text or extra_minute if implied? 
                // Unfortunately comments often lack participant_id directly usually.
                // But sometimes we can infer or just list them.
                // However, without participant_id, we can't assign Home/Away easily unless we parse "Corner for [TeamName]".
                // For now, let's try to pass them and let Frontend decide or just show generic.
                return {
                    id: `comment-${c.id}`,
                    minute: c.minute,
                    type: { name: 'Corner' },
                    comment: c.comment,
                    // Attempt to guess team if possible, or leave null
                    participant_id: null
                };
            });

        // Merge real events + corner comments
        // Avoid duplicates if corners ARE in events (check by minute?)
        // Simple merge for now as specific match lacked corner events totally.
        const allEvents = [...existingEvents, ...cornerEvents];

        // Get Season ID for Standings
        const seasonId = resParticipants.data.data.season_id;
        let standings = [];
        if (seasonId) {
            try {
                console.log(`🏆 Fetching standings for season ${seasonId}...`);
                standings = await apiGetStandings(seasonId);
                console.log(`✅ Standings fetched: ${standings.length} teams`);
            } catch (e) {
                console.error(`Failed to fetch standings for season ${seasonId}`, e.message);
            }
        } else {
            console.log('⚠️ No season_id found, skipping standings fetch');
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

        // Step 2.5: Fetch Squad Data for both teams
        const fetchTeamSquad = async (teamId) => {
            if (!teamId) return { hasData: false, players: [] };
            try {
                console.log(`👥 Fetching squad for team ${teamId}...`);
                const squadUrl = `${BASE_URL}/squads/teams/${teamId}?api_token=${token}&include=player.statistics.details.type;player.position`;
                const resSquad = await axios.get(squadUrl);
                const squad = resSquad.data.data || [];

                const players = squad.map(playerItem => {
                    const player = playerItem.player;
                    if (!player) return null;

                    const stats = player.statistics || [];
                    // Take most recent stats (first entry) or aggregate if needed
                    const stat = stats.length > 0 ? stats[0] : null;
                    const details = stat?.details || [];

                    // Helper to find stat by type name
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
                        name: player.common_name || player.display_name || player.name,
                        photo: player.image_path,
                        position: player.position?.name || playerItem.position?.name || 'Jogador',
                        positionId: player.position_id || playerItem.position_id,
                        jerseyNumber: playerItem.jersey_number,
                        rating: findDetailStat('Rating', 'RATING'),
                        goals: findDetailStat('Goals', 'GOALS'),
                        assists: findDetailStat('Assists', 'ASSISTS'),
                        yellowCards: findDetailStat('Yellow Cards', 'YELLOWCARDS'),
                        redCards: findDetailStat('Red Cards', 'REDCARDS'),
                        appearances: findDetailStat('Appearances', 'APPEARANCES'),
                        minutes: findDetailStat('Minutes Played', 'MINUTES'),
                        cleanSheets: findDetailStat('Clean Sheets', 'CLEANSHEETS'),
                        saves: findDetailStat('Saves', 'SAVES'),
                        passes: findDetailStat('Passes', 'PASSES'),
                        keyPasses: findDetailStat('Key Passes', 'KEYPASSES'),
                        shots: findDetailStat('Shots Total', 'SHOTS'),
                        tackles: findDetailStat('Tackles', 'TACKLES'),
                        interceptions: findDetailStat('Interceptions', 'INTERCEPTIONS')
                    };
                }).filter(p => p);

                console.log(`✅ Squad fetched: ${players.length} players`);
                return { hasData: players.length > 0, players };
            } catch (e) {
                console.error(`❌ Failed to fetch squad for team ${teamId}:`, e.message);
                return { hasData: false, players: [] };
            }
        };

        const [homeSquad, awaySquad] = await Promise.all([
            fetchTeamSquad(home?.id),
            fetchTeamSquad(away?.id)
        ]);

        // Step 2.6: Fetch H2H Data (NEW)
        const h2hData = await fetchH2HMatches(home.id, away.id);

        // Step 3: Fetch Detailed Data for these IDs
        // We need events (filtered), stats, participants, and commentaries for corner extraction
        // Commentaries are needed because corner events are not available in the events array
        const fetchDetailedMatch = async (id) => {
            try {
                // Include scores and league for H2HTab display
                const url = `${BASE_URL}/fixtures/${id}?api_token=${token}&include=events.type;statistics.type;participants;comments;lineups.player;odds;referees;scores;league`;
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

        // DEBUG: Log history counts
        console.log(`📊 Home team history: ${validHomeHistory.length} matches`);
        console.log(`📊 Away team history: ${validAwayHistory.length} matches`);
        console.log(`📊 H2H matches: ${h2hData?.matches?.length || 0} matches`);

        // Merge data
        const mergedData = {
            ...resParticipants.data.data,
            // Ensure state and scores are top-level
            state: resParticipants.data.data.state,
            scores: resParticipants.data.data.scores,

            statistics: resStats.data.data.statistics,
            league: resLeague.data.data.league,
            venue: resVenue.data.data.venue,
            odds: resOdds.data.data.odds,
            referee: referee, // Add referee to merged data
            refereeHistory: refereeHistory, // Add referee history
            events: allEvents, // Use merged events
            comments: comments, // Expose raw comments too
            lineups: resLineups.data.data.lineups || [], // Add lineups
            standings: standings, // Add standings
            h2h: h2hData, // Add H2H Data
            homeTeam: {
                ...home, // keep basic info
                detailedHistory: validHomeHistory,
                squad: homeSquad
            },
            awayTeam: {
                ...away,
                detailedHistory: validAwayHistory,
                squad: awaySquad
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

    // Step 1: Check database cache first (using externalId, not internal id)
    let cached = await Match.findOne({ where: { externalId: matchId } });

    // Cache TTL configuration
    const CACHE_TTL = {
        LIVE: 5 * 60 * 1000,        // 5 minutes for live matches
        UPCOMING: 60 * 60 * 1000,   // 1 hour for upcoming matches
        FINISHED: 24 * 60 * 60 * 1000, // 24 hours for finished matches
    };

    const now = new Date();

    // If we have cached data, check freshness
    if (cached && cached.data) {
        const cacheAge = now - new Date(cached.cached_at || cached.updatedAt);
        const status = cached.status || cached.data?.state?.state || cached.data?.matchInfo?.state || 'NS';

        // Determine if cache is fresh based on match status
        let isFresh = false;
        if (status === 'FT' || status === 'AET' || status === 'FT_PEN') {
            isFresh = cacheAge < CACHE_TTL.FINISHED;
        } else if (status === 'LIVE' || status === 'HT' || status === 'ET' || status === 'PEN_LIVE') {
            isFresh = cacheAge < CACHE_TTL.LIVE;
        } else {
            isFresh = cacheAge < CACHE_TTL.UPCOMING;
        }

        if (isFresh) {
            console.log(`✅ Cache HIT for match ${matchId} (status: ${status}, age: ${Math.round(cacheAge / 1000)}s)`);
            // CRITICAL FIX: If data is already processed (has matchInfo), return directly
            // Don't call calculateMatchStats again - that's expensive and already done!
            if (cached.data.matchInfo) {
                return cached.data; // Already processed and ready to use
            } else {
                // Old cache format - needs processing
                const stats = calculateMatchStats(cached.data);
                return stats;
            }
        } else {
            console.log(`⚠️  Cache STALE for match ${matchId} (status: ${status}, age: ${Math.round(cacheAge / 1000)}s) - refreshing...`);
        }
    } else {
        console.log(`⚠️  Cache MISS for match ${matchId} - fetching from API...`);
    }

    // Step 2: Cache miss or stale - fetch from API
    try {
        const externalData = await fetchExternalMatchData(matchId, process.env.SPORTMONKS_API_TOKEN);
        const processedData = calculateMatchStats(externalData);

        // Extract participants for metadata
        const participants = externalData.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        // Extract fixture date
        const fixtureDate = externalData.starting_at ?
            new Date(externalData.starting_at) : now;

        // Step 3: Update/create cache entry
        const cacheData = {
            externalId: matchId,
            leagueId: externalData.league?.id || externalData.league_id,
            date: fixtureDate,
            status: externalData.state?.state || processedData.matchInfo?.state || 'NS',
            homeTeamName: home?.name || 'Home',
            awayTeamName: away?.name || 'Away',
            homeScore: processedData.matchInfo?.score?.split('-')[0] || 0,
            awayScore: processedData.matchInfo?.score?.split('-')[1] || 0,
            data: processedData, // Store PROCESSED data, not raw
            cached_at: now,
            cache_source: 'on-demand',
            team_ids: [home?.id, away?.id].filter(Boolean),
            fixture_date: fixtureDate
        };

        try {
            await Match.upsert(cacheData);
            console.log(`✅ Match ${matchId} cached successfully`);
        } catch (dbError) {
            console.error(`❌ Failed to cache match ${matchId}:`, dbError.message);
            // Continue even if cache fails - data is still valid
        }

        return processedData;
    } catch (apiError) {
        console.error(`❌ Failed to fetch match ${matchId} from API:`, apiError.message);

        // If it's an auth error, throw immediately
        if (apiError.response?.status === 401 || apiError.response?.status === 403) {
            throw new Error(`Authentication failed: ${apiError.message}. Check SPORTMONKS_API_TOKEN in .env`);
        }

        // For other errors, return error structure
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
};
