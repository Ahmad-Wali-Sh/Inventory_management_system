// Builds the 5 CRUD calls for any resource.
// It is the frontend twin of backend/src/utils/crudFactory.js:
//
//   backend route           frontend function
//   GET    /products        list()
//   GET    /products/:id    get(id)
//   POST   /products        create(data)
//   PUT    /products/:id    update(id, data)
//   DELETE /products/:id    remove(id)
//
// Usage:
//   const productsApi = createCrudApi('/products');
//   const rows = await productsApi.list();
import axiosClient from './axiosClient';

export function createCrudApi(endpoint) {
  return {
    list: () => axiosClient.get(endpoint).then((res) => res.data),
    get: (id) => axiosClient.get(`${endpoint}/${id}`).then((res) => res.data),
    create: (data) => axiosClient.post(endpoint, data).then((res) => res.data),
    update: (id, data) => axiosClient.put(`${endpoint}/${id}`, data).then((res) => res.data),
    remove: (id) => axiosClient.delete(`${endpoint}/${id}`).then((res) => res.data),
  };
}