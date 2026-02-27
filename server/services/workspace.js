import Zip from "adm-zip";
import path from "path";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { PassThrough } from "stream";
import { validate } from "uuid";

export async function exportWorkspace(id, env = process.env) {
  const inputFolder = path.resolve(env.INPUT_FOLDER, id);
  const outputFolder = path.resolve(env.OUTPUT_FOLDER, id);
  const zip = new Zip();
  zip.addFile("id.txt", Buffer.from(id, "utf-8"));

  // Add files from inputFolder to the root of the zip
  const inputFiles = await readdir(inputFolder);
  for (const file of inputFiles) {
    const filePath = path.join(inputFolder, file);
    const fileData = await readFile(filePath);
    zip.addFile(`input/${file}`, fileData);
  }

  // Add files from outputFolder to the root of the zip
  const outputFiles = await readdir(outputFolder);
  for (const file of outputFiles) {
    const filePath = path.join(outputFolder, file);
    const fileData = await readFile(filePath);
    zip.addFile(`output/${file}`, fileData);
  }

  const zipBuffer = zip.toBuffer();
  const stream = new PassThrough();
  stream.end(zipBuffer);
  return stream;
}

export async function importWorkspace(id, zipFile, env = process.env) {
  const zipData = await readFile(path.resolve(env.INPUT_FOLDER, id, zipFile));
  const zip = new Zip(zipData);
  const zipId = zip.readAsText("id.txt");

  if (validate(zipId)) {
    // Extract input files{
    const inputFolder = path.resolve(env.INPUT_FOLDER, zipId);
    const inputEntries = zip.getEntries().filter((entry) => entry.entryName.startsWith("input/") && !entry.isDirectory);
    for (const entry of inputEntries) {
      zip.extractEntryTo(entry.entryName, inputFolder, false, true);
    }
    if (
      !existsSync(path.join(inputFolder, "params.json")) ||
      !existsSync(path.join(inputFolder, "data.json"))
    ) {
      throw new Error("Corrupted Workspace: Missing parameters");
    }

    // Extract output files
    const outputFolder = path.resolve(env.OUTPUT_FOLDER, zipId);
    const outputEntries = zip
      .getEntries()
      .filter((entry) => entry.entryName.startsWith("output/") && !entry.isDirectory);
    for (const entry of outputEntries) {
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
