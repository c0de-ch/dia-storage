import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  // Ask before applying when a person is at the terminal. In the container's
  // init step (deploy/helm) there is no terminal: the push runs unattended,
  // and statements that would drop data still need --force to pass.
  strict: process.stdin.isTTY === true,
});
