import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src or dist -> backend -> packages -> repo root
const repoRoot = path.resolve(__dirname, "../../..");

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  clsiUrl: process.env.CLSI_URL ?? "http://localhost:3013",
  compilesDir:
    process.env.CLSI_COMPILES_DIR ?? path.join(repoRoot, "clsi-data", "compiles"),
};
