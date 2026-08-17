import axios from "axios";

export async function fetchInput(id, file) {
  return (await axios.get(`/api/data/input/${id}/${file}`)).data;
}

export async function fetchOutput(id, file) {
  return (await axios.get(`/api/data/output/${id}/${file}`)).data;
}

export async function fetchStatus(id) {
  return (await axios.get(`/api/data/output/${id}/status.json`)).data;
}

export async function fetchResults(id, file) {
  return (await axios.get(`/api/data/output/${id}/${file}.json`)).data;
}

export async function fetchSession(id) {
  const params = (await axios.get(`/api/data/input/${id}/params.json`)).data;
  const seerData = (await axios.get(`/api/data/input/${id}/data.json`)).data;
  return { params, seerData };
}

export async function submit(id, params, data) {
  return await axios.post(`/api/submit/${id}`, { params, data });
}

export async function submitTrends(id, params) {
  return (await axios.post(`/api/trends/${id}`, params)).data;
}

export async function fetchTrendStatus(id, statusFile) {
  return (await axios.get(`/api/data/output/${id}/${statusFile}?t=${Date.now()}`)).data;
}

export async function fetchTrendResults(id, resultFile) {
  return (await axios.get(`/api/data/output/${id}/${resultFile}?t=${Date.now()}`)).data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function calculateTrends(id, params) {
  const { statusFile, resultFile, ...rest } = await submitTrends(id, params);
  let current = rest;

  while (current.status === "SUBMITTED" || current.status === "IN_PROGRESS") {
    await delay(5000);
    current = await fetchTrendStatus(id, statusFile);
  }

  if (current.status === "FAILED") {
    throw new Error(current.error || "Trend calculation failed");
  }

  return { data: await fetchTrendResults(id, resultFile) };
}

export async function recalculateConditional(id, params) {
  return await axios.post(`/api/recalculateConditional/${id}`, params);
}

export async function importWorkspace(id, [file]) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Workspace file exceeds the 10MB size limit.");
  }
  const formData = new FormData();
  formData.append("files", file, file.name);
  return await axios.post(`/api/import/${id}`, formData);
}

export async function fetchAll(id, manifest) {
  const valid = manifest.filter((e) => e?.model);
  const models = valid.map((e) => e.model.split(".").slice(0, -1).join("."));
  const coefficients = valid.map((e) => e.coefficients.split(".").slice(0, -1).join("."));
  const modelData = await Promise.all(models.map((file) => fetchResults(id, file)));
  const coefData = await Promise.all(coefficients.map((file) => fetchResults(id, file)));
  return { modelData, coefData };
}
