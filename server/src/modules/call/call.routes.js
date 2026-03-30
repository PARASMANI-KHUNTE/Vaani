const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const callController = require("./call.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/config", callController.getCallConfiguration);
router.get("/active", callController.getMyActiveCall);
router.get("/history", callController.getMyCallHistory);

module.exports = router;
