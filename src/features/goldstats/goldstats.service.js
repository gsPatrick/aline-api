import axios from 'axios';
import { Match, League, Team } from '../../models/index.js'; // SQLite Models (Cache)
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const TOKEN = process.env.SPORTMONKS_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper to get nested properties
const get = (obj, path, def = null) => {
    if (!obj) return def;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || def;
};

// --- DATA ACCESS LAYER (Cache + API) ---

/**
 * Fetch matches for a specific date range.
 * Checks DB first. If missing or stale (logic simplified here), fetches from API and caches.
 */
// TTL Constants
const CACHE_TTL_LIVE = 60 * 1000; // 1 minute for today/live
const CACHE_TTL_HISTORIC = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch matches for a specific date range.
 * Checks DB first. If missing or stale, fetches from API and caches.
 */
async function fetchMatchesForDate(date) {
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    // 1. Check DB first
    const items = await Match.findAll({
        where: { fixture_date: date }
    });

    if (items.length > 0) {
        // If we have data, check freshness
        const oldestCache = items.reduce((oldest, item) => {
            const itemDate = new Date(item.cached_at || item.updatedAt);
            return (!oldest || itemDate < oldest) ? itemDate : oldest;
        }, null);

        const age = oldestCache ? (new Date() - oldestCache) : Infinity;
        const isFresh = isToday ? (age < CACHE_TTL_LIVE) : true; // Historic data assumes fresh if present (simplification)

        // Additional check: If it's today but we have very few matches (e.g. partial sync), force refresh if < 10?
        // Or if we have > 0 and it's fresh, return it.

        if (isFresh && items.length > 5) { // Arbitrary threshold to ensure we don't cache partial failed fetches
            console.log(`[GoldStats] Returning ${items.length} cached matches for ${date} (Age: ${Math.round(age / 1000)}s)`);
            return items.map(m => m.data);
        } else {
            console.log(`[GoldStats] Cache STALE/Partial for ${date} (Age: ${Math.round(age / 1000)}s, Count: ${items.length}) - Refreshing from API`);
        }
    } else {
        console.log(`[GoldStats] Cache MISS for ${date} - Fetching from API`);
    }

    // 2. Fetch from API (if cache miss or stale)

    console.log(`[GoldStats] Fetching from API for ${date}`);
    const includes = 'league.country;participants;scores;state';
    const url = `${BASE_URL}/fixtures/date/${date}?api_token=${TOKEN}&include=${includes}`;

    try {
        const { data } = await axios.get(url);
        const fixtures = data.data || [];

        // Save to DB
        await Promise.all(fixtures.map(async (f) => {
            const normalized = normalizeFixture(f);
            if (!normalized) return;

            await Match.upsert({
                externalId: f.id,
                leagueId: f.league_id,
                date: f.starting_at,
                status: f.state?.state,
                homeTeamName: f.participants?.find(p => p.meta?.location === 'home')?.name,
                awayTeamName: f.participants?.find(p => p.meta?.location === 'away')?.name,
                homeScore: getScore(f, 'home'),
                awayScore: getScore(f, 'away'),
                data: normalized,
                fixture_date: date,
                cached_at: new Date(),
                cache_source: 'goldstats-home'
            });
        }));

        return fixtures.map(normalizeFixture).filter(f => f);
    } catch (error) {
        console.error(`Error fetching date ${date}:`, error.message);
        return [];
    }
}

/**
 * Normalize fixture for frontend
 */
function normalizeFixture(fixture) {
    if (!fixture) return null;
    const participants = fixture.participants || [];
    const home = participants.find(p => p.meta?.location === 'home');
    const away = participants.find(p => p.meta?.location === 'away');

    if (!home || !away) return null;

    return {
        id: fixture.id,
        status: fixture.state?.state || 'NS',
        minute: fixture.state?.minute,
        timestamp: fixture.starting_at_timestamp || Math.floor(new Date(fixture.starting_at).getTime() / 1000),
        date: fixture.starting_at, // useful for sorting
        home_team: {
            id: home.id,
            name: home.name,
            short_name: home.short_code || home.name,
            logo: home.image_path,
            score: getScore(fixture, 'home')
        },
        away_team: {
            id: away.id,
            name: away.name,
            short_name: away.short_code || away.name,
            logo: away.image_path,
            score: getScore(fixture, 'away')
        },
        league: {
            id: fixture.league?.id,
            name: fixture.league?.name,
            logo: fixture.league?.image_path,
            country: fixture.league?.country?.name
        }
    };
}

