import { parseCsv, stringifyCsv } from "./csv";
import { saveAs } from "file-saver";
import { writeFileXLSX, utils as xlsxUtils } from "xlsx";

export function readFile(file, type = "text") {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.onerror = () => reject(fileReader.error);
    fileReader.onabort = () => reject(fileReader);

    switch (type) {
      case "text":
        return fileReader.readAsText(file);
      case "arrayBuffer":
        return fileReader.readAsArrayBuffer(file);
      case "dataUrl":
        return fileReader.readAsDataURL(file);
    }
  });
}

export function parseIni(contents, trimWhitespace = true, globalSection = "__global") {
  let ini = {};
  let section = globalSection;
  const patterns = {
    eol: /\r?\n/g,
    comment: /^\s*;/, // ; comment
    section: /^\s*\[([^\]]*)\]/, // [section]
    keyValuePair: /^([^=]+)=(.*)$/, // key=value
  };

  for (const line of contents.split(patterns.eol)) {
    if (line.match(patterns.comment)) continue;

    const sectionMatch = line.match(patterns.section);
    if (sectionMatch !== null) {
      section = sectionMatch[1];
      if (trimWhitespace) {
        section = section.trim();
      }
      continue;
    }

    const keyValuePairMatch = line.match(patterns.keyValuePair);
    if (keyValuePairMatch !== null) {
      let [_, key, value] = keyValuePairMatch;
      if (trimWhitespace) {
        key = key.trim();
        value = value.trim();
      }

      ini[section] = {
        ...ini[section],
        [key]: value,
      };
    }
  }

  return ini;
}

/**
 * Formats a string as a valid R identifier
 * @param name
 * @returns
 */
export function asValidName(name) {
  return name.replace(/[,:()<>={}!@#$%^&*+-]/g, "").replace(/\s+/g, "_");
}

/**
 * Parses a SEER*Stat dictionary file as a set of data frame headers
 * @param dictionaryFile
 * @returns
 */
export async function parseSeerStatDictionary(dictionaryFile) {
  const dictionaryFileContents = await readFile(dictionaryFile);
  const config = parseIni(dictionaryFileContents);

  // retrieve all columns and factors for each column (if applicable)
  const headers = Object.entries(config["Life Page Variables"])
    .filter(([key]) => /^Var(\d+)Name$/.test(key))
    .map(([key, value]) => ({
      label: value,
      name: asValidName(value),
      factors: Object.entries(config[`Format=${value}`] || {}).map(([value, label]) => ({
        value: Number(value),
        label,
      })),
    }));

  return { headers, config };
}

/**
 * Parses a json file as an object
 * @param file
 * @returns
 */
export async function parseJsonFile(file) {
  const fileContents = await readFile(file);
  return JSON.parse(fileContents);
}

/**
 * Parses a CSV file as a data frame
 * @param csvFile
 * @param options
 * @returns
 */
export async function parseCsvFile(csvFile, options) {
  const fileContents = await readFile(csvFile);
  const distinct = {};
  const { headers, data } = parseCsv(fileContents, {
    transformRecord: (record) => {
      for (const key in record) {
        if (!distinct[key]) distinct[key] = new Set();
        const value = record[key];
        distinct[key].add(value);
      }
      return record;
    },
    ...options,
  });

  return {
    data,
    headers: headers.map((name) => ({
      name,
      factors: Array.from(distinct[name])
        .sort()
        .map((value) => ({
          value,
          label: String(value),
        })),
    })),
  };
}

/**
 * Parses a SEER*Stat dictionary/data file pair as a data frame
 * @param seerStatDictionaryFile
 * @param seerStatDataFile
 * @returns
 */
export async function parseSeerStatFiles(seerStatDictionaryFile, seerStatDataFile) {
  const { headers, config } = await parseSeerStatDictionary(seerStatDictionaryFile);
  const dataFileContents = await readFile(seerStatDataFile);

  const options = config["Export Options"];
  const fieldDelimiter =
    {
      tab: "\t",
      comma: ",",
    }[options["Field delimiter"]] || ",";
  const missingCharacter =
    {
      period: ".",
    }[options["Missing character"]] || null;

  const { data } = parseCsv(dataFileContents, {
    headers: headers.map((h) => h.name),
    delimiter: fieldDelimiter,
    nullValue: missingCharacter,
  });

  return {
    headers,
    data,
  };
}

export function downloadCsv(data, filename) {
  const contents = stringifyCsv(data);
  downloadText(contents, filename);
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

export function downloadExcel(sheets, filename) {
  const workbook = xlsxUtils.book_new();

  for (const sheet of sheets) {
    const worksheet = Array.isArray(typeof sheet.data[0])
      ? xlsxUtils.aoa_to_sheet(sheet.data)
      : xlsxUtils.json_to_sheet(sheet.data);
    xlsxUtils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  writeFileXLSX(workbook, filename);
}
