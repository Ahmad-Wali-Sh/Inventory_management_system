import axiosClient from '../../shared/api/axiosClient';

const warehousesApi = {
  list: () => axiosClient.get('/warehouses').then((response) => response.data),
  create: (data) => axiosClient.post('/warehouses', data).then((response) => response.data),
  update: (id, data) => axiosClient.put(`/warehouses/${id}`, data).then((response) => response.data),
  deactivate: (id) => axiosClient.delete(`/warehouses/${id}`).then((response) => response.data),
};

export default warehousesApi;
