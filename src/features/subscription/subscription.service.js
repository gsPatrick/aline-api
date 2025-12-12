import { Subscription, Plan } from "../../models/index.js";
import {
  createSubscription,
  getSubscription as getProviderSubscription,
} from "../../services/mercadoPago.service.js";

const mapMpStatusToLocal = (mpStatus) => {
  if (!mpStatus) return null;
  const normalized = mpStatus.toLowerCase();

  if (["authorized", "active", "approved"].includes(normalized)) {
    return "active";
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "canceled";
  }

  if (normalized === "expired") {
    return "expired";
  }

  if (["paused", "pending"].includes(normalized)) {
    return "pending";
  }

  return null;
};

const calculatePeriod = (plan) => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  const frequency = Number(plan?.frequency) || 1;
  const frequencyType = plan?.frequency_type || "months";

  if (frequencyType === "days") {
    endDate.setDate(endDate.getDate() + frequency);
  } else if (frequencyType === "months") {
    endDate.setMonth(endDate.getMonth() + frequency);
  } else if (frequencyType === "years") {
    endDate.setFullYear(endDate.getFullYear() + frequency);
  }

  return { startDate, endDate };
};

const ensurePlan = async (plan, planId) => {
  if (plan) return plan;
  const dbPlan = await Plan.findByPk(planId);
  if (!dbPlan) {
    throw new Error("Plano não encontrado");
  }
  return dbPlan;
};

const applyProviderStatus = async (subscription, mpStatus, plan) => {
  if (!mpStatus) return subscription;

  const localStatus = mapMpStatusToLocal(mpStatus);
  if (!localStatus || subscription.status === localStatus) {
    return subscription;
  }

  const updates = { status: localStatus };
  if (localStatus === "active") {
    const { startDate, endDate } = calculatePeriod(plan);
    updates.startDate = startDate;
    updates.endDate = endDate;
  }

  if (localStatus === "canceled" || localStatus === "expired") {
    updates.endDate = updates.endDate || new Date();
  }

  await subscription.update(updates);

  return subscription;
};

export const startSubscription = async (user, { planId, externalReference }) => {
  const plan = await Plan.findOne({ where: { id: planId, isActive: true } });
  if (!plan) throw new Error("Plano inválido");

  await Subscription.update(
    { status: "canceled" },
    { where: { userId: user.id, status: "pending" } }
  );

  const mpSub = await createSubscription({
    plan,
    userEmail: user.email,
    reason: plan.title,
    externalReference: externalReference || user.id,
  });

  const subscription = await Subscription.create({
    userId: user.id,
    planId: plan.id,
    status: "pending",
    paymentId: mpSub.id,
  });

  await applyProviderStatus(subscription, mpSub.status, plan);

  if (!mpSub.init_point) {
    throw new Error("MercadoPago não retornou link de checkout");
  }

  return {
    subscriptionId: mpSub.id,
    status: mpSub.status,
    initPoint: mpSub.init_point,
  };
};

export const getUserSubscription = async (userId) => {
  const subscription = await Subscription.findOne({
    where: { userId },
    include: [{ model: Plan }],
    order: [["id", "DESC"]],
  });

  if (!subscription) {
    return { status: "free", subscription: null };
  }

  const plan = subscription.Plan;

  return {
    status: subscription.status === "active" ? "premium" : subscription.status,
    subscription: {
      id: subscription.id,
      planId: subscription.planId,
      planTitle: plan?.title,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    },
  };
};

export const syncSubscriptionStatus = async (subscriptionId) => {
  const subscription = await Subscription.findOne({
    where: { paymentId: subscriptionId },
    include: [{ model: Plan }],
  });

  if (!subscription) {
    throw new Error("Assinatura não encontrada");
  }

  const mpSubscription = await getProviderSubscription(subscriptionId);
  if (!mpSubscription) {
    throw new Error("Assinatura não encontrada no MercadoPago");
  }

  const plan = await ensurePlan(subscription.Plan, subscription.planId);
  await applyProviderStatus(subscription, mpSubscription.status, plan);
};

