import path from "path";
import { fileURLToPath } from "url";
import type { Config, GitConfig, ArtFormat } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "..");

export function getConfig(): Config {
  return {
    projectRoot: PROJECT_ROOT,
    soulFile: path.join(PROJECT_ROOT, "soul", "SOUL.md"),
    soulSeed: path.join(PROJECT_ROOT, "soul", "SOUL.seed.md"),
    journalDir: path.join(PROJECT_ROOT, "journal", "days"),
    evolutionFile: path.join(PROJECT_ROOT, "journal", "EVOLUTION.md"),
    promptsDir: path.join(PROJECT_ROOT, "prompts"),
    siteDir: path.join(PROJECT_ROOT, "site"),
    model: process.env.SOUL_MODEL ?? "anthropic/claude-opus-4.6",
    imageModel:
      process.env.SOUL_IMAGE_MODEL ?? "google/gemini-3-pro-image-preview",
    maxTokens: parseInt(process.env.SOUL_MAX_TOKENS ?? "8192", 10),
    defaultPieces: parseInt(process.env.SOUL_PIECES_PER_DAY ?? "6", 10),
    defaultInterval: parseInt(process.env.SOUL_INTERVAL_SECONDS ?? "7200", 10),
  };
}

export function getGitConfig(): GitConfig {
  return {
    repoUrl: process.env.SOUL_REPO_URL ?? "",
    branch: process.env.SOUL_GIT_BRANCH ?? "main",
  };
}

export const EXT_MAP: Record<ArtFormat, string> = {
  svg: ".svg",
  html: ".html",
  poem: ".md",
  prose: ".md",
  ascii: ".txt",
  code: ".ts",
  music: ".md",
  image: ".png",
  text: ".md",
};
