import jwt from "jsonwebtoken";
import { User, hashPassword, comparePassword } from "../../models/index.js";
import { sendEmail } from "../../services/email.service.js";

export const registerUser = async ({ name, email, password }) => {
  const exists = await User.findOne({ where: { email } });
  if (exists) throw new Error("E-mail já cadastrado");
  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
  return user;
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ where: { email, isActive: true } });
  if (!user) throw new Error("Credenciais inválidas");
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new Error("Credenciais inválidas");
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return { token, user };
};

export const requestReset = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return;
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const apiUrl = process.env.API_URL || "https://10stats-dezstatsapi.qc6ju4.easypanel.host";
  const link = `${apiUrl}/reset?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Redefinição de senha",
    html: `<p>Clique para redefinir: <a href="${link}">${link}</a></p>`,
  });
};

export const resetPassword = async ({ token, newPassword }) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const passwordHash = await hashPassword(newPassword);
    await User.update({ passwordHash }, { where: { id: payload.id } });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token expirado. Solicite um novo link de redefinição.");
    }
    if (err.name === "JsonWebTokenError") {
      throw new Error("Token inválido.");
    }
    throw err;
  }
};

export const getUserProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ["passwordHash"] },
  });
  if (!user) {
    throw new Error("Usuário não encontrado");
  }
  return user;
};

export const updateUserProfile = async (userId, data) => {
  const { role: _role, isActive: _isActive, passwordHash: _passwordHash, ...allowedFields } = data;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("Usuário não encontrado");
  }
  if (allowedFields.email && allowedFields.email !== user.email) {
    const exists = await User.findOne({ where: { email: allowedFields.email } });
    if (exists) {
      throw new Error("E-mail já cadastrado");
    }
  }
  await User.update(allowedFields, { where: { id: userId } });
  return User.findByPk(userId, {
    attributes: { exclude: ["passwordHash"] },
  });
};


