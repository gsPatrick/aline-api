// Sports Service - League and Match API Functions
// Recreated to restore league listing functionality

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

// Get all leagues with pagination
export const apiGetLeagues = async (page = 1) => {
    try {
        const url = `${BASE_URL}/leagues?api_token=${token}&page=${page}`;
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        console.error('Error fetching leagues:', error.message);
        throw error;
    }
};

// Get ALL leagues (all pages) - REFACTORED with deduplication
export const getAllLeagues = async () => {
    try {
        console.log('Fetching all leagues from SportMonks...');

        const leaguesMap = new Map(); // Use Map for deduplication
        let currentPage = 1;
        let hasMore = true;

        while (hasMore) {
            // Include country data to get flags/logos
            const url = `${BASE_URL}/leagues?api_token=${token}&include=country&page=${currentPage}`;
            console.log(`Fetching leagues page ${currentPage}...`);

            const { data } = await axios.get(url);
            const leagues = data.data || [];

            // Process each league with deduplication
            for (const league of leagues) {
                // Skip if no name or already exists
                if (!league.name || leaguesMap.has(league.id)) {
                    continue;
                }

                // Skip test/invalid leagues
                if (league.name.toLowerCase().includes('test') ||
                    league.name.toLowerCase().includes('example')) {
                    continue;
                }

                // Map with correct image_path fields
                leaguesMap.set(league.id, {
                    id: league.id,
                    name: league.name,
                    logo: league.image_path, // CORRECT: image_path not logo
                    country: {
                        id: league.country?.id,
                        name: league.country?.name || 'International',
                        flag: league.country?.image_path // CORRECT: image_path for flag
                    },
                    is_cup: league.sub_type?.includes('cup') || false,
                    active: league.active,
                    short_code: league.short_code
                });
            }

            hasMore = data.pagination?.has_more || false;
            currentPage++;

            const totalUnique = leaguesMap.size;
            console.log(`Page ${currentPage - 1}: ${leagues.length} leagues fetched (${totalUnique} unique total)`);

            // Safety limit
            if (currentPage > 100) {
                console.warn('Reached maximum page limit (100)');
                break;
            }
        }

        const uniqueLeagues = Array.from(leaguesMap.values());
        console.log(`✅ Total unique leagues fetched: ${uniqueLeagues.length}`);

        return uniqueLeagues;
    } catch (error) {
        console.error('Error fetching all leagues:', error.message);
        throw error;
    }
};

// Get league by ID
export const apiGetLeagueById = async (id) => {
    try {
        const url = `${BASE_URL}/leagues/${id}?api_token=${token}`;
        const { data } = await axios.get(url);
        return data.data;
    } catch (error) {
        console.error(`Error fetching league ${id}:`, error.message);
        return null;
    }
};

// Get standings for a season
export const apiGetStandings = async (seasonId) => {
    try {
        const url = `${BASE_URL}/standings/seasons/${seasonId}?api_token=${token}`;
        const { data } = await axios.get(url);
        return data.data || [];
    } catch (error) {
        console.error(`Error fetching standings for season ${seasonId}:`, error.message);
        return [];
    }
};

// Get fixtures by season
export const apiGetFixturesBySeason = async (seasonId) => {
    try {
        const url = `${BASE_URL}/fixtures/seasons/${seasonId}?api_token=${token}`;
        const { data } = await axios.get(url);
        return data.data || [];
    } catch (error) {
        console.error(`Error fetching fixtures for season ${seasonId}:`, error.message);
        return [];
    }
};

// Get leagues by date
export const apiGetLeaguesByDate = async (date) => {
    try {
        const url = `${BASE_URL}/fixtures/date/${date}?api_token=${token}&include=league`;
        const { data } = await axios.get(url);

        // Group fixtures by league
        const leaguesMap = {};
        (data.data || []).forEach(fixture => {
            const leagueId = fixture.league?.id;
            if (!leagueId) return;

            if (!leaguesMap[leagueId]) {
                leaguesMap[leagueId] = {
                    id: leagueId,
                    name: fixture.league.name,
                    today: []
                };
            }
            leaguesMap[leagueId].today.push(fixture);
        });

        return Object.values(leaguesMap);
    } catch (error) {
        console.error(`Error fetching leagues by date ${date}:`, error.message);
        return [];
    }
};

// Normalize match card data
export const normalizeMatchCard = (fixture) => {
    if (!fixture) return null;

    try {
        const participants = fixture.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        const scores = fixture.scores || [];
        const currentScore = scores.find(s => s.description === 'CURRENT');

        return {
            id: fixture.id,
            timestamp: fixture.starting_at_timestamp || Math.floor(new Date(fixture.starting_at).getTime() / 1000),
            status: fixture.state?.state || 'NS',
            home_team: {
                id: home?.id,
                name: home?.name,
                logo: home?.image_path,
                score: currentScore?.score?.participant === 'home' ? currentScore.score.goals : 0
            },
            away_team: {
                id: away?.id,
                name: away?.name,
                logo: away?.image_path,
                score: currentScore?.score?.participant === 'away' ? currentScore.score.goals : 0
            },
            league: {
                id: fixture.league?.id,
                name: fixture.league?.name
            }
        };
    } catch (error) {
        console.error('Error normalizing match card:', error.message);
        return null;
    }
};

// Start live match polling (placeholder - can be implemented later)
export const startLiveMatchPolling = () => {
    console.log('Live match polling not implemented yet');
    // TODO: Implement polling logic if needed
};
