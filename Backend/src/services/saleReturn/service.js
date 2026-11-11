// Public sale return service. Detailed work lives in focused modules.
const queries = require('./queries');
const {
  createSaleReturn: createSaleReturnTransaction,
  updateSaleReturn: updateSaleReturnTransaction,
  deleteSaleReturn: deleteSaleReturnTransaction,
} = require('./create');
const { validateCreateSaleReturn } = require('./validation');
const { parseId } = require('../../utils/documentValidation');

function createSaleReturn(body) {
  const data = validateCreateSaleReturn(body);
  return createSaleReturnTransaction(data);
}

function updateSaleReturn(id, body) {
  const returnId = parseId(id, 'Sale return id');
  const data = validateCreateSaleReturn(body);
  return updateSaleReturnTransaction(returnId, data);
}

function deleteSaleReturn(id) {
  return deleteSaleReturnTransaction(parseId(id, 'Sale return id'));
}

module.exports = {
  listSaleReturns: queries.listSaleReturns,
  getSaleReturn: queries.getSaleReturn,
  getOptions: queries.getOptions,
  createSaleReturn,
  updateSaleReturn,
  deleteSaleReturn,
};
