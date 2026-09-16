import path from "path";
import r from "r-wrapper";
import { assertValidId, mkdirs, readJson, resolveWithin, writeJson } from "../services/utils.js";
import { sendNotification } from "../services/notifications.js";

const TREND_TYPES = new Set(["surv", "death"]);

export async function jpsurv(params, logger, env) {
  const id = assertValidId(params.id);
  const inputFolder = resolveWithin(env.INPUT_FOLDER, id);
  const outputFolder = resolveWithin(env.OUTPUT_FOLDER, id);
  const statusFilePath = resolveWithin(outputFolder, "status.json");
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
      try {
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
      } catch (notificationError) {
        logger.error(notificationError);
      }
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
  const id = assertValidId(params.id);
  const outputFolder = resolveWithin(env.OUTPUT_FOLDER, id);
  return await r.async("jpsurv/jpsurv.R", "getTrends", { params, outputFolder });
}

export async function joinpointConditional(params, logger, env) {
  const id = assertValidId(params.id);
  const outputFolder = resolveWithin(env.OUTPUT_FOLDER, id);

  return await r.async("jpsurv/jpsurv.R", "joinpointConditional", { params, outputFolder });
}

export async function getTrends(params, logger, env = process.env) {
  return await trends(params, logger, env);
}

function trendVariant(params) {
  const parts = [];
  if (params.jpTrend) parts.push("jp");
  if (params.calendarTrend) {
    const [start, end] = params.yearRange ?? [];
    const startYear = Number(start);
    const endYear = Number(end);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
      throw new Error("Invalid year range");
    }
    parts.push(`calendar-${startYear}-${endYear}`);
  }
  return parts.join("_") || "trend";
}

function getTrendPaths(params, env) {
  const id = assertValidId(params.id);
  if (!TREND_TYPES.has(params.type)) {
    throw new Error("Invalid trend type");
  }
  const cohortIndex = Number(params.cohortIndex);
  if (!Number.isInteger(cohortIndex) || cohortIndex < 0) {
    throw new Error("Invalid cohort index");
  }

  const relDir = path.posix.join("trends", params.type, String(cohortIndex), trendVariant(params));
  const outputFolder = resolveWithin(env.OUTPUT_FOLDER, id);
  const statusFilePath = resolveWithin(outputFolder, relDir, "status.json");
  const resultFilePath = resolveWithin(outputFolder, relDir, "result.json");
  return {
    statusFile: path.posix.join(relDir, "status.json"),
    resultFile: path.posix.join(relDir, "result.json"),
    statusFilePath,
    resultFilePath,
  };
}

const ACTIVE_TREND_STATUSES = ["SUBMITTED", "IN_PROGRESS", "COMPLETED"];

export async function submitTrends(params, logger, env = process.env) {
  const { statusFile, resultFile, statusFilePath, resultFilePath } = getTrendPaths(params, env);
  await mkdirs([path.dirname(statusFilePath)]);

  const existing = await readJson(statusFilePath);
  if (existing && ACTIVE_TREND_STATUSES.includes(existing.status)) {
    return { status: existing.status, statusFile, resultFile };
  }

  await writeJson(statusFilePath, { status: "SUBMITTED", submittedAt: new Date() });
  runTrends(params, statusFilePath, resultFilePath, logger, env).catch(console.error);
  return { status: "SUBMITTED", statusFile, resultFile };
}

export async function runTrends(params, statusFilePath, resultFilePath, logger, env = process.env) {
  const prevStatus = (await readJson(statusFilePath)) || {};
  const start = new Date();

  await writeJson(statusFilePath, { ...prevStatus, status: "IN_PROGRESS" });

  try {
    const result = await getTrends(params, logger, env);
    await writeJson(resultFilePath, result);
    await writeJson(statusFilePath, { ...prevStatus, status: "COMPLETED", done: new Date() });
  } catch (error) {
    logger.error(error);
    await writeJson(statusFilePath, {
      ...prevStatus,
      status: "FAILED",
      done: new Date(),
      error: error.message,
    });
  } finally {
    logger.info(`Trends duration: ${(new Date() - start) / 1000} seconds`);
  }
}

export async function recalculateConditional(params, logger, env = process.env) {
  return await joinpointConditional(params, logger, env);
}
