const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const authController = require("./auth.controller");
const { loginValidator, mobileCodeRedeemValidator, refreshTokenValidator } = require("./auth.validators");
const { authRateLimiter } = require("../../middlewares/rateLimiter");

const router = express.Router();

router.post("/login", authRateLimiter, loginValidator, validateRequest, authController.login);
router.post("/refresh", refreshTokenValidator, validateRequest, authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.me);
router.post("/mobile/code", authMiddleware, authController.issueMobileCode);
router.post("/mobile/redeem", mobileCodeRedeemValidator, validateRequest, authController.redeemMobileCode);

module.exports = router;
