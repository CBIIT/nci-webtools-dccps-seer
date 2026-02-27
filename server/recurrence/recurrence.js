import path from "path";
import { readJson, writeJson } from "../services/utils.js";
import { sendNotification } from "../services/notifications.js";
import { fileURLToPath } from "url";
import r from "r-wrapper";

const sourcePathV1 = fileURLToPath(new URL("recurrenceV1.R", import.meta.url));
const sourcePathV2 = fileURLToPath(new URL("recurrenceV2.R", import.meta.url));

export const recurrenceFunctions = {
  v1: {
    getRiskFromGroupData: (params) => r.async(sourcePathV1, "getRiskFromGroupData", params),
    getRiskFromIndividualData: (params) => r.async(sourcePathV1, "getRiskFromIndividualData", params),
  },
  v2: {
    getRiskFromGroupData: (params) => r.async(sourcePathV2, "getRiskFromGroupData", params),
    getRiskFromIndividualData: (params) => r.async(sourcePathV2, "getRiskFromIndividualData", params),
  },
};

/**
 * Worker entry point for recurrence jobs — called from worker.js and runLocalWorker.
 * Runs the R calculation, writes results.json, and sends email notification.
 * @param {object} params - Parsed params.json from INPUT_FOLDER
 * @param {import("winston").Logger} logger
 * @param {NodeJS.ProcessEnv} env
 */
export async function recurrence(params, logger, env) {
  const { id, version, functionName, sendNotification: notify, email, jobName } = params;

  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const statusFilePath = path.resolve(outputFolder, "status.json");
  const resultsFilePath = path.resolve(outputFolder, "results.json");

  const data = await readJson(path.resolve(inputFolder, "data.json"));
  const prevStatus = await readJson(statusFilePath);
  const submittedAt = new Date(prevStatus?.submittedAt).toDateString();

  await writeJson(statusFilePath, { ...prevStatus, id, status: "IN_PROGRESS" });

  const start = new Date();
  try {
    const results = await recurrenceFunctions[version][functionName]({ ...params, ...data });
    await writeJson(resultsFilePath, results);
    await writeJson(statusFilePath, { ...prevStatus, id, status: "COMPLETED", done: new Date() });

    if (notify) {
      logger.info("Sending results email");
      await sendNotification(
        email,
        `Recurrence Risk - ${jobName} - ${submittedAt} EST`,
        "templates/user-success-recurrence-email.html",
        {
          ...params,
          timestamp: submittedAt,
          resultsUrl: `${env.APP_BASE_URL}/recurrence?id=${id}`,
          emailAdmin: env.EMAIL_ADMIN,
        },
        env
      );
    }
  } catch (error) {
    logger.error(error);
    const status = { ...prevStatus, id, status: "FAILED", done: new Date(), error: error.message };
    await writeJson(statusFilePath, status);

    if (notify) {
      logger.info("Sending user error email");
      await sendNotification(
        email,
        `Recurrence Risk Error - ${jobName} - ${submittedAt} EST`,
        "templates/user-failure-email.html",
        {
          ...params,
          appName: "Recurrence Risk",
          timestamp: submittedAt,
          error: error.message?.toString(),
          emailAdmin: env.EMAIL_ADMIN,
        },
        env
      );
    }
  } finally {
    logger.info(`Duration: ${(new Date() - start) / 1000} seconds`);
  }
}
