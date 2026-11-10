// Public purchase return service. Detailed work lives in focused modules.
const queries = require('./purchaseReturn.queries');
const createPurchaseReturnTransaction = require('./purchaseReturn.create');
const { validateCreatePurchaseReturn } = require('./purchaseReturn.validation');

function createPurchaseReturn(body) {
  const data = validateCreatePurchaseReturn(body);
  return createPurchaseReturnTransaction(data);
}

module.exports = {
  listPurchaseReturns: queries.listPurchaseReturns,
  getPurchaseReturn: queries.getPurchaseReturn,
  getOptions: queries.getOptions,
  createPurchaseReturn,
};
