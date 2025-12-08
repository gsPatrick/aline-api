import { checkHealth } from "./service.js";

export const healthCheckController = async (req, res) => {
    const status = await checkHealth();
    res.status(200).json(status);
};
