import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_IMAGE_BASE_URL, // use env base url
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
