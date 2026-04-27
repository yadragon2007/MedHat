const express = require('express')
const router = express.Router()


const patientController = require("../controller/patientController");


router.get('/', patientController.home_get)

module.exports = router;
