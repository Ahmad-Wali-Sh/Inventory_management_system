const express = require('express');
const service = require('../services/stock.service');

const router = express.Router();

router.get('/summary', async (req, res) => res.json(await service.getSummary()));
router.get('/movements', async (req, res) => res.json(await service.listMovements(req.query)));
router.get('/', async (req, res) => res.json(await service.listInventory(req.query)));
router.post('/adjustments', async (req, res) => res.status(201).json(await service.createAdjustment(req.body)));
router.post('/transfers', async (req, res) => res.status(201).json(await service.createTransfer(req.body)));

module.exports = router;
