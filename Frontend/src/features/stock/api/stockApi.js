import axiosClient from '../../shared/api/axiosClient';

const stockApi = {
  summary: () => axiosClient.get('/stock/summary').then((response) => response.data),
  inventory: (params = {}) => axiosClient.get('/stock', { params }).then((response) => response.data),
  movements: (params = {}) => axiosClient.get('/stock/movements', { params }).then((response) => response.data),
  transfer: (data) => axiosClient.post('/stock/transfers', data).then((response) => response.data),
  adjust: (data) => axiosClient.post('/stock/adjustments', data).then((response) => response.data),
};

export default stockApi;
