// Fixture Service - Light Fetch for Dashboard
// Optimized for fast listing with league grouping

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
// Use hardcoded token as fallback (same as other services)
const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

/**
 * Get fixtures by date (Light Fetch)
 * Returns all fixtures for a specific date, grouped by league
 * @param {string} date - Format: YYYY-MM-DD
 * @returns {Array} Fixtures grouped by league
 */
export const getFixturesByDate = async (date) => {
    try {
        // Light includes only - NO events, stats, lineups, commentaries
        const includes = 'league.country;participants;scores;state';

        console.log(`Fetching fixtures for date: ${date}`);

        let allFixtures = [];
        let currentPage = 1;
        let hasMore = true;

        // Fetch all pages
        while (hasMore) {
            const url = `${BASE_URL}/fixtures/date/${date}?api_token=${token}&include=${includes}&page=${currentPage}`;

            console.log(`Fetching page ${currentPage}...`);
            const { data } = await axios.get(url);

            const fixtures = data.data || [];
            allFixtures = allFixtures.concat(fixtures);

            // Check if there are more pages
            hasMore = data.pagination?.has_more || false;
            currentPage++;

            console.log(`Page ${currentPage - 1}: ${fixtures.length} fixtures (Total so far: ${allFixtures.length})`);

            // Safety limit to prevent infinite loops
            if (currentPage > 50) {
                console.warn('Reached maximum page limit (50)');
                break;
            }
        }

        console.log(`✅ Total fixtures fetched: ${allFixtures.length}`);

        // Group by league
        return groupFixturesByLeague(allFixtures);
    } catch (error) {
        console.error(`Error fetching fixtures for date ${date}:`, error.message);
        if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error(`Response data:`, error.response.data);
        }
        throw error;
    }
};

/**
 * Get live fixtures (Light Fetch)
 * Returns all currently live fixtures, grouped by league
 * @returns {Array} Live fixtures grouped by league
 */
export const getLiveFixtures = async () => {
    try {
        // Light includes only
        const includes = 'league.country;participants;scores;state';

        console.log('Fetching live fixtures...');

        let allFixtures = [];
        let currentPage = 1;
        let hasMore = true;

        // Fetch all pages
        while (hasMore) {
            const url = `${BASE_URL}/livescores/inplay?api_token=${token}&include=${includes}&page=${currentPage}`;

            const { data } = await axios.get(url);

            const fixtures = data.data || [];
            allFixtures = allFixtures.concat(fixtures);

            // Check if there are more pages
            hasMore = data.pagination?.has_more || false;
            currentPage++;

            // Safety limit
            if (currentPage > 20) {
                console.warn('Reached maximum page limit for live fixtures (20)');
                break;
            }
        }

        console.log(`Found ${allFixtures.length} live fixtures`);

        // Group by league
        return groupFixturesByLeague(allFixtures);
    } catch (error) {
        // 404 means no live games, which is normal
        if (error.response?.status === 404) {
            console.log('No live fixtures at the moment');
            return [];
        }

        console.error('Error fetching live fixtures:', error.message);
        throw error;
    }
};

/**
 * Group fixtures by league
 * @param {Array} fixtures - Raw fixtures from API
 * @returns {Array} Fixtures grouped by league with metadata
 */
const groupFixturesByLeague = (fixtures) => {
    const leaguesMap = {};

    fixtures.forEach(fixture => {
        const league = fixture.league;
        if (!league) return;

        const leagueId = league.id;

        // Initialize league group if not exists
        if (!leaguesMap[leagueId]) {
            leaguesMap[leagueId] = {
                league_id: leagueId,
                league_name: league.name,
                country_name: league.country?.name || 'International',
                country_flag: league.country?.image_path || null,
                fixtures: []
            };
        }

        // Normalize fixture data
        const normalizedFixture = normalizeFixture(fixture);
        if (normalizedFixture) {
            leaguesMap[leagueId].fixtures.push(normalizedFixture);
        }
    });

    // Convert to array and sort by league importance
    const groupedLeagues = Object.values(leaguesMap);

    // Sort leagues: prioritize Brazilian and South American competitions
    groupedLeagues.sort((a, b) => {
        const priorityA = getLeaguePriority(a.league_name, a.country_name);
        const priorityB = getLeaguePriority(b.league_name, b.country_name);

        if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
        }

        // If same priority, sort alphabetically
        return a.league_name.localeCompare(b.league_name);
    });

    return groupedLeagues;
};

