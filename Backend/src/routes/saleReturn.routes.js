// Sale return endpoints. Creation is handled as one inventory transaction.
const express = require('express');
const crudFactory = require('../utils/crudFactory');
const saleReturnService = require('../services/saleReturn/service');

const router = express.Router();

router.get('/options', async (req, res) => {
  res.json(await saleReturnService.getOptions());
});

router.use(crudFactory({
  table: 'sale_returns',
  columns: [],
  handlers: {
    list: async (req, res) => res.json(await saleReturnService.listSaleReturns()),
    get: async (req, res) => res.json(await saleReturnService.getSaleReturn(req.params.id)),
    create: async (req, res) => {
      const saleReturn = await saleReturnService.createSaleReturn(req.body);
      res.status(201).json(saleReturn);
    },
    update: async (req, res) => {
      res.json(await saleReturnService.updateSaleReturn(req.params.id, req.body));
    },
    remove: async (req, res) => {
      await saleReturnService.deleteSaleReturn(req.params.id);
      res.json({ id: req.params.id });
    },
  },
}));

module.exports = router;
