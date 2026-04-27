const express = require('express')
const router = express.Router()


const reportController = require("../controller/reportController");


router.get('/', reportController.report_create_get)
router.post('/', reportController.report_create_post)
router.get('/:id/', reportController.report_get)

module.exports = router;
