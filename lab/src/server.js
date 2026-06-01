const express = require("express");

const PORT = process.env.PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || "devops-insights-lab";
const RELEASE_VERSION = process.env.RELEASE_VERSION || "0.1.0";

function createApp() {
  const app = express();

  app.get("/", (_req, res) => {
    res.json({
      service: SERVICE_NAME,
      version: RELEASE_VERSION,
      message: "Hello from the DevOps Insights lab — webhook test PR",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT} version=${RELEASE_VERSION}`);
  });
}

module.exports = { createApp };
