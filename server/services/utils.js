import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { mkdir, writeFile, readFile, copyFile, readdir } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import template from "lodash/template.js";
import { pickBy } from "lodash-es";
import { validate as isUuid } from "uuid";

// promisified executeFile
export const execFileAsync = promisify(execFile);

/**
 * Resolves path segments against a base directory and throws if the result escapes it.
 * @param {string} baseDir
 * @param {...string} segments
 * @returns {string}
 */
export function resolveWithin(baseDir, ...segments) {
  const base = path.resolve(baseDir);
  const target = path.resolve(base, ...segments);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Resolved path escapes the base directory");
  }
  return target;
}

/**
 * Asserts that id is a valid UUID and returns it.
 * @param {string} id
 * @returns {string}
 */
export function assertValidId(id) {
  if (!isUuid(id)) {
    throw new Error("Invalid workspace id");
  }
  return id;
}

/**
 * Returns a basename-only filename, rejecting empty / `.` / `..`.
 * @param {string} name
 * @returns {string}
 */
export function assertSafeFilename(name) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Invalid filename");
  }
  const safe = path.basename(name);
  if (!safe || safe === "." || safe === "..") {
    throw new Error("Invalid filename");
  }
  return safe;
}

/**
 * Checks if the current module is the main module.
 * @param {ImportMeta} importMeta
 * @param {NodeJS.ProcessEnv} env
 * @returns
 */
export function isMainModule(importMeta, env = process.env) {
  const mainModulePath = env.pm_exec_path || process.argv[1];
  const currentModulePath = fileURLToPath(importMeta.url);
  return mainModulePath === currentModulePath;
}

/**
 * Creates directories if they don't exist.
 * @param {string[]} dirs
 * @returns
 */
export async function mkdirs(dirs) {
  return await Promise.all(dirs.map((dir) => mkdir(dir, { recursive: true })));
}

/**
 * Writes json to a file.
 * @param {string} filepath
 * @param {any} data
 * @returns {Promise<void>} fulfilled when the file is written
 */
export async function writeJson(filepath, data) {
  return await writeFile(filepath, JSON.stringify(data), "utf-8");
}

/**
 * Reads json from a file.
 * @param {string} filepath
 * @returns {any} data
 */
export async function readJson(filepath) {
  try {
    const data = await readFile(filepath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export async function renderTemplate(filepath, data) {
  const templateContents = await readFile(filepath, "utf8");
  return template(templateContents)(data);
}

/**
 * Selects the first file which exists from the given list of files.
 * @param {string[]} filePaths
 * @returns string
 */
export function coalesceFilePaths(filePaths) {
  for (const filePath of filePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }
}

/**
 * Removes the file extension from the given file path.
 * @param {string} filePath
 * @returns {string} The file path without the extension.
 */
export function stripExtension(filePath) {
  if (!filePath) return null;
  const { dir, name } = path.parse(filePath);
  return path.join(dir, name);
}

/**
 * Copies files from the given source directory to the given destination directory.
 * @param {string} source Source directory path
 * @param {string} destination Destination directory path
 * @param {boolean} overwrite Overwrite existing files
 */
export async function copyFiles(source, destination, overwrite = false) {
  const sourceFiles = await readdir(source, { withFileTypes: true });
  for (const file of sourceFiles.filter((f) => f.isFile())) {
    const sourceFilePath = path.resolve(source, file.name);
    const destinationFilePath = path.resolve(destination, file.name);
    if (overwrite || !existsSync(destinationFilePath)) {
      await copyFile(sourceFilePath, destinationFilePath);
    }
  }
}

/**
 * Returns a new object containing only the properties of the input object whose values are not null.
 *
 * @param {Object} object - The source object to pick properties from.
 * @returns {Object} A new object with only the properties whose values are not null.
 */
export function pickNonNullValues(object) {
  return pickBy(object, (v) => v !== null);
}

//
/**
 * async generator for retrieving paths for all files under a given directory
 * @param {string} filePath
 * @returns {AsyncGenerator} async generator to consume
 * consume the generator like so:
 * for await (const f of getFiles(filePath)) {
    if (f) ...
  }
 */
export async function* getFiles(filePath) {
  const dirents = await readdir(filePath, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(filePath, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}
