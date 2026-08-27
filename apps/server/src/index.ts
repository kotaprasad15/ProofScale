import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createApp } from "./app.js";

const PORT = process.env.PORT || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 ProofScale Control Plane API running on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint available at http://localhost:${PORT}/trpc`);
});
