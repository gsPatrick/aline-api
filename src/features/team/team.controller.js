import * as teamService from './team.service.js';

export const getTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const token = process.env.SPORTMONKS_API_TOKEN;

        if (!token) {
            return res.status(500).json({ error: "Server configuration error: API Token missing" });
        }

        const data = await teamService.getTeamData(id, token);
        res.json(data);
    } catch (error) {
        console.error("Controller Error:", error.message);
        res.status(500).json({ error: "Failed to fetch team data" });
    }
};
