// Search Service - Search teams, leagues, and players via Sportmonks API
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

/**
 * Search teams by name
 * @param {string} query - Search query
 * @returns {Array} Matching teams
 */
export const searchTeams = async (query) => {
    try {
        const url = `${BASE_URL}/teams/search/${encodeURIComponent(query)}?api_token=${token}&include=country`;
        const { data } = await axios.get(url);

        return (data.data || []).map(team => ({
            id: team.id,
            name: team.name,
            short_code: team.short_code,
            logo: team.image_path,
            country: team.country?.name || 'Unknown',
            country_flag: team.country?.image_path,
            type: 'team'
        }));
    } catch (error) {
        console.error('Error searching teams:', error.message);
        return [];
    }
};

/**
 * Search leagues by name
 * @param {string} query - Search query
 * @returns {Array} Matching leagues
 */
export const searchLeagues = async (query) => {
    try {
        const url = `${BASE_URL}/leagues/search/${encodeURIComponent(query)}?api_token=${token}&include=country`;
        const { data } = await axios.get(url);

        return (data.data || []).map(league => ({
            id: league.id,
            name: league.name,
            logo: league.image_path,
            country: league.country?.name || 'International',
            country_flag: league.country?.image_path,
            type: 'league'
        }));
    } catch (error) {
        console.error('Error searching leagues:', error.message);
        return [];
    }
};

/**
 * Search players by name
 * @param {string} query - Search query
 * @returns {Array} Matching players
 */
export const searchPlayers = async (query) => {
    try {
        const url = `${BASE_URL}/players/search/${encodeURIComponent(query)}?api_token=${token}&include=team`;
        const { data } = await axios.get(url);

        return (data.data || []).map(player => ({
            id: player.id,
            name: player.common_name || player.display_name || player.name,
            full_name: player.name,
            image: player.image_path,
            nationality: player.nationality?.name,
            position: player.position?.name,
            team: player.team?.name,
            team_id: player.team?.id,
            team_logo: player.team?.image_path,
            type: 'player'
        }));
    } catch (error) {
        console.error('Error searching players:', error.message);
        return [];
    }
};

/**
 * Search all entities (teams, leagues, players) in parallel
 * @param {string} query - Search query
 * @returns {Object} Results grouped by type
 */
export const searchAll = async (query) => {
    try {
        const [teams, leagues, players] = await Promise.all([
            searchTeams(query),
            searchLeagues(query),
            searchPlayers(query)
        ]);

        return {
            teams: teams.slice(0, 10), // Limit to 10 each
            leagues: leagues.slice(0, 10),
            players: players.slice(0, 10),
            total: teams.length + leagues.length + players.length
        };
    } catch (error) {
        console.error('Error in searchAll:', error.message);
        return { teams: [], leagues: [], players: [], total: 0 };
    }
};