/**
 * Get league priority for sorting
 * Higher number = higher priority
 */
const getLeaguePriority = (leagueName, countryName) => {
    const name = leagueName.toLowerCase();
    const country = countryName.toLowerCase();

    // Priority 10: Copa Libertadores, Copa Sudamericana
    if (name.includes('libertadores') || name.includes('sudamericana')) {
        return 10;
    }

    // Priority 9: Brazilian competitions
    if (country === 'brazil' || name.includes('brasileir') || name.includes('copa do brasil')) {
        return 9;
    }

    // Priority 8: Top European leagues
    if (name.includes('premier league') ||
        name.includes('la liga') ||
        name.includes('serie a') && country === 'italy' ||
        name.includes('bundesliga') ||
        name.includes('ligue 1')) {
        return 8;
    }

    // Priority 7: Champions League, Europa League
    if (name.includes('champions') || name.includes('europa league')) {
        return 7;
    }

    // Priority 6: Other South American leagues
    if (country === 'argentina' || country === 'uruguay' ||
        country === 'colombia' || country === 'chile' ||
        country === 'paraguay' || country === 'peru' ||
        country === 'ecuador' || country === 'bolivia' ||
        country === 'venezuela') {
        return 6;
    }

    // Priority 5: Other European leagues
    if (country === 'england' || country === 'spain' ||
        country === 'italy' || country === 'germany' ||
        country === 'france' || country === 'portugal' ||
        country === 'netherlands') {
        return 5;
    }

    // Default priority
    return 1;
};

/**
 * Normalize fixture data for frontend
 * @param {Object} fixture - Raw fixture from API
 * @returns {Object} Normalized fixture
 */
const normalizeFixture = (fixture) => {
    try {
        const participants = fixture.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        if (!home || !away) {
            console.warn(`Fixture ${fixture.id} missing participants`);
            return null;
        }

        // Get current score
        const scores = fixture.scores || [];
        const currentScore = scores.find(s => s.description === 'CURRENT');

        const homeScore = currentScore?.score?.participant === 'home' ?
            (currentScore.score.goals || 0) : 0;
        const awayScore = currentScore?.score?.participant === 'away' ?
            (currentScore.score.goals || 0) : 0;

        // Get match state
        const state = fixture.state?.state || 'NS';
        const minute = fixture.state?.minute || null;

        return {
            id: fixture.id,
            status: state,
            minute: minute,
            timestamp: fixture.starting_at_timestamp ||
                Math.floor(new Date(fixture.starting_at).getTime() / 1000),
            home_team: {
                id: home.id,
                name: home.name,
                short_name: home.short_code || home.name,
                logo: home.image_path,
                score: homeScore
            },
            away_team: {
                id: away.id,
                name: away.name,
                short_name: away.short_code || away.name,
                logo: away.image_path,
                score: awayScore
            }
        };
    } catch (error) {
        console.error(`Error normalizing fixture ${fixture?.id}:`, error.message);
        return null;
    }
};

/**
 * Get fixtures for multiple dates (for weekly view)
 * @param {Array} dates - Array of dates in YYYY-MM-DD format
 * @returns {Object} Fixtures grouped by date and league
 */
export const getFixturesForDates = async (dates) => {
    try {
        const promises = dates.map(date => getFixturesByDate(date));
        const results = await Promise.all(promises);

        const fixturesByDate = {};
        dates.forEach((date, index) => {
            fixturesByDate[date] = results[index];
        });

        return fixturesByDate;
    } catch (error) {
        console.error('Error fetching fixtures for multiple dates:', error.message);
        throw error;
    }
};
