// One shared axios instance for the whole app.
// Every feature imports this instead of calling axios directly, so the
// base URL, the auth token and error handling live in ONE place.
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const axiosClient = axios.create({
  // Comes from the .env file:  VITE_API_URL=http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Before each request: attach the token (when the backend adds JWT later,
// this already works). getState() reads a zustand store outside React.
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// After each response: turn errors into one simple shape.
// Our Express errorHandler sends { message } (and maybe { detail }).
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || // message from our API
      error.message ||                 // network error, timeout, ...
      'Something went wrong';

    // 401 = not logged in (useful once JWT is added on the backend)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject({ message, status: error.response?.status, detail: error.response?.data?.detail });
  }
);

export default axiosClient;