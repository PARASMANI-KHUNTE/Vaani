const logger = require('../utils/logger');

describe('Logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('error', () => {
    it('should log error messages', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('Test error');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should include metadata when provided', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('Test error', { userId: '123', action: 'test' });
      const loggedMessage = errorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('Test error');
      expect(loggedMessage).toContain('userId');
      expect(loggedMessage).toContain('123');
      errorSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('Test warning');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test info');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test info')
      );
    });
  });
});
