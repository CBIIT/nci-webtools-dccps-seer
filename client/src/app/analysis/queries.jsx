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

export async function submit(id, params) {
  return await axios.post(`api/submit/${id}`, params);
}
