import path from "path";
import { simpleGit, SimpleGit } from "simple-git";
import { getConfig, getGitConfig, PROJECT_ROOT } from "./config.js";
import { runOrchestrator } from "./orchestrator.js";
import { log } from "./utils/logger.js";
import { pathExists } from "./utils/files.js";
import type { CliArgs } from "./types.js";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const config = getConfig();

  const result: CliArgs = {
    fast: false,
    interval: config.defaultInterval,
    pieces: config.defaultPieces,
    model: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--fast":
        result.fast = true;
        break;
      case "--interval":
        result.interval = parseInt(args[++i], 10);
        break;
      case "--pieces":
        result.pieces = parseInt(args[++i], 10);
        break;
      case "--model":
        result.model = args[++i];
        break;
      default:
        log.warning(`Unknown argument: ${args[i]}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

async function gitSetup(git: SimpleGit): Promise<void> {
  await git.addConfig("user.email", "soul@evolution.art");
  await git.addConfig("user.name", "Soul Evolution");
}

async function gitPull(git: SimpleGit): Promise<void> {
  const gitConfig = getGitConfig();

  if (!gitConfig.repoUrl) {
    log.info("No SOUL_REPO_URL set — skipping git pull (local mode)");
    return;
  }

  log.info("Pulling latest from remote...");

  const gitDir = path.join(PROJECT_ROOT, ".git");
  if (!(await pathExists(gitDir))) {
    log.info("Cloning repo...");
    const tmpDir = "/tmp/soul-repo";
    const tmpGit = simpleGit();
    await tmpGit.clone(gitConfig.repoUrl, tmpDir, [
      "--branch",
      gitConfig.branch,
    ]);

    // Sync contents using cp + rsync approach
    const { execSync } = await import("child_process");
    execSync(`rsync -a --exclude=.git ${tmpDir}/ ${PROJECT_ROOT}/`);
    execSync(`cp -r ${tmpDir}/.git ${PROJECT_ROOT}/`);
    execSync(`rm -rf ${tmpDir}`);
  } else {
    await git.remote(["set-url", "origin", gitConfig.repoUrl]);
    await git.fetch("origin", gitConfig.branch);
    await git.reset(["--hard", `origin/${gitConfig.branch}`]);
  }
}

async function gitPush(git: SimpleGit, dayNumber: number): Promise<void> {
  const gitConfig = getGitConfig();

  if (!gitConfig.repoUrl) {
    log.info("No SOUL_REPO_URL set — skipping git push (local mode)");
    return;
  }

  log.info("Committing and pushing...");
  await git.add("-A");
  await git.commit(
    `day ${String(dayNumber).padStart(3, "0")}: soul evolution`
  );
  await git.push("origin", gitConfig.branch);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log.info("=".repeat(60));
  log.info("SOUL EVOLUTION RUNNER");
  log.info("=".repeat(60));

  // Verify API key
  if (!process.env.OPENROUTER_API_KEY) {
    log.error("OPENROUTER_API_KEY not set!");
    process.exit(1);
  }

  const cliArgs = parseArgs();
  const git = simpleGit(PROJECT_ROOT);

  // Git setup & pull
  await gitSetup(git);
  await gitPull(git);

  // Run orchestrator
  const dayNumber = await runOrchestrator(cliArgs);

  // Git push
  await gitPush(git, dayNumber);

  log.info("Done.");
}

main().catch((err) => {
  log.error(`Fatal: ${err}`);
  process.exit(1);
});