function getScore(fixture, side) {
    const scores = fixture.scores || [];
    // Find the CURRENT score for this side
    const current = scores.find(s =>
        s.description === 'CURRENT' && s.score?.participant === side
    );
    if (current) return current.score.goals;

    // Fallback: try FT or 2ND_HALF scores
    const ft = scores.find(s =>
        (s.description === 'FT' || s.description === '2ND_HALF') && s.score?.participant === side
    );
    if (ft) return ft.score.goals;

    return 0;
}


// --- FEATURE IMPLEMENTATION ---

export const getHomeData = async (selectedDate = null) => {
    const dates = [];

    if (selectedDate) {
        // Single date mode
        dates.push(selectedDate);
    } else {
        // Default range: Yesterday (-1) to +3 days ahead
        const today = new Date();
        for (let i = -1; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
    }

    const allMatches = [];
    for (const date of dates) {
        const matches = await fetchMatchesForDate(date);
        allMatches.push(...matches);
    }

    // Group by League (Required)
    const grouped = {};
    allMatches.forEach(m => {
        if (!m.league) return;
        const leagueId = m.league.id;
        if (!grouped[leagueId]) {
            grouped[leagueId] = {
                league_id: leagueId,
                league_name: m.league.name,
                league_logo: m.league.logo,
                country: m.league.country,
                matches: []
            };
        }
        grouped[leagueId].matches.push(m);
    });

    return Object.values(grouped).sort((a, b) => a.league_name.localeCompare(b.league_name)); // Basic sort
};

export const getMatchHeader = async (id) => {
    // Check DB
    let match = await Match.findOne({ where: { externalId: id } });

    // If missing or stale (older than X?), fetch details
    // For header, we need basic info.
    if (!match) {
        const url = `${BASE_URL}/fixtures/${id}?api_token=${TOKEN}&include=league;participants;venue;scores;state`;
        const { data } = await axios.get(url);
        const f = data.data;

        const normalized = normalizeFixture(f);
        if (f.venue) normalized.venue = f.venue.name;

        // Save
        match = await Match.create({
            externalId: f.id,
            leagueId: f.league_id,
            date: f.starting_at,
            status: f.state?.state,
            homeTeamName: f.participants?.find(p => p.meta?.location === 'home')?.name,
            awayTeamName: f.participants?.find(p => p.meta?.location === 'away')?.name,
            homeScore: getScore(f, 'home'),
            awayScore: getScore(f, 'away'),
            data: normalized,
            fixture_date: f.starting_at.split('T')[0],
            cached_at: new Date(),
            cache_source: 'goldstats-header'
        });
    }

    // Normalize the cached data - handle both flat and nested structures
    const data = match.data || {};
    const matchInfo = data.matchInfo || data;

    return {
        id: matchInfo.id || match.externalId,
        status: matchInfo.status || match.status,
        date: matchInfo.date || match.date,
        home_team: matchInfo.home_team || {},
        away_team: matchInfo.away_team || {},
        league: matchInfo.league || {},
        venue: matchInfo.venue
    };
};

export const getNextMatches = async (id) => {
    try {
        // 1. Get Match to know the teams
        const match = await getMatchHeader(id);
        if (!match) throw new Error("Match not found");
        if (!match.home_team?.id || !match.away_team?.id) {
            console.error('[getNextMatches] Missing team IDs:', match);
            return { home: [], away: [] };
        }

        const homeId = match.home_team.id;
        const awayId = match.away_team.id;
        const matchDate = new Date(match.date);

        // Fetch next matches for HOME team (as main focus example? usually we show both or current view perspective)
        // User said "Próximos 10 jogos do time... Se o time joga...". Usually implies context of the specific team page, but here we are in a Match Context.
        // Usually "Next Matches" on a Match Page shows H2H or Next for Both?
        // "GET /api/goldstats/match/{id}/next-matches"
        // Ambiguity: Which team? Usually returns object { home: [], away: [] }
        // Let's assume both.

        async function fetchTeamNext(teamId) {
            // API Call for "Global" scope
            // We can use the logic from `team.service.js` or write new.
            // To respect "Proxy", check DB? DB might not have ALL future matches for that team unless we seeded.
            // So fetch from API, cache, return.

            const start = new Date().toISOString().split('T')[0];
            const end = new Date();
            end.setDate(end.getDate() + 60); // 60 days window
            const endStr = end.toISOString().split('T')[0];

            const url = `${BASE_URL}/fixtures/between/${start}/${endStr}/${teamId}?api_token=${TOKEN}&include=league;participants;state`;
            const { data } = await axios.get(url);

            // NO LEAGUE FILTER - Include ALL competitions (Copa, Liga, Amistoso)
            let fixtures = (data.data || [])
                .filter(f => new Date(f.starting_at) > new Date()) // Future only
                .sort((a, b) => new Date(a.starting_at) - new Date(b.starting_at))
                .slice(0, 10); // Limit 10

            return fixtures.map(normalizeFixture);
        }

        const [homeNext, awayNext] = await Promise.all([
            fetchTeamNext(homeId),
            fetchTeamNext(awayId)
        ]);

        return { home: homeNext, away: awayNext };
    } catch (error) {
        console.error('[getNextMatches] Error:', error.message);
        return { home: [], away: [] };
    }
};

export const getLastMatches = async (id) => {
    try {
        const match = await getMatchHeader(id);
        if (!match || !match.home_team?.id || !match.away_team?.id) {
            console.error('[getLastMatches] Missing match or team data');
            return { home: [], away: [] };
        }
        const leagueId = match.league?.id;
        const homeId = match.home_team.id;
        const awayId = match.away_team.id;

        async function fetchTeamLast(teamId) {
            // "Same League" Filter
            const start = new Date();
            start.setDate(start.getDate() - 180); // 6 months back
            const startStr = start.toISOString().split('T')[0];
            const endStr = new Date().toISOString().split('T')[0];

            // We specifically request THIS league's fixtures for this team?
            // API doesn't filter league in 'between' easily without Post-Filter.
            // Or usage: `/fixtures/between/.../ID` then filter.

            const url = `${BASE_URL}/fixtures/between/${startStr}/${endStr}/${teamId}?api_token=${TOKEN}&include=league;participants;scores;state`;
            const { data } = await axios.get(url);

            let fixtures = (data.data || [])
                .filter(f => f.league_id === leagueId) // SAME LEAGUE CHECK
                .filter(f => f.state?.state === 'FT') // FINISHED CHECK
                .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at)) // Descending
                .slice(0, 5); // Limit 5

            return fixtures.map(normalizeFixture);
        }

        const [homeLast, awayLast] = await Promise.all([
            fetchTeamLast(homeId),
            fetchTeamLast(awayId)
        ]);

        return { home: homeLast, away: awayLast };
    } catch (error) {
        console.error('[getLastMatches] Error:', error.message);
        return { home: [], away: [] };
    }
};

