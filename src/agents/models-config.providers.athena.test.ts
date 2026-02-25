import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveImplicitProviders } from "./models-config.providers.js";

const ATHENA_ID = "Qwen_Qwen3.5-35B-A3B-Q6_K";
const DEFAULT_BASE_URL = "http://athena:8081/v1";

describe("Athena provider", () => {
  const envKeys = ["ATHENA_ENABLE", "ATHENA_BASE_URL", "ATHENA_API_KEY"] as const;
  const previousEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const key of envKeys) {
      const value = previousEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("does not add the provider when disabled", async () => {
    for (const key of envKeys) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-athena-"));

    const providers = await resolveImplicitProviders({ agentDir });

    expect(providers.athena).toBeUndefined();
  });

  it("adds the provider when enabled", async () => {
    for (const key of envKeys) {
      previousEnv[key] = process.env[key];
    }
    process.env.ATHENA_ENABLE = "1";

    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-athena-"));

    const providers = await resolveImplicitProviders({ agentDir });

    expect(providers.athena?.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(providers.athena?.api).toBe("openai-responses");
    expect(providers.athena?.models?.map((model) => model.id)).toContain(ATHENA_ID);
  });
});

