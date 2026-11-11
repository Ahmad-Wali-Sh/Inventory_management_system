import { createCrudApi } from '../../shared/api/createCrudApi';

const endpoint = '/purchase-returns';

export const purchaseReturnsApi = createCrudApi(endpoint);