export const getAIAnalysis = async (id) => {
    // 1. Check DB for `data.goldstats_analysis`
    const match = await Match.findOne({ where: { externalId: id } });
    if (match && match.data && match.data.goldstats_analysis) {
        console.log(`[GoldStats] Returning cached AI analysis for ${id}`);
        return { analysis: match.data.goldstats_analysis };
    }

    // 2. Generate Analysis
    // Need data first
    const nextMatches = await getNextMatches(id);
    const lastMatches = await getLastMatches(id);

    // Check if we have match header info in `match` or strict fetch
    const header = match ? match.data : await getMatchHeader(id);

    const context = {
        match: `${header.home_team.name} vs ${header.away_team.name}`,
        league: header.league.name,
        homeLast5: lastMatches.home.map(m => `${m.status} vs ${m.away_team.name} (${m.home_team.score}-${m.away_team.score})`).join(', '),
        // ... concise context construction
    };

    let text = "Análise automática indisponível no momento.";

    if (OPENAI_API_KEY) {
        try {
            console.log(`[GoldStats] Calling OpenAI for match ${id}...`);
            const prompt = `Analise esta partida de futebol: ${context.match} (${context.league}). 
            Time Casa (Últimos 5 na liga): ${JSON.stringify(lastMatches.home.map(m => m.result))}.
            Time Fora (Últimos 5 na liga): ${JSON.stringify(lastMatches.away.map(m => m.result))}.
            Forneça uma análise curta (max 3 linhas) focada em forma recente e dificuldade dos próximos jogos. Tom profissional e direto.`;

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 150
            }, {
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
            });

            text = response.data.choices[0].message.content.trim();
        } catch (e) {
            console.error("OpenAI Error:", e.message);
            text = "Erro ao gerar análise de IA.";
        }
    } else {
        text = "Configuração de IA ausente. Adicione OPENAI_API_KEY ao .env.";
    }

    // 3. Save to DB
    if (match) {
        const newData = { ...match.data, goldstats_analysis: text };
        match.data = newData;
        match.changed('data', true);
        await match.save();
    }

    return { analysis: text };
};
