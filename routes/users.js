const express = require('express');
const router = express.Router();
const controller = require('../controllers/index');
const authorization = require('../middlewares/authorization')
const swagger = require('../middlewares/swagger')


router.post('/login', controller.user.login);
router.post('/CheckMaintenance', controller.user.maintenance);
router.post('/logout', authorization.doAuth, controller.user.logout);

module.exports = router;
