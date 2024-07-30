import path from "path";
import r from "r-wrapper";
import { writeJson } from "../services/utils.js";

export async function jpsurv(params, logger, env) {
  const id = params.id;
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const statusFilePath = path.resolve(outputFolder, "status.json");

  const data = await r.async("analysis/jpsurv.R", "calculateJoinpoint", { inputFolder, outputFolder });
  const status = { id, status: "COMPLETED" };

  await writeJson(statusFilePath, status);

  console.log(data);
  return data;
}
