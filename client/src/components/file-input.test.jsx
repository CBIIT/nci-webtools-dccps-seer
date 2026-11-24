import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import FileInput, { asFile, asFileList, getChunkIndexes, getFileNames } from "./file-input";

// jsdom has no DataTransfer and only accepts its own FileList for input.files
function createFileList(files) {
  const list = Object.create(FileList.prototype);
  files.forEach((file, i) => Object.defineProperty(list, i, { value: file, enumerable: true }));
  Object.defineProperties(list, {
    length: { value: files.length },
    item: { value: (i) => files[i] ?? null },
    [Symbol.iterator]: { value: () => files[Symbol.iterator]() },
  });
  return list;
}

class DataTransferShim {
  #files = [];
  items = { add: (file) => this.#files.push(file) };
  get files() {
    return createFileList(this.#files);
  }
}

const filesDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
const assignedFiles = new WeakMap();

beforeAll(() => {
  vi.stubGlobal("DataTransfer", DataTransferShim);
  Object.defineProperty(HTMLInputElement.prototype, "files", {
    configurable: true,
    get() {
      return assignedFiles.get(this) ?? createFileList([]);
    },
    set(value) {
      assignedFiles.set(this, value);
    },
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(HTMLInputElement.prototype, "files", filesDescriptor);
});

const dic = () => new File(["dictionary"], "Tutorial_JPSurv_01242022.dic");
const txt = () => new File(["data"], "Tutorial_JPSurv_01242022.txt", { type: "text/plain" });

function UploadForm({ defaultValue, ...props }) {
  const { control } = useForm({ defaultValues: { inputFile: defaultValue } });
  const value = useWatch({ control, name: "inputFile" });
  return (
    <>
      <label htmlFor="inputFile">Data file</label>
      <FileInput control={control} name="inputFile" id="inputFile" {...props} />
      <output data-testid="form-value">{JSON.stringify(getFileNames(asFileList(value)))}</output>
    </>
  );
}

function formValue() {
  return JSON.parse(screen.getByTestId("form-value").textContent);
}

function removeButtons() {
  return screen.queryAllByRole("button", { name: /Remove File/ });
}

function listedFileNames() {
  return removeButtons().map((button) => button.closest(".list-group-item").textContent.replace("Remove File", ""));
}

// user-event's upload makes input.files read-only, which breaks FileInput's own assignment
function selectFiles(files) {
  fireEvent.change(screen.getByLabelText("Data file"), { target: { files: createFileList(files) } });
}

describe("FileInput: SEER*Stat upload (.dic + .txt)", () => {
  const seerProps = { multiple: true, accept: ".dic,.csv,.tsv,.zip,.txt" };

  it("lists each selected file and stores them in the form", () => {
    const onChange = vi.fn();
    render(<UploadForm {...seerProps} onChange={onChange} />);

    selectFiles([dic(), txt()]);

    expect(listedFileNames()).toEqual(["Tutorial_JPSurv_01242022.dic", "Tutorial_JPSurv_01242022.txt"]);
    expect(formValue()).toEqual(["Tutorial_JPSurv_01242022.dic", "Tutorial_JPSurv_01242022.txt"]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("removes a single file from the selection", async () => {
    const user = userEvent.setup();
    render(<UploadForm {...seerProps} />);
    selectFiles([dic(), txt()]);

    await user.click(removeButtons()[0]);

    expect(listedFileNames()).toEqual(["Tutorial_JPSurv_01242022.txt"]);
    expect(formValue()).toBe("Tutorial_JPSurv_01242022.txt");
  });

  it("shows previously submitted file names and prevents changes once a job exists", () => {
    render(
      <UploadForm {...seerProps} disabled defaultValue={["Tutorial_JPSurv_01242022.dic", "Tutorial_JPSurv_01242022.txt"]} />
    );

    expect(screen.getByLabelText("Data file")).toBeDisabled();
    expect(listedFileNames()).toEqual(["Tutorial_JPSurv_01242022.dic", "Tutorial_JPSurv_01242022.txt"]);
    for (const button of removeButtons()) {
      expect(button).toBeDisabled();
    }
  });
});

describe("FileInput: RecurRisk workspace upload (single .zip)", () => {
  it("stores the file without rendering a file list", () => {
    render(<UploadForm accept=".zip" />);

    selectFiles([new File(["zip"], "workspace.zip")]);

    expect(removeButtons()).toHaveLength(0);
    expect(formValue()).toBe("workspace.zip");
    expect(screen.getByLabelText("Data file")).toHaveAttribute("accept", ".zip");
  });
});

describe("file helpers", () => {
  it("asFile keeps File objects and builds files from names or saved contents", async () => {
    const file = txt();
    expect(asFile(file)).toBe(file);

    expect(asFile("Tutorial_JPSurv_01242022.dic")).toMatchObject({ name: "Tutorial_JPSurv_01242022.dic", type: "text/plain" });

    const saved = asFile({ name: "groupdata_example_cansurv.csv", contents: "Link,estimate", type: "text/csv" });
    expect(saved).toMatchObject({ name: "groupdata_example_cansurv.csv", type: "text/csv", size: 13 });
    expect(await saved.text()).toBe("Link,estimate");
  });

  it("asFile returns null for values that cannot become a file", () => {
    expect(asFile(null)).toBeNull();
    expect(asFile("")).toBeNull();
    expect(asFile({ name: "missing-contents.csv" })).toBeNull();
  });

  it("asFileList converts saved file names and ignores empty values", () => {
    expect(Array.from(asFileList(["a.dic", "a.txt"])).map((f) => f.name)).toEqual(["a.dic", "a.txt"]);
    expect(asFileList(null)).toHaveLength(0);
    expect(asFileList(undefined)).toHaveLength(0);
  });

  it("getFileNames returns one name for a single file and a list for several", () => {
    expect(getFileNames(asFileList([dic()]))).toBe("Tutorial_JPSurv_01242022.dic");
    expect(getFileNames(asFileList([dic(), txt()]))).toEqual([
      "Tutorial_JPSurv_01242022.dic",
      "Tutorial_JPSurv_01242022.txt",
    ]);
    expect(getFileNames("already-a-name.csv")).toBe("already-a-name.csv");
  });

  it("getChunkIndexes splits a file into upload ranges with a shorter final chunk", () => {
    expect(getChunkIndexes(250, 100)).toEqual([
      [0, 100],
      [100, 200],
      [200, 250],
    ]);
    expect(getChunkIndexes(100, 100)).toEqual([[0, 100]]);
    expect(getChunkIndexes(0, 100)).toEqual([]);
  });
});
