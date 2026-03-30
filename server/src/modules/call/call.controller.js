const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  getActiveCallForUser,
  getCallHistory,
  getIceServerConfiguration,
} = require("./call.service");

const getCallConfiguration = asyncHandler(async (_req, res) => {
  return sendSuccess(res, 200, "Call configuration fetched successfully", {
    config: getIceServerConfiguration(),
  });
});

const getMyActiveCall = asyncHandler(async (req, res) => {
  const call = getActiveCallForUser(req.user._id.toString());

  return sendSuccess(res, 200, "Active call state fetched successfully", {
    call,
  });
});

const getMyCallHistory = asyncHandler(async (req, res) => {
  const history = await getCallHistory({
    userId: req.user._id.toString(),
    limit: req.query.limit,
  });

  return sendSuccess(res, 200, "Call history fetched successfully", {
    history,
  });
});

module.exports = {
  getCallConfiguration,
  getMyCallHistory,
  getMyActiveCall,
};
