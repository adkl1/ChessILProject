import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        const requestUrl = config.url ?? '';
        const isAuthReq =
            requestUrl === '/auth/login' ||
            requestUrl === '/auth/register' ||
            requestUrl.endsWith('/auth/login') ||
            requestUrl.endsWith('/auth/register');

        if (token && config.headers && !isAuthReq) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
