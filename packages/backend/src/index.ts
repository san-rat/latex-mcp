import express from "express";

// Placeholder entrypoint for the shared backend service.
// CLSI client + session manager + WebSocket broadcast land here in a later step.

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`latex-mcp backend listening on http://localhost:${port}`);
});
