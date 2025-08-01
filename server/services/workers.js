import path from "path";
import ECS, { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { readJson } from "./utils.js";
import { createLogger } from "./logger.js";
import { jpsurv } from "../jpsurv/jpsurv.js";
import { cansurv } from "../cansurv/cansurv.js";

export function getWorkerCommand(id) {
  return ["node", ["--env-file=.env", "worker.js", id]];
}

export function getWorker(workerType = "local") {
  switch (workerType) {
    case "local":
      return runLocalWorker;
    case "fargate":
      return runFargateWorker;
    default:
      throw new Error(`Unknown worker type: ${workerType}`);
  }
}

/**
 * Executes a worker process locally.
 * @param {string} id
 * @param {string} cwd
 * @returns
 */
export async function runLocalWorker(id, env = process.env) {
  const paramsFilePath = path.resolve(env.INPUT_FOLDER, id, "params.json");
  const params = await readJson(paramsFilePath);
  const logger = createLogger(env.APP_NAME, env.LOG_LEVEL);
  if (params?.type == "cansurv") {
    return await cansurv(params, logger, env);
  } else {
    return await jpsurv(params, logger, env);
  }
}

/**
 * Executes a worker process in an AWS Fargate task.
 * @param {string} id
 * @param {string} env
 * @returns {Promise<ECS.RunTaskCommandOutput>} task output
 */
export async function runFargateWorker(id, env = process.env) {
  const { ECS_CLUSTER, SUBNET_IDS, SECURITY_GROUP_IDS, WORKER_TASK_NAME } = env;
  const client = new ECSClient();
  const workerCommand = ["node", "worker.js", id];
  const logger = createLogger(env.APP_NAME, env.LOG_LEVEL);
  const taskCommand = new RunTaskCommand({
    cluster: ECS_CLUSTER,
    count: 1,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        securityGroups: SECURITY_GROUP_IDS.split(","),
        subnets: SUBNET_IDS.split(","),
      },
    },
    taskDefinition: WORKER_TASK_NAME,
    propagateTags: "TASK_DEFINITION",
    overrides: {
      containerOverrides: [
        {
          name: "worker",
          command: workerCommand,
        },
      ],
    },
  });
  const response = await client.send(taskCommand);
  logger.info("Submitted Fargate RunTask command");
  logger.info(workerCommand);
  logger.info(response);
  return response;
}
