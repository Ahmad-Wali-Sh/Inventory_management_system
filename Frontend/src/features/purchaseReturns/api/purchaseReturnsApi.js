// Purchase return API calls. All requests use the shared axios client.
import axiosClient from '../../shared/api/axiosClient';

const endpoint = '/purchase-returns';

export const purchaseReturnsApi = {
  list: () => axiosClient.get(endpoint).then((response) => response.data),
  getOptions: () => axiosClient.get(`${endpoint}/options`).then((response) => response.data),
  get: (id) => axiosClient.get(`${endpoint}/${id}`).then((response) => response.data),
  create: (data) => axiosClient.post(endpoint, data).then((response) => response.data),
};
