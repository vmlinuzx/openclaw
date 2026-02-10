import { Type } from "@sinclair/typebox";
import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import type { AnyAgentTool } from "./common.js";
import { loadConfig } from "../../config/config.js";
import { textToSpeech } from "../../tts/tts.js";
import { readStringParam } from "./common.js";

// Symlink TTS audio into a workspace-relative directory so the MEDIA: token
// passes the isValidMedia() security check (which only allows ./relative paths).
// The symlink is nearly free (no file copy) and the real file stays in /tmp
// until the TTS engine's own scheduleCleanup removes it.
const TTS_SYMLINK_DIR = ".openclaw-tts";

function symlinkTtsAudio(absolutePath: string): string {
  const dir = path.resolve(TTS_SYMLINK_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const linkName = `${Date.now()}-${path.basename(absolutePath)}`;
  const linkPath = path.join(dir, linkName);
  try {
    fs.symlinkSync(absolutePath, linkPath);
  } catch {
    // If symlinking fails (e.g. unsupported FS), fall back to the absolute path.
    return absolutePath;
  }
  return `./${TTS_SYMLINK_DIR}/${linkName}`;
}

const TtsToolSchema = Type.Object({
  text: Type.String({ description: "Text to convert to speech." }),
  channel: Type.Optional(
    Type.String({ description: "Optional channel id to pick output format (e.g. telegram)." }),
  ),
});

export function createTtsTool(opts?: {
  config?: OpenClawConfig;
  agentChannel?: GatewayMessageChannel;
}): AnyAgentTool {
  return {
    label: "TTS",
    name: "tts",
    description:
      "Convert text to speech and return a MEDIA: path. Use when the user requests audio or TTS is enabled. Copy the MEDIA line exactly.",
    parameters: TtsToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const text = readStringParam(params, "text", { required: true });
      const channel = readStringParam(params, "channel");
      const cfg = opts?.config ?? loadConfig();
      const result = await textToSpeech({
        text,
        cfg,
        channel: channel ?? opts?.agentChannel,
      });

      if (result.success && result.audioPath) {
        const lines: string[] = [];
        // Tag Telegram Opus output as a voice bubble instead of a file attachment.
        if (result.voiceCompatible) {
          lines.push("[[audio_as_voice]]");
        }
        const mediaPath = symlinkTtsAudio(result.audioPath);
        lines.push(`MEDIA:${mediaPath}`);
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: { audioPath: result.audioPath, provider: result.provider },
        };
      }

      return {
        content: [
          {
            type: "text",
            text: result.error ?? "TTS conversion failed",
          },
        ],
        details: { error: result.error },
      };
    },
  };
}
