const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createApp } = require("../src/server");

function startServer() {
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: "127.0.0.1", port, path }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      })
      .on("error", reject);
  });
}

test("GET / returns service metadata", async () => {
  const { server, port } = await startServer();
  try {
    const res = await get(port, "/");
    assert.equal(res.status, 200);
    assert.equal(res.body.service, "devops-insights-lab");
    assert.ok(res.body.message.includes("Hello"));
  } finally {
    server.close();
  }
});

test("GET /health returns ok", async () => {
  const { server, port } = await startServer();
  try {
    const res = await get(port, "/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok" });
  } finally {
    server.close();
  }
});
