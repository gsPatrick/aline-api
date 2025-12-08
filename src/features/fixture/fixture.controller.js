// Fixture Controller - Dashboard endpoints

import {
    getFixturesByDate,
    getLiveFixtures,
    getFixturesForDates
} from '../../services/fixture.service.js';

/**
 * GET /api/fixtures/date/:date
 * Get all fixtures for a specific date, grouped by league
 */
export const getByDate = async (req, res, next) => {
    try {
        const { date } = req.params;

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                error: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const fixtures = await getFixturesByDate(date);

        res.json({
            success: true,
            date: date,
            total_leagues: fixtures.length,
            total_fixtures: fixtures.reduce((sum, league) => sum + league.fixtures.length, 0),
            data: fixtures
        });
    } catch (error) {
        console.error('Error in getByDate controller:', error);
        next(error);
    }
};

/**
 * GET /api/fixtures/live
 * Get all currently live fixtures, grouped by league
 */
export const getLive = async (req, res, next) => {
    try {
        const fixtures = await getLiveFixtures();

        res.json({
            success: true,
            total_leagues: fixtures.length,
            total_fixtures: fixtures.reduce((sum, league) => sum + league.fixtures.length, 0),
            data: fixtures
        });
    } catch (error) {
        console.error('Error in getLive controller:', error);
        next(error);
    }
};

/**
 * GET /api/fixtures/today
 * Convenience endpoint for today's fixtures
 */
export const getToday = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const fixtures = await getFixturesByDate(today);

        res.json({
            success: true,
            date: today,
            total_leagues: fixtures.length,
            total_fixtures: fixtures.reduce((sum, league) => sum + league.fixtures.length, 0),
            data: fixtures
        });
    } catch (error) {
        console.error('Error in getToday controller:', error);
        next(error);
    }
};

/**
 * GET /api/fixtures/week
 * Get fixtures for the next 7 days
 */
export const getWeek = async (req, res, next) => {
    try {
        const dates = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }

        const fixturesByDate = await getFixturesForDates(dates);

        res.json({
            success: true,
            dates: dates,
            data: fixturesByDate
        });
    } catch (error) {
        console.error('Error in getWeek controller:', error);
        next(error);
    }
};
