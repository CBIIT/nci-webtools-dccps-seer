import Zip from "adm-zip";
import path from "path";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { PassThrough } from "stream";
import { validate } from "uuid";
import { assertValidId, assertSafeFilename, resolveWithin } from "./utils.js";

export async function exportWorkspace(id, env = process.env) {
  assertValidId(id);
  const inputFolder = resolveWithin(env.INPUT_FOLDER, id);
  const outputFolder = resolveWithin(env.OUTPUT_FOLDER, id);
  const zip = new Zip();
  zip.addFile("id.txt", Buffer.from(id, "utf-8"));

  // Add files from inputFolder to the root of the zip
  const inputFiles = await readdir(inputFolder);
  for (const file of inputFiles) {
    const filePath = resolveWithin(inputFolder, file);
    const fileData = await readFile(filePath);
    zip.addFile(`input/${path.basename(file)}`, fileData);
  }

  // Add files from outputFolder to the root of the zip
  const outputFiles = await readdir(outputFolder);
  for (const file of outputFiles) {
    const filePath = resolveWithin(outputFolder, file);
    const fileData = await readFile(filePath);
    zip.addFile(`output/${path.basename(file)}`, fileData);
  }

  const zipBuffer = zip.toBuffer();
  const stream = new PassThrough();
  stream.end(zipBuffer);
  return stream;
}

export async function importWorkspace(id, zipFile, env = process.env) {
  assertValidId(id);
  const safeZipName = assertSafeFilename(zipFile);
  const zipData = await readFile(resolveWithin(env.INPUT_FOLDER, id, safeZipName));
  const zip = new Zip(zipData);
  const zipId = zip.readAsText("id.txt");

  if (validate(zipId)) {
    // Extract input files
    const inputFolder = resolveWithin(env.INPUT_FOLDER, zipId);
    const inputEntries = zip.getEntries().filter((entry) => entry.entryName.startsWith("input/") && !entry.isDirectory);
    for (const entry of inputEntries) {
      const relativeName = entry.entryName.replace(/^input\//, "");
      // Confine destination before extract to prevent zip-slip
      resolveWithin(inputFolder, relativeName);
      zip.extractEntryTo(entry.entryName, inputFolder, false, true);
    }
    if (
      !existsSync(path.join(inputFolder, "params.json")) ||
      !existsSync(path.join(inputFolder, "data.json"))
    ) {
      throw new Error("Corrupted Workspace: Missing parameters");
    }

    // Extract output files
    const outputFolder = resolveWithin(env.OUTPUT_FOLDER, zipId);
    const outputEntries = zip
      .getEntries()
      .filter((entry) => entry.entryName.startsWith("output/") && !entry.isDirectory);
    for (const entry of outputEntries) {
      const relativeName = entry.entryName.replace(/^output\//, "");
      resolveWithin(outputFolder, relativeName);
      zip.extractEntryTo(entry.entryName, outputFolder, false, true);
    }
    if (!existsSync(path.join(outputFolder, "manifest.json")) || !existsSync(path.join(outputFolder, "status.json"))) {
      throw new Error("Corrupted Workspace: Missing data");
    }
    return zipId;
  } else {
    throw new Error("Invalid Workspace");
  }
}
