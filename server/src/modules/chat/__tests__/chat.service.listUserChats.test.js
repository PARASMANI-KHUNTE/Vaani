const mongoose = require("mongoose");

describe("chat.service listUserChats", () => {
  it("matches chats by ObjectId (not string)", async () => {
    jest.resetModules();

    const userId = new mongoose.Types.ObjectId().toString();

    const chatAggregateMock = jest.fn(() => ({
      allowDiskUse: jest.fn().mockResolvedValue([
        {
          metadata: [{ total: 1 }],
          data: [
            {
              _id: new mongoose.Types.ObjectId(),
              isGroup: false,
              participants: [
                { _id: new mongoose.Types.ObjectId(userId), name: "Me", username: "me" },
                { _id: new mongoose.Types.ObjectId(), name: "Other", username: "other" },
              ],
              admins: [],
              createdBy: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userState: [{ manualUnread: false }],
              lastMessageArr: [],
              unreadArr: [],
            },
          ],
        },
      ]),
    }));

    jest.doMock("../chat.model", () => ({
      aggregate: chatAggregateMock,
    }));

    const { listUserChats } = require("../chat.service");

    const result = await listUserChats(userId, { limit: 50, offset: 0 });

    expect(result.chats).toHaveLength(1);
    expect(chatAggregateMock).toHaveBeenCalledTimes(1);

    const pipeline = chatAggregateMock.mock.calls[0][0];
    expect(pipeline[0]).toHaveProperty("$match.participants");
    expect(pipeline[0].$match.participants).toBeTruthy();
    expect(pipeline[0].$match.participants._bsontype).toBe("ObjectId");
    expect(pipeline[0].$match.participants.toString()).toBe(userId);

    const filterStage = pipeline.find((stage) => stage.$addFields?.userState?.$filter);
    expect(filterStage).toBeTruthy();
    expect(filterStage.$addFields.userState.$filter.cond.$eq[0]).toBe("$$s.userId");
  });
});