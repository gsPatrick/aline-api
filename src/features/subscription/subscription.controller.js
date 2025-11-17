import {
  startSubscription,
  syncSubscriptionStatus,
  getUserSubscription,
} from "./subscription.service.js";

export const subscribe = async (req, res, next) => {
  try {
    const { planId, externalReference } = req.body || {};
    if (!planId) return res.status(400).json({ error: "planId é obrigatório" });
    const result = await startSubscription(req.user, {
      planId,
      externalReference,
    });
    res.json({
      subscriptionId: result.subscriptionId,
      status: result.status,
      checkoutUrl: result.initPoint,
      initPoint: result.initPoint,
    });
  } catch (e) {
    next(e);
  }
};

export const me = async (req, res, next) => {
  try {
    const result = await getUserSubscription(req.user.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const webhook = async (req, res, next) => {
  try {
    const data = req.body;
    
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const supportedActions = new Set([
      "preapproval.created",
      "preapproval.updated",
      "preapproval.paused",
      "preapproval.cancelled",
    ]);

    if (supportedActions.has(data?.action)) {
      const subId = data?.data?.id;
      if (subId) {
        await syncSubscriptionStatus(subId);
      }
    }
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};


