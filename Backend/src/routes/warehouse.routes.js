const express = require('express');
const service = require('../services/warehouse.service');

const router = express.Router();

router.get('/', async (req, res) => res.json(await service.listWarehouses()));
router.get('/:id', async (req, res) => res.json(await service.getWarehouse(req.params.id)));
router.post('/', async (req, res) => res.status(201).json(await service.createWarehouse(req.body)));
router.put('/:id', async (req, res) => res.json(await service.updateWarehouse(req.params.id, req.body)));
router.delete('/:id', async (req, res) => res.json(await service.deactivateWarehouse(req.params.id)));

module.exports = router;
