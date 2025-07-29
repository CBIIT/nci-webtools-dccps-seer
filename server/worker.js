import path from "path";
import { isMainModule, readJson } from "./services/utils.js";
import { createLogger } from "./services/logger.js";
import { jpsurv } from "./jpsurv/jpsurv.js";
import { cansurv } from "./cansurv/cansurv.js";

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
  const logger = createLogger(`${env.APP_NAME} - ${params.id}`, env.LOG_LEVEL);
  logger.info(params);

  if (params?.type == "cansurv") {
    return await cansurv(params, logger, env);
  } else {
    return await jpsurv(params, logger, env);
  }
}
