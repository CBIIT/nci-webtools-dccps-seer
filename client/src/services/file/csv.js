/**
 * Parses csv strings conforming to rfc4180.
 * @param text
 * @param config
 * @returns
 */
export function parseCsv(text, config = {}) {
  const defaultConfig = {
    delimiter: ",",
    escape: '"',
    skipLines: 0,
    headers: true,
    nullValue: "",
    transformHeaders: (headers) => headers.map((header) => header.trim()),
    transformRecord: (record) => record,
    transformValue: (value, header) => {
      const trimmedValue = String(value).trim();
      if (value === "" || value === null || value === undefined || trimmedValue === config?.nullValue) return null;
      else if (!isNaN(+value)) return Number(value);
      else return trimmedValue;
    },
  };

  let { delimiter, escape, skipLines, headers, transformHeaders, transformRecord, transformValue } = {
    ...defaultConfig,
    ...config,
  };

  let buffer = "";
  let escaped = false;
  let fields = [];
  let objectRecords = [];
  let valueRecords = [];
  let numLines = 0;

  const appendField = () => {
    fields.push(buffer);
    buffer = "";
  };

  const addFieldToRecord = (record, header, index) => ({
    ...record,
    [header]: transformValue(fields[index], header),
  });

  const appendRecord = () => {
    // skip until we have passed the skipLines threshold
    if (numLines >= skipLines) {
      if (headers) {
        // skip the first line of input if headers are present in the input file (eg: headers: true)
        if (numLines === skipLines && !Array.isArray(headers)) {
          headers = transformHeaders(fields);
          fields = [];
          numLines++;
          return;
        }
        // add all fields to the record object
        const record = headers.reduce(addFieldToRecord, {});
        objectRecords.push(transformRecord(record));
      } else {
        const record = fields.map(transformValue);
        valueRecords.push(transformRecord(record));
      }
    }
    fields = [];
    numLines++;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // handle delimiters and newlines
    if (!escaped && (char === delimiter || char === "\n")) {
      // on delimiters/newlines, push buffer to fields
      appendField();

      // on newlines, push fields to record
      if (char === "\n") {
        appendRecord();
      }
    }

    // handle regular characters
    else if (char !== escape) {
      buffer += char;
    }

    // handle escape characters
    else if (char === escape) {
      // handle escaped double quotes
      if (escaped && text[i + 1] === escape) {
        i++;
        buffer += escape;
        continue;
      }

      // otherwise, toggle the "escaped" flag whenever we encounter quotes
      escaped = !escaped;
    }
  }

  if (buffer.length > 0) {
    appendField();
  }

  if (fields.length > 0) {
    appendRecord();
  }

  if (headers) {
    return {
      headers: headers,
      data: objectRecords,
    };
  } else {
    return valueRecords;
  }
}

/**
 * Generates rfc4180-compliant csv files from arrays of arrays/objects
 * If an array of objects is provided, the config.headers property
 * allows the user to specify headers as an array of strings
 *
 * @param data
 * @param config
 * @returns
 */
export function stringifyCsv(data, config = {}) {
  const defaultConfig = {
    delimiter: ",",
    newline: "\r\n",
  };

  let { delimiter, newline, headers } = {
    ...defaultConfig,
    ...config,
  };

  const escape = (value) => (typeof value !== "number" ? `"${String(value).replace(/"/g, '""')}"` : value);

  const rows = [];

  for (let row of data) {
    if (!Array.isArray(row)) {
      if (!headers) {
        headers = Object.keys(row);
      }
      if (rows.length === 0) {
        rows.push(headers.map(escape).join(delimiter));
      }
      row = headers.map((header) => row[header]);
    }

    rows.push(row.map(escape).join(delimiter));
  }

  return rows.join(newline);
}
