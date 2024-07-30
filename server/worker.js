import path from "path";
import { isMainModule, readJson } from "./services/utils.js";
import { createLogger } from "./services/logger.js";
import { jpsurv } from "./services/jpsurv.js";

if (isMainModule(import.meta)) {
  try {
    await main(process.argv, process.env);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

export async function main(argv = process.argv, env = process.env) {
  const id = argv[2];
  if (!id) throw new Error("Missing id");
  const paramsFilePath = path.resolve(env.INPUT_FOLDER, id, "params.json");
  const params = await readJson(paramsFilePath);
  const logger = createLogger(env.APP_NAME, env.LOG_LEVEL);
  logger.log({ params });

  return await jpsurv(params, logger, env);
}
