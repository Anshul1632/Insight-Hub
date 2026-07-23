import axios from "axios";

// Set VITE_API_BASE_URL in a .env file for production (e.g. your Render URL).
// Defaults to the local FastAPI dev server.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE_URL });

// Normalize axios errors into readable messages the UI can show directly.
function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string" ? detail : err.message || "Request failed";
      throw new Error(message);
    });
}

export const api = {
  baseUrl: BASE_URL,

  health: () => unwrap(client.get("/api/health")),

  uploadDataset: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(
      client.post("/api/datasets/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },

  listDatasets: () => unwrap(client.get("/api/datasets")),

  getDataset: (id) => unwrap(client.get(`/api/datasets/${id}`)),

  getProfile: (id) => unwrap(client.get(`/api/datasets/${id}/profile`)),

  deleteDataset: (id) => unwrap(client.delete(`/api/datasets/${id}`)),

  downloadUrl: (id) => `${BASE_URL}/api/datasets/${id}/download`,

  cleanDataset: (id, payload) => unwrap(client.post(`/api/datasets/${id}/clean`, payload)),

  getCleaningHistory: (id) => unwrap(client.get(`/api/datasets/${id}/history`)),

  resetDataset: (id) => unwrap(client.post(`/api/datasets/${id}/reset`)),

  getEDA: (id) => unwrap(client.get(`/api/datasets/${id}/eda`)),

  queryDataset: (id, payload) => unwrap(client.post(`/api/datasets/${id}/query`, payload)),

  getTable: (id, page = 1, pageSize = 12) =>
    unwrap(client.get(`/api/datasets/${id}/table`, { params: { page, page_size: pageSize } })),

  getDashboard: (id) => unwrap(client.get(`/api/datasets/${id}/dashboard`)),
};

export default api;
