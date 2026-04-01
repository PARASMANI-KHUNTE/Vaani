const { SOCKET_EVENTS } = require('../modules/socket/socket.constants');

describe('Socket Constants', () => {
  describe('Message Events', () => {
    it('should have SEND_MESSAGE event', () => {
      expect(SOCKET_EVENTS.SEND_MESSAGE).toBe('SEND_MESSAGE');
    });

    it('should have NEW_MESSAGE event', () => {
      expect(SOCKET_EVENTS.NEW_MESSAGE).toBe('NEW_MESSAGE');
    });

    it('should have MESSAGE_DELIVERED event', () => {
      expect(SOCKET_EVENTS.MESSAGE_DELIVERED).toBe('MESSAGE_DELIVERED');
    });

    it('should have MESSAGE_SEEN event', () => {
      expect(SOCKET_EVENTS.MESSAGE_SEEN).toBe('MESSAGE_SEEN');
    });

    it('should have MESSAGE_DELETED event', () => {
      expect(SOCKET_EVENTS.MESSAGE_DELETED).toBe('MESSAGE_DELETED');
    });

    it('should have CHAT_UPDATED event', () => {
      expect(SOCKET_EVENTS.CHAT_UPDATED).toBe('CHAT_UPDATED');
    });
  });

  describe('Reaction Events', () => {
    it('should have REACTION_ADDED event', () => {
      expect(SOCKET_EVENTS.REACTION_ADDED).toBe('REACTION_ADDED');
    });

    it('should have REACTION_REMOVED event', () => {
      expect(SOCKET_EVENTS.REACTION_REMOVED).toBe('REACTION_REMOVED');
    });
  });

  describe('Presence Events', () => {
    it('should have USER_ONLINE event', () => {
      expect(SOCKET_EVENTS.USER_ONLINE).toBe('USER_ONLINE');
    });

    it('should have USER_OFFLINE event', () => {
      expect(SOCKET_EVENTS.USER_OFFLINE).toBe('USER_OFFLINE');
    });

    it('should have PRESENCE_SYNC event', () => {
      expect(SOCKET_EVENTS.PRESENCE_SYNC).toBe('PRESENCE_SYNC');
    });
  });

  describe('Typing Events', () => {
    it('should have TYPING event', () => {
      expect(SOCKET_EVENTS.TYPING).toBe('TYPING');
    });

    it('should have STOP_TYPING event', () => {
      expect(SOCKET_EVENTS.STOP_TYPING).toBe('STOP_TYPING');
    });
  });

  describe('Friend Request Events', () => {
    it('should have FRIEND_REQUEST_RECEIVED event', () => {
      expect(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED).toBe('FRIEND_REQUEST_RECEIVED');
    });

    it('should have FRIEND_REQUEST_ACCEPTED event', () => {
      expect(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED).toBe('FRIEND_REQUEST_ACCEPTED');
    });

    it('should have FRIEND_REQUEST_REJECTED event', () => {
      expect(SOCKET_EVENTS.FRIEND_REQUEST_REJECTED).toBe('FRIEND_REQUEST_REJECTED');
    });
  });
});
