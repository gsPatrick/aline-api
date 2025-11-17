import { Notification, User } from "../models/index.js";
import { sendWhatsApp } from "./whatsapp.service.js";

export const notifyUser = async ({
  userId,
  message,
  via = ["websocket"],
  phoneNumber,
}) => {
  const results = [];

  if (via.includes("websocket") && global.__io) {
    global.__io.sendToUser(userId, "alert:new", { message, ts: Date.now() });
    results.push(
      await Notification.create({
        userId,
        type: "websocket",
        message,
        status: "sent",
      })
    );
  }

  if (via.includes("whatsapp")) {
    let phone = phoneNumber;

    if (!phone) {
      const user = await User.findByPk(userId);
      phone = user?.phone || null;
    }

    if (!phone) {
      results.push(
        await Notification.create({
          userId,
          type: "whatsapp",
          message,
          status: "failed",
        })
      );
    } else {
      try {
        await sendWhatsApp({ to: phone, message });
        results.push(
          await Notification.create({
            userId,
            type: "whatsapp",
            message,
            status: "sent",
          })
        );
      } catch (_err) {
        results.push(
          await Notification.create({
            userId,
            type: "whatsapp",
            message,
            status: "failed",
          })
        );
      }
    }
  }

  return results;
};

export const notifyUsers = async ({
  userIds = [],
  message,
  via = ["websocket"],
}) => {
  const promises = userIds.map((id) =>
    notifyUser({ userId: id, message, via })
  );
  return Promise.all(promises);
};
