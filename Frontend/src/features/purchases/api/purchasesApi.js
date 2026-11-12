import axiosClient from '../../shared/api/axiosClient';

const purchasesApi = {
  list: () => axiosClient.get('/purchases').then((response) => response.data),
  get: (id) => axiosClient.get(`/purchases/${id}`).then((response) => response.data),
  options: () => axiosClient.get('/purchases/options').then((response) => response.data),
  create: (data) => axiosClient.post('/purchases', data).then((response) => response.data),
};

export default purchasesApi;
