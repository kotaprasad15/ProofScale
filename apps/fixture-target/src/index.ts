import express from "express";

export function createFixtureApp() {
  const app = express();
  app.use(express.json());

  // Health Endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "ProofScale Staging Fixture Target", uptime: process.uptime() });
  });

  // Fast Product List Endpoint (10-30ms latency)
  app.get("/api/v1/products", async (req, res) => {
    const delay = Math.floor(Math.random() * 20) + 10;
    await new Promise(r => setTimeout(r, delay));

    res.json([
      { id: "prod_1", name: "Enterprise API Subscription", price: 299 },
      { id: "prod_2", name: "Load Testing Credit Bundle", price: 99 },
      { id: "prod_3", name: "Readiness Audit Report", price: 499 }
    ]);
  });

  // Order Placement Endpoint (30-80ms latency)
  app.post("/api/v1/orders", async (req, res) => {
    const delay = Math.floor(Math.random() * 50) + 30;
    await new Promise(r => setTimeout(r, delay));

    res.status(201).json({
      orderId: `ord_${Math.random().toString(36).substring(2, 9)}`,
      status: "confirmed",
      total: req.body?.total || 299,
      createdAt: new Date().toISOString()
    });
  });

  // Slow Endpoint (300-600ms latency)
  app.get("/api/v1/slow", async (req, res) => {
    const delay = Math.floor(Math.random() * 300) + 300;
    await new Promise(r => setTimeout(r, delay));

    res.json({ message: "Slow response processing completed", latencyMs: delay });
  });

  // Flaky Endpoint (15% error rate)
  app.get("/api/v1/flaky", async (req, res) => {
    const isError = Math.random() < 0.15;
    if (isError) {
      return res.status(500).json({ error: "Simulated Internal Server Error 500" });
    }
    res.json({ message: "Flaky request succeeded" });
  });

  return app;
}

if (process.env.NODE_ENV !== "test" && !process.argv.some(arg => arg.includes("test"))) {
  const PORT = process.env.PORT || 4000;
  const app = createFixtureApp();
  app.listen(PORT, () => {
    console.log(`🎯 Staging Target Fixture running on http://localhost:${PORT}`);
  });
}
