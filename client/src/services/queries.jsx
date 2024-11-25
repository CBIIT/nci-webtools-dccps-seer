import axios from "axios";

export async function fetchStatus(id) {
  return (await axios.get(`api/data/output/${id}/status.json`)).data.status;
}

export async function fetchResults(id, file) {
  return (await axios.get(`api/data/output/${id}/${file}.json`)).data;
}

export async function fetchSession(id) {
  const params = (await axios.get(`api/data/input/${id}/params.json`)).data;
  const seerData = (await axios.get(`api/data/input/${id}/seerStatData.json`)).data;
  return { params, seerData };
}

export async function submit(id, params, data) {
  return await axios.post(`api/submit/${id}`, { params, data });
}

export async function calculateTrends(id, params) {
  return await axios.post(`api/trends/${id}`, params);
}

export async function recalculateConditional(id, params) {
  return await axios.post(`api/recalculateConditional/${id}`, params);
}

export async function importWorkspace(id, [file]) {
  const formData = new FormData();
  formData.append("files", file, file.name);
  return await axios.post(`api/import/${id}`, formData);
}

export async function fetchAll(id, manifest) {
  const valid = manifest.filter((e) => e?.model);
  const models = valid.map((e) => e.model.split(".").slice(0, -1).join("."));
  const coefficients = valid.map((e) => e.coefficients.split(".").slice(0, -1).join("."));
  const modelData = await Promise.all(models.map((file) => fetchResults(id, file)));
  const coefData = await Promise.all(coefficients.map((file) => fetchResults(id, file)));
  return { modelData, coefData };
}
