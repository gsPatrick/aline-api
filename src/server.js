import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./services/socket.js";
import { sequelize } from "./models/index.js";
import { startCron } from "./services/cron.js";

const port = process.env.PORT;
const httpServer = createServer(app);
initSocket(httpServer);

const start = async () => {
  try {
    await sequelize.sync();
    httpServer.listen(port, () => {
      console.log(`API rodando em http://localhost:${port}`);
    });
    startCron();
  } catch (err) {
    console.error("Falha ao iniciar servidor", err);
    process.exit(1);
  }
};

start();
