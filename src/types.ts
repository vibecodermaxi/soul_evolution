export type ArtFormat =
  | "svg"
  | "html"
  | "poem"
  | "prose"
  | "ascii"
  | "code"
  | "music"
  | "image"
  | "text";

export interface Config {
  projectRoot: string;
  soulFile: string;
  soulSeed: string;
  journalDir: string;
  evolutionFile: string;
  promptsDir: string;
  siteDir: string;
  model: string;
  imageModel: string;
  maxTokens: number;
  defaultPieces: number;
  defaultInterval: number;
}

export interface GitConfig {
  repoUrl: string;
  branch: string;
}

export interface CliArgs {
  fast: boolean;
  interval: number;
  pieces: number;
  model: string | null;
}

export interface ArtPiece {
  slug: string;
  title: string;
  format: ArtFormat;
  breadcrumb: string;
  imageUrl?: string;
}

export interface ParsedCreation {
  title: string;
  format: ArtFormat;
  content: string;
  breadcrumb: string;
}

export interface ParsedMutation {
  soulUpdate: string;
  mutationNotes: string;
  evolutionEntry: string;
}
