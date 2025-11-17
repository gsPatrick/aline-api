import { createPlan, listPlans, updatePlan, deletePlan } from "./plan.service.js";

export const create = async (req, res, next) => {
  try {
    const { title, price, currency, frequency, frequency_type } = req.body || {};
    if (!title || price == null) return res.status(400).json({ error: "title e price são obrigatórios" });
    const plan = await createPlan({ title, price, currency, frequency, frequency_type });
    res.json(plan);
  } catch (e) {
    next(e);
  }
};

export const index = async (req, res, next) => {
  try {
    res.json(await listPlans());
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const plan = await updatePlan(id, req.body || {});
    res.json(plan);
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const plan = await deletePlan(id);
    res.json(plan);
  } catch (e) {
    next(e);
  }
};


