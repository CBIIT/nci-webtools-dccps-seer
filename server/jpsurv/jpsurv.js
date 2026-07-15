import path from "path";
import r from "r-wrapper";
import { readJson, writeJson } from "../services/utils.js";
import { sendNotification } from "../services/notifications.js";

export async function jpsurv(params, logger, env) {
  const id = params.id;
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const statusFilePath = path.resolve(outputFolder, "status.json");
  const prevStatus = await readJson(statusFilePath);
  const submittedAt = new Date(prevStatus.submittedAt).toDateString();

  await writeJson(statusFilePath, { id, status: "IN_PROGRESS" });

  const start = new Date();
  try {
    const data = await r.async("jpsurv/jpsurv.R", "calculateJoinpoint", { inputFolder, outputFolder });
    console.log("worker done");
    await writeJson(statusFilePath, { ...prevStatus, status: "COMPLETED", done: new Date() });
    if (params.sendNotification) {
      logger.info(`Sending results email`);
      await sendNotification(
        params.email,
        `JPSurv - ${params.jobName} - ${submittedAt} EST`,
        "templates/user-success-email.html",
        {
          appName: "JPSurv",
          submittedAt,
          resultsUrl: `${env.APP_BASE_URL}/jpsurv?id=${id}`,
          emailAdmin: env.EMAIL_ADMIN,
          jobName: params.jobName,
        }
      );
    }
  } catch (error) {
    logger.error(error);
    const status = { ...prevStatus, status: "FAILED", done: new Date(), error: error.message };
    await writeJson(statusFilePath, status);
    if (params.sendNotification) {
      logger.info(`Sending user error email`);
      await sendNotification(
        params.email,
        `JPSurv Error - ${params.jobName} - ${submittedAt} EST`,
        "templates/user-failure-email.html",
        {
          appName: "JPSurv",
          submittedAt,
          id,
          error: error.message.toString(),
          emailAdmin: env.EMAIL_ADMIN,
          jobName: params.jobName,
        }
      );
    }
  } finally {
    logger.info(`Duration: ${(new Date() - start) / 1000} seconds`);
  }
  return false;
}

export async function trends(params, logger, env) {
  const id = params.id;
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  return await r.async("jpsurv/jpsurv.R", "getTrends", { params, outputFolder });
}

export async function joinpointConditional(params, logger, env) {
  const id = params.id;
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);

  return await r.async("jpsurv/jpsurv.R", "joinpointConditional", { params, outputFolder });
}

export async function getTrends(params, logger, env = process.env) {
  return await trends(params, logger, env);
}

export async function recalculateConditional(params, logger, env = process.env) {
  return await joinpointConditional(params, logger, env);
}
