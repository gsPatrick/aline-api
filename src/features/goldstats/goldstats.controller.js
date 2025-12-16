import * as goldStatsService from "./goldstats.service.js";

export const getHomeData = async (req, res) => {
    try {
        const data = await goldStatsService.getHomeData();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getHomeData:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMatchHeader = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await goldStatsService.getMatchHeader(id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(`Error in getMatchHeader for ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getNextMatches = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await goldStatsService.getNextMatches(id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(`Error in getNextMatches for ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getLastMatches = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await goldStatsService.getLastMatches(id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(`Error in getLastMatches for ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getAIAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await goldStatsService.getAIAnalysis(id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(`Error in getAIAnalysis for ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
