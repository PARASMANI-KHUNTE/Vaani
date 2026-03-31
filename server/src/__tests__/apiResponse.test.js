const { sendSuccess } = require('../utils/apiResponse');

describe('API Response', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('sendSuccess', () => {
    it('should send success response', () => {
      sendSuccess(mockRes, 200, 'Success message', { id: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success message',
        data: { id: 1 },
      });
    });

    it('should send success response with null data by default', () => {
      sendSuccess(mockRes, 200, 'Success message');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success message',
        data: null,
      });
    });
  });
});
