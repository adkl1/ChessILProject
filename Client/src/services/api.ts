import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepts all the requests from client to server
api.interceptors.request.use(
    (config) => {
        // JWT is being saved in localStorage
        const token = localStorage.getItem('jwt_token');
        // If the token exists, we add it to the request's header
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;