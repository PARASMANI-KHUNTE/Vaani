describe("uploadMessageMedia (video)", () => {
  it("does not pass image-only transformation options to Cloudinary upload", async () => {
    jest.resetModules();

    const uploadStreamMock = jest.fn((options, callback) => {
      return {
        end: () => {
          callback(null, {
            secure_url: "https://res.cloudinary.com/demo/video/upload/v1/test.mp4",
            public_id: "test",
            resource_type: "video",
            bytes: 1234,
            format: "mp4",
            width: null,
            height: null,
            duration: 1.23,
          });
        },
      };
    });

    jest.doMock("../config/env", () => ({
      cloudinary: {
        cloudName: "demo",
        apiKey: "key",
        apiSecret: "secret",
        folder: "canvas-chat",
      },
    }));

    jest.doMock("../config/cloudinary", () => ({
      configureCloudinary: () => ({
        uploader: {
          upload_stream: uploadStreamMock,
        },
      }),
      tryConfigureCloudinary: () => null,
    }));

    const { uploadMessageMedia } = require("../utils/mediaUpload");

    const media = await uploadMessageMedia({
      userId: "507f1f77bcf86cd799439011",
      file: {
        mimetype: "video/mp4",
        originalname: "test.mp4",
        size: 1024,
        buffer: Buffer.from("x"),
      },
    });

    expect(media.messageType).toBe("video");
    expect(uploadStreamMock).toHaveBeenCalledTimes(1);

    const options = uploadStreamMock.mock.calls[0][0];
    expect(options.resource_type).toBe("video");
    expect(options).not.toHaveProperty("fetch_format");
    expect(options).not.toHaveProperty("quality");
    expect(options).not.toHaveProperty("video_bitrate");
  });
});

