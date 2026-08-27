import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers/index.js";
import { createContext } from "./context.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true
  }));

  app.use(express.json());

  // Mount tRPC API handler
  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );

  // REST Health Check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "Ratecap Control Plane API" });
  });

  return app;
}
