const express = require('express');
const service = require('../services/purchase.service');

const router = express.Router();
router.get('/options', async (req, res) => res.json(await service.getOptions()));
router.get('/', async (req, res) => res.json(await service.listPurchases()));
router.get('/:id', async (req, res) => res.json(await service.getPurchase(req.params.id)));
router.post('/', async (req, res) => res.status(201).json(await service.createPurchase(req.body)));

module.exports = router;
