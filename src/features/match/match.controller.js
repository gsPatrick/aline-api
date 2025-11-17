import { listLive, statsById } from "./match.service.js";

export const live = async (req, res, next) => {
  try {
    res.json(await listLive());
  } catch (e) {
    next(e);
  }
};

export const stats = async (req, res, next) => {
  try {
    res.json(await statsById(req.params.id));
  } catch (e) {
    next(e);
  }
};


