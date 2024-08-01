import path from "path";
import r from "r-wrapper";
import { writeJson } from "../services/utils.js";

export async function jpsurv(params, logger, env) {
  const id = params.id;
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const statusFilePath = path.resolve(outputFolder, "status.json");

  await writeJson(statusFilePath, { id, status: "IN PROGRESS" });

  try {
    const data = await r.async("analysis/jpsurv.R", "calculateJoinpoint", { inputFolder, outputFolder });
    console.log("worker done");

    await writeJson(statusFilePath, { id, status: "COMPLETED" });
  } catch (error) {
    logger.error(error);
    await writeJson(statusFilePath, { id, status: "FAILED", error: error.message });
  }
  return false;
}
