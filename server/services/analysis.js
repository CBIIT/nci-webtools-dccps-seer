import path from "path";
import { mkdirs, readJson, writeJson } from "./utils.js";
import { getWorker } from "./workers.js";
import { calendarTrends } from "../jpsurv/jpsurv.js";

const { WORKER_TYPE } = process.env;

export async function submit(params, env = process.env) {
  const id = params.id;
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const paramsFilePath = path.resolve(inputFolder, "params.json");
  const statusFilePath = path.resolve(outputFolder, "status.json");
  await mkdirs([inputFolder, outputFolder]);

  const worker = getWorker(params.sendNotification ? WORKER_TYPE : "local");
  const status = { id, status: "SUBMITTED", submittedAt: new Date() };

  await writeJson(paramsFilePath, params);
  await writeJson(statusFilePath, status);

  worker(id).catch(console.error);
  return status;
}

export async function getCalendarTrends(params, logger, env = process.env) {
  return await calendarTrends(params, logger, env);
}
