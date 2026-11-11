// Purchase return endpoints. Creation is handled as one inventory transaction.
const express = require('express');
const purchaseReturnService = require('../services/purchaseReturn.service');

const router = express.Router();

router.get('/options', async (req, res) => {
  res.json(await purchaseReturnService.getOptions());
});

router.get('/', async (req, res) => {
  res.json(await purchaseReturnService.listPurchaseReturns());
});

router.get('/:id', async (req, res) => {
  res.json(await purchaseReturnService.getPurchaseReturn(req.params.id));
});

router.post('/', async (req, res) => {
  const purchaseReturn = await purchaseReturnService.createPurchaseReturn(req.body);
  res.status(201).json(purchaseReturn);
});

module.exports = router;
