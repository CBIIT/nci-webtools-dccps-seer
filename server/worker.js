import { assertValidId, isMainModule, readJson, resolveWithin } from "./services/utils.js";
import { createLogger } from "./services/logger.js";
import { runAnalysis } from "./services/workers.js";

if (isMainModule(import.meta)) {
  // exitCode (not process.exit) lets beforeExit fire so dd-trace can flush spans
  try {
    await main(process.argv, process.env);
    process.exitCode = 0;
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}

export async function main(argv = process.argv, env = process.env) {
  const id = assertValidId(argv[2]);
  const paramsFilePath = resolveWithin(env.INPUT_FOLDER, id, "params.json");
  const params = await readJson(paramsFilePath);
  const logger = createLogger(`${params.worker} - ${id}`, env.LOG_LEVEL);
  logger.info(params);

  return runAnalysis(params, logger, env);
}
