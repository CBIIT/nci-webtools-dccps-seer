import { parseCsv, stringifyCsv } from "./csv";
import { saveAs } from "file-saver";
import { writeFileXLSX, utils as xlsxUtils } from "@e965/xlsx";

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
 * Parses a CSV file as a data frame
 * @param csvFile
 * @param options
 * @returns
 */
export async function parseCsvFile2(csvFile, options) {
  const fileContents = await readFile(csvFile);
  const distinct = {};
  const data = parseCsv(fileContents, {
    transformRecord: (record) => {
      for (const key in record) {
        if (!distinct[key]) distinct[key] = new Set();
        const value = record[key];
        distinct[key].add(value);
      }
      return record;
    },
    ...options,
    delimiter: options?.delimiter || determineDelimiter(fileContents),
    headers: options?.headers || false,
  });

  return data;
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
  // SEER*Stat data files may include the variable-name header row as the first line
  // (per the dictionary's "Variable names included" flag). Skip it so the parsed
  // records don't contain a duplicate of the header.
  const variableNamesIncluded = String(options["Variable names included"]).toLowerCase() === "true";

  const { data } = parseCsv(dataFileContents, {
    headers: headers.map((h) => h.name),
    delimiter: fieldDelimiter,
    nullValue: missingCharacter,
    skipLines: variableNamesIncluded ? 1 : 0,
  });

  return {
    headers,
    data,
  };
}

/**
 * Parse a SEER*Stat file selection (dictionary + data file) into a seerData object.
 * Locates the `.dic` dictionary file and the data file (.txt/.csv/.tsv), parses both,
 * and extracts cohort and non-cohort variables. Throws if either required file is missing.
 */
export async function buildSeerData(inputFile) {
  const files = Array.from(inputFile);
  const dictionaryFile = files.find((file) => /.dic$/i.test(file.name));
  const dataFile = files.find((file) => /(.txt|.csv|.tsv)$/i.test(file.name));

  if (!dictionaryFile || !dataFile) {
    throw new Error("Invalid SEER*STAT files selected.");
  }

  // parse SEER*Stat files to extract dictionary headers and data
  const { headers, config } = await parseSeerStatDictionary(dictionaryFile);
  const { data } = await parseSeerStatFiles(dictionaryFile, dataFile);

  // get cohort variables by filtering unknown labels
  const exclude = ["Page type", "Interval", /^year/gi];
  const matchesExclude = (label) =>
    exclude.some((item) => (item instanceof RegExp ? item.test(label) : item === label));
  const cleanFactors = (e) => ({
    ...e,
    factors: e.factors.map((f) => ({ ...f, label: f.label.replace(/"/gi, "").trim() })),
  });

  const cohortVariables = headers.filter((e) => e.factors.length && !matchesExclude(e.label)).map(cleanFactors);
  const nonCohortVariables = headers.filter((e) => e.factors.length && matchesExclude(e.label)).map(cleanFactors);

  return {
    dictionaryFile: dictionaryFile.name,
    dataFile: dataFile.name,
    seerStatDictionary: headers,
    seerStatData: data,
    cohortVariables,
    nonCohortVariables,
    config,
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

/**
 * Determines the delimiter of a CSV file
 * @param fileContents
 * @returns {string} The detected delimiter
 */
function determineDelimiter(fileContents) {
  const lines = fileContents.split("\n").slice(0, 5); // Read the first 5 lines

  const delimiters = [",", "\t", ";", " "];
  const delimiterCounts = delimiters.map((delimiter) => ({
    delimiter,
    count: lines.reduce((acc, line) => acc + (line.split(delimiter).length - 1), 0),
  }));

  delimiterCounts.sort((a, b) => b.count - a.count);
  return delimiterCounts[0].delimiter;
}
