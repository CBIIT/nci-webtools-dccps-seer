"use client";
import { useRef, useEffect, useState } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/ListGroup";
import { useController } from "react-hook-form";
import { RxCross1 } from "react-icons/rx";

export default function FileInput(props) {
  const {
    field: { value, name, ref, onChange, onBlur, set },
  } = useController(props);
  const inputRef = useRef();
  const fileList = asFileList(value);

  const files = Array.from(fileList);
  useEffect(() => {
    ref(inputRef.current);
    if (inputRef.current) {
      inputRef.current.files = fileList;
    }
  }, [fileList, ref]);

  function handleChange(event) {
    onChange(event.target.files);
  }

  function removeFile(index) {
    const remainingFiles = files.filter((f, i) => i !== index);
    onChange(asFileList(remainingFiles));
  }

  return (
    <div className="form-control-list-group">
      <Form.Control
        type="file"
        onChange={handleChange}
        onBlur={onBlur}
        name={name}
        ref={inputRef}
        id={props.id}
        multiple={props.multiple}
        accept={props.accept}
        capture={props.capture}
        autoFocus={props.autoFocus}
        disabled={props.disabled}
        required={props.required}
      />
      {props.multiple && (
        <ListGroup>
          {files.map((file, index) => (
            <ListGroup.Item
              className="list-group-item-action d-flex justify-content-between align-items-center"
              key={index}>
              <small className="text-muted">{file.name}</small>
              <Button size="sm" variant="outline-danger" className="border-0" onClick={(ev) => removeFile(index)}>
                <RxCross1 aria-label="Remove File Icon"></RxCross1>
                <span className="visually-hidden">Remove File</span>
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}

/**
 * Converts an array of files to a FileList object
 * @param {File[]} files
 * @returns
 */
export function asFileList(files) {
  if (files instanceof FileList) return files;

  // ensure files is an array-like object
  if (!Array.isArray(files)) {
    files = [files];
  }

  const container = new DataTransfer();
  const fileList = Array.from(files || [])
    .map(asFile)
    .filter(Boolean);

  for (const file of fileList) {
    container.items.add(file);
  }

  return container.files;
}

export function asFile(value) {
  if (value instanceof File) {
    return value;
  } else if (value && typeof value === "string") {
    return new File([""], value, {
      type: "text/plain",
      lastModified: new Date(),
    });
  } else if (value?.name && value?.contents) {
    return new File([value.contents], value.name, {
      type: value.type || "text/plain",
      lastModified: value.lastModified || new Date(),
    });
  } else {
    return null;
  }
}

export function isValidPlinkDataset(files) {
  if (!files || files.length === 0) return true;
  const fileNames = Array.from(files || []).map((f) => (f instanceof File ? f.name : f));
  const requiredFilePatterns = [/\.bed$/i, /\.bim$/i, /\.fam$/i];
  const fileNamePrefixes = fileNames.map((f) => f.replace(/\.[^.]+$/, ""));
  const hasAllFiles = requiredFilePatterns.every((pattern) => fileNames.some((f) => pattern.test(f)));
  const hasMatchingFileNames = new Set(fileNamePrefixes).size === 1;
  return (hasAllFiles && hasMatchingFileNames) || "Please choose a valid set of .bed, .bim, and .fam files";
}

export function getFileNames(values) {
  if (values instanceof FileList) {
    const names = Array.from(values).map((file) => file.name);
    return names.length === 1 ? names[0] : names;
  } else {
    return values;
  }
}

/**
 * Generates an array of chunk indexes given a total size and chunk size.
 * @param {number} totalSize
 * @param {number} chunkSize
 * @returns
 */
export function getChunkIndexes(totalSize, chunkSize) {
  const indexes = [];
  for (let i = 0; i < totalSize; i += chunkSize) {
    indexes.push([i, Math.min(i + chunkSize, totalSize)]);
  }
  return indexes;
}

/**
 * Uploads a file in sequential chunks to the specified endpoint.
 * @param {string} endpoint
 * @param {FormData} formData
 * @param {string} keyName
 * @param {File} file
 * @param {number} chunkSize
 */
export async function uploadFileChunks(endpoint, keyName, file, chunkSize = 1e8) {
  const chunkIndexes = getChunkIndexes(file.size, chunkSize);
  for (const [start, end] of chunkIndexes) {
    const chunk = file.slice(start, end, file.type);
    const formData = new FormData();
    formData.append(keyName, chunk, file.name);
    await axios.post(endpoint, formData);
  }
}

export async function uploadFiles(endpoint, data, chunkSize = 1e8) {
  const fileLists = Object.values(data).filter((v) => v instanceof FileList);
  for (const fileList of fileLists)
    for (const file of fileList) await uploadFileChunks(endpoint, "files", file, chunkSize);
}
