import path from "path";
import { mkdirs, readJson, writeJson } from "./utils.js";
import { getWorker } from "./workers.js";

const { WORKER_TYPE } = process.env;

export async function submit(params, env = process.env) {
  const id = params.id;
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const paramsFilePath = path.resolve(inputFolder, "params.json");
  const statusFilePath = path.resolve(outputFolder, "status.json");
  await mkdirs([inputFolder, outputFolder]);

  const worker = getWorker(WORKER_TYPE);
  const status = { id, status: "SUBMITTED" };

  await writeJson(paramsFilePath, params);
  await writeJson(statusFilePath, status);

  worker(id).catch(console.error);
  return status;
}
