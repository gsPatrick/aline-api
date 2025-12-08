import { getMatchStats } from "./match.service.js";

export const getMatchStatsController = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await getMatchStats(id);
        res.json(stats);
    } catch (error) {
        console.error("Error fetching match stats:", error);
        res.status(500).json({ error: error.message });
    }
};
