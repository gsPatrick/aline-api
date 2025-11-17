import { User, Subscription, Notification } from "../../models/index.js";

export const listUsers = async (req, res, next) => {
  try {
    res.json(await User.findAll({ limit: 200, order: [["id", "DESC"]] }));
  } catch (e) {
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    await User.update(req.body, { where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const listSubscriptions = async (req, res, next) => {
  try {
    res.json(
      await Subscription.findAll({ limit: 200, order: [["id", "DESC"]] })
    );
  } catch (e) {
    next(e);
  }
};

export const listNotifications = async (req, res, next) => {
  try {
    res.json(
      await Notification.findAll({ limit: 200, order: [["id", "DESC"]] })
    );
  } catch (e) {
    next(e);
  }
};


