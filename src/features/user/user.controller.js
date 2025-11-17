import {
  loginUser,
  registerUser,
  requestReset,
  resetPassword,
  getUserProfile,
  updateUserProfile,
} from "./user.service.js";

export const register = async (req, res, next) => {
  try {
    const u = await registerUser(req.body);
    res.json({ id: u.id, email: u.email });
  } catch (e) {
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await loginUser(req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const forgot = async (req, res, next) => {
  try {
    await requestReset(req.body.email);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const reset = async (req, res, next) => {
  try {
    await resetPassword(req.body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user.id);
    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await updateUserProfile(req.user.id, req.body);
    res.json(user);
  } catch (e) {
    next(e);
  }
};


