import axios from "axios";

const baseURL = process.env.EVOLUTION_API_URL;
const instanceName = process.env.EVOLUTION_API_INSTANCE;

export const sendWhatsApp = async ({ to, message }) => {
  if (!instanceName) {
    throw new Error("EVOLUTION_API_INSTANCE não configurada");
  }

  const url = `${baseURL}/${instanceName}/message/sendText`;
  await axios.post(
    url,
    { number: to, text: message },
    { headers: { Authorization: `Bearer ${process.env.EVOLUTION_API_KEY}` } }
  );
};
