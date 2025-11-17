export const errorMiddleware = (err, req, res, _next) => {
  console.error("Erro:", err);
  res.status(err?.status || 500).json({ error: err?.message || "Erro interno" });
};

