import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true, // Use describe/test/expect without imports (Jest compat)
    environment: "jsdom", // 'jsdom' | 'happy-dom' | 'browser'
    include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    reporters: ["verbose"],
    coverage: {
      provider: "v8", // v8-based instead of Jest's babel
      include: ["src/**"],
      // exclude: ["**/*.test.ts"],
    },
  },
});
