const {
  addOnlineUser,
  removeOnlineUser,
  isUserOnline,
  getUserRoom,
  getChatRoom,
} = require('../modules/socket/socket.service');

describe('Socket Service', () => {
  describe('getUserRoom', () => {
    it('should return correct user room format', () => {
      expect(getUserRoom('user123')).toBe('user:user123');
    });

    it('should handle different user IDs', () => {
      expect(getUserRoom('abc')).toBe('user:abc');
      expect(getUserRoom('xyz123')).toBe('user:xyz123');
    });
  });

  describe('getChatRoom', () => {
    it('should return correct chat room format', () => {
      expect(getChatRoom('chat123')).toBe('chat:chat123');
    });

    it('should handle different chat IDs', () => {
      expect(getChatRoom('abc')).toBe('chat:abc');
      expect(getChatRoom('chat456')).toBe('chat:chat456');
    });
  });

  describe('addOnlineUser', () => {
    it('should add user to online users', () => {
      const uniqueUser = `user_${Date.now()}_1`;
      addOnlineUser(uniqueUser, 'socket1');
      expect(isUserOnline(uniqueUser)).toBe(true);
      removeOnlineUser(uniqueUser, 'socket1');
    });

    it('should handle multiple sockets for same user', () => {
      const uniqueUser = `user_${Date.now()}_2`;
      addOnlineUser(uniqueUser, 'socket1');
      addOnlineUser(uniqueUser, 'socket2');
      expect(isUserOnline(uniqueUser)).toBe(true);
      removeOnlineUser(uniqueUser, 'socket1');
      removeOnlineUser(uniqueUser, 'socket2');
    });

    it('should handle adding different users', () => {
      const uniqueUser1 = `user_${Date.now()}_3`;
      const uniqueUser2 = `user_${Date.now()}_4`;
      addOnlineUser(uniqueUser1, 'socket1');
      addOnlineUser(uniqueUser2, 'socket2');
      expect(isUserOnline(uniqueUser1)).toBe(true);
      expect(isUserOnline(uniqueUser2)).toBe(true);
      removeOnlineUser(uniqueUser1, 'socket1');
      removeOnlineUser(uniqueUser2, 'socket2');
    });
  });

  describe('removeOnlineUser', () => {
    it('should remove user when last socket is removed', () => {
      const uniqueUser = `user_${Date.now()}_5`;
      addOnlineUser(uniqueUser, 'socket1');
      const becameOffline = removeOnlineUser(uniqueUser, 'socket1');
      expect(becameOffline).toBe(true);
      expect(isUserOnline(uniqueUser)).toBe(false);
    });

    it('should keep user online when one socket remains', () => {
      const uniqueUser = `user_${Date.now()}_6`;
      addOnlineUser(uniqueUser, 'socket1');
      addOnlineUser(uniqueUser, 'socket2');
      const becameOffline = removeOnlineUser(uniqueUser, 'socket1');
      expect(becameOffline).toBe(false);
      expect(isUserOnline(uniqueUser)).toBe(true);
      removeOnlineUser(uniqueUser, 'socket2');
    });

    it('should return false if user not found', () => {
      const result = removeOnlineUser('nonexistent', 'socket1');
      expect(result).toBe(false);
    });

    it('should handle removing specific socket from multiple', () => {
      const uniqueUser = `user_${Date.now()}_7`;
      addOnlineUser(uniqueUser, 'socket1');
      addOnlineUser(uniqueUser, 'socket2');
      addOnlineUser(uniqueUser, 'socket3');
      
      removeOnlineUser(uniqueUser, 'socket2');
      expect(isUserOnline(uniqueUser)).toBe(true);
      
      removeOnlineUser(uniqueUser, 'socket1');
      expect(isUserOnline(uniqueUser)).toBe(true);
      
      removeOnlineUser(uniqueUser, 'socket3');
      expect(isUserOnline(uniqueUser)).toBe(false);
    });
  });

  describe('isUserOnline', () => {
    it('should return false for offline user', () => {
      expect(isUserOnline('offlineUser')).toBe(false);
    });

    it('should return true for online user', () => {
      const uniqueUser = `user_${Date.now()}_8`;
      addOnlineUser(uniqueUser, 'socket1');
      expect(isUserOnline(uniqueUser)).toBe(true);
      removeOnlineUser(uniqueUser, 'socket1');
    });

    it('should return false after all sockets removed', () => {
      const uniqueUser = `user_${Date.now()}_9`;
      addOnlineUser(uniqueUser, 'socket1');
      addOnlineUser(uniqueUser, 'socket2');
      removeOnlineUser(uniqueUser, 'socket1');
      removeOnlineUser(uniqueUser, 'socket2');
      expect(isUserOnline(uniqueUser)).toBe(false);
    });
  });
});
