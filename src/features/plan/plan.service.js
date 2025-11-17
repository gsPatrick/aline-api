import { Plan } from "../../models/index.js";
import { createPlan as mpCreatePlan } from "../../services/mercadoPago.service.js";

export const createPlan = async ({
  title,
  price,
  currency = "BRL",
  frequency = 1,
  frequency_type = "months",
}) => {
  if (!title || price == null) {
    throw new Error("title e price são obrigatórios");
  }

  if (price <= 0) {
    throw new Error("price deve ser maior que zero");
  }

  let mpPlan;
  try {
    mpPlan = await mpCreatePlan({
      title,
      price: Number(price),
      currency,
      frequency,
      frequency_type,
    });
  } catch (err) {
    throw new Error(`Falha ao criar plano no MercadoPago: ${err.message}`);
  }

  try {
    const plan = await Plan.create({
      title,
      price: Number(price),
      currency,
      frequency,
      frequency_type,
      mpPlanId: mpPlan.id,
      isActive: true,
    });
    return plan;
  } catch (err) {
    throw new Error(`Falha ao salvar plano no banco: ${err.message}`);
  }
};

export const listPlans = async () => Plan.findAll({ order: [["id", "DESC"]] });

export const updatePlan = async (id, data) => {
  const plan = await Plan.findByPk(id);
  if (!plan) {
    throw new Error("Plano não encontrado");
  }
  await Plan.update(data, { where: { id } });
  return Plan.findByPk(id);
};

export const deletePlan = async (id) => {
  const plan = await Plan.findByPk(id);
  if (!plan) {
    throw new Error("Plano não encontrado");
  }
  await Plan.update({ isActive: false }, { where: { id } });
  return Plan.findByPk(id);
};


