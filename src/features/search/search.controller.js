// Search Controller - Handle search API requests
import * as searchService from './search.service.js';

/**
 * GET /api/search
 * Query params: q (query), type (all|teams|leagues|players)
 */
export const search = async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Query must be at least 2 characters'
            });
        }

        const query = q.trim();
        let results;

        switch (type.toLowerCase()) {
            case 'teams':
                results = { teams: await searchService.searchTeams(query) };
                break;
            case 'leagues':
                results = { leagues: await searchService.searchLeagues(query) };
                break;
            case 'players':
                results = { players: await searchService.searchPlayers(query) };
                break;
            case 'all':
            default:
                results = await searchService.searchAll(query);
                break;
        }

        res.json({
            success: true,
            query,
            type,
            data: results
        });
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
};
