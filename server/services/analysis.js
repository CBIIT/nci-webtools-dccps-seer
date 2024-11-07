import path from "path";
import { mkdirs, readJson, writeJson } from "./utils.js";
import { getWorker } from "./workers.js";
import { calendarTrends, joinpointConditional } from "../jpsurv/jpsurv.js";

const { WORKER_TYPE } = process.env;

export async function submit(params, data, env = process.env) {
  const { id } = params;
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const paramsFilePath = path.resolve(inputFolder, "params.json");
  const dataFilePath = path.resolve(inputFolder, "seerStatData.json");
  const statusFilePath = path.resolve(outputFolder, "status.json");
  await mkdirs([inputFolder, outputFolder]);

  const worker = getWorker(params.sendNotification ? WORKER_TYPE : "local");
  const status = { id, status: "SUBMITTED", submittedAt: new Date() };

  await writeJson(paramsFilePath, params);
  await writeJson(dataFilePath, data);
  await writeJson(statusFilePath, status);

  worker(id).catch(console.error);
  return status;
}

export async function getCalendarTrends(params, logger, env = process.env) {
  return await calendarTrends(params, logger, env);
}

export async function recalculateConditional(params, logger, env = process.env) {
  return await joinpointConditional(params, logger, env);
}
