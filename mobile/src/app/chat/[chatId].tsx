import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileChatDetail } from "@/hooks/use-mobile-chat-detail";
import { useMobileChats } from "@/hooks/use-mobile-chats";
import { useMobileRealtime } from "@/hooks/use-mobile-realtime";
import { getMobileSocket } from "@/lib/socket/client";
import { mobileSocketEvents } from "@/lib/socket/events";
import { MobileMessage, MobileMessageReaction } from "@/lib/types";
import { useSessionStore } from "@/store/session-store";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const StatusIcon = ({ status, isOwn }: { status: string; isOwn: boolean }) => {
  if (!isOwn) return null;

  const color = "rgba(255,255,255,0.72)";
  const size = 14;

  switch (status) {
    case "seen":
      return <Ionicons name="checkmark-done" size={size} color="#34d399" />;
    case "delivered":
      return <Ionicons name="checkmark-done" size={size} color={color} />;
    case "sent":
    default:
      return <Ionicons name="checkmark" size={size} color={color} />;
  }
};

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const session = useSessionStore((state) => state.session);
  const { chats } = useMobileChats({
    token: session?.accessToken,
  });
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chat = useMemo(
    () => chats.find((entry) => entry._id === chatId) || null,
    [chatId, chats]
  );

  const { messages, isLoading, isSending, error, sendMessage, toggleReaction, deleteMessage } = useMobileChatDetail({
    token: session?.accessToken,
    chat,
  });

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<MobileMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  useEffect(() => {
    if (!session?.accessToken || !chatId) return;

    const socket = getMobileSocket(session.accessToken);

    const handleTyping = ({
      chatId: typingChatId,
      isTyping: typing,
    }: {
      chatId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (typingChatId === chatId) {
        setIsTyping(typing);
        if (typing && typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (typing) {
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      }
    };

    socket.on(mobileSocketEvents.typing, handleTyping);

    return () => {
      socket.off(mobileSocketEvents.typing, handleTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, session?.accessToken]);

  const handleTextChange = useCallback(
    (text: string) => {
      setDraft(text);
      if (!session?.accessToken || !chatId) return;

      const socket = getMobileSocket(session.accessToken);
      if (text.trim()) {
        socket.emit(mobileSocketEvents.typing, { chatId });
      } else {
        socket.emit(mobileSocketEvents.stopTyping, { chatId });
      }
    },
    [chatId, session?.accessToken]
  );

  const handleSend = useCallback(() => {
    const nextMessage = draft.trim();
    if (!nextMessage) return;
    setDraft("");
    if (session?.accessToken && chatId) {
      const socket = getMobileSocket(session.accessToken);
      socket.emit(mobileSocketEvents.stopTyping, { chatId });
    }
    void sendMessage(nextMessage, replyToMessage?._id || null);
    setReplyToMessage(null);
  }, [draft, sendMessage, chatId, session?.accessToken, replyToMessage]);

  const handleMediaSelection = useCallback(() => {
    Alert.alert(
      "Send Media",
      "Choose an option",
      [
        {
          text: "Photo Library",
          onPress: async () => {
            try {
              const result = await fetch("https://picsum.photos/400/300", { method: "GET" });
              const uri = result.url;
              setSelectedMedia({ uri, type: "image" });
            } catch (error) {
              console.log("Media selection error:", error);
            }
          },
        },
        {
          text: "Camera",
          onPress: async () => {
            try {
              const result = await fetch("https://picsum.photos/400/300", { method: "GET" });
              const uri = result.url;
              setSelectedMedia({ uri, type: "image" });
            } catch (error) {
              console.log("Camera error:", error);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }, []);

  const handleSendMedia = useCallback(async () => {
    if (!selectedMedia || !chatId || !session?.accessToken) return;

    try {
      setIsSendingMedia(true);
      const socket = getMobileSocket(session.accessToken);
      socket.emit(mobileSocketEvents.sendMessage, {
        chatId,
        type: selectedMedia.type,
        media: {
          url: selectedMedia.uri,
        },
      });
      setSelectedMedia(null);
    } catch (error) {
      console.log("Send media error:", error);
    } finally {
      setIsSendingMedia(false);
    }
  }, [selectedMedia, chatId, session?.accessToken]);

  const handleCancelMedia = useCallback(() => {
    setSelectedMedia(null);
  }, []);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!chatId || !session?.accessToken) return;
    
    try {
      setIsSendingVoice(true);
      const socket = getMobileSocket(session.accessToken);
      socket.emit(mobileSocketEvents.sendMessage, {
        chatId,
        type: "voice",
        media: {
          url: `https://example.com/voice-${Date.now()}.m4a`,
          duration: recordingDuration,
        },
      });
    } catch (error) {
      console.log("Send voice error:", error);
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
      setIsSendingVoice(false);
    }
  }, [chatId, session?.accessToken, recordingDuration]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {chat?.otherParticipant?.name || "Chat"}
          </Text>
          {isTyping ? (
            <Text style={styles.typingText}>typing...</Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoading && messages.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#155e75" />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const senderId = typeof item.senderId === "string" ? item.senderId : item.senderId._id;
              const isOwn = senderId === session?.user?.userId;

              const handleMessagePress = () => {
                if (selectedMessageId) {
                  setReplyToMessage(item);
                  setSelectedMessageId(null);
                  setShowReactionPicker(false);
                }
              };

              const renderMessageContent = () => {
                if (item.type === "image" && item.media?.url) {
                  return (
                    <View>
                      <Image source={{ uri: item.media.url }} style={styles.messageImage} resizeMode="cover" />
                      {item.content ? (
                        <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                          {item.content}
                        </Text>
                      ) : null}
                    </View>
                  );
                }
                if (item.type === "video" && item.media?.url) {
                  return (
                    <View>
                      <View style={styles.videoContainer}>
                        <Ionicons name="play-circle" size={40} color={isOwn ? "#ffffff" : "#155e75"} />
                      </View>
                      {item.content ? (
                        <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                          {item.content}
                        </Text>
                      ) : null}
                    </View>
                  );
                }
                if (item.type === "voice" && item.media?.url) {
                  return (
                    <View style={styles.voiceContainer}>
                      <Ionicons name="mic" size={20} color={isOwn ? "#ffffff" : "#155e75"} />
                      <Text style={[styles.voiceDuration, isOwn ? styles.ownText : styles.otherText]}>
                        {item.media.duration ? `${Math.floor(item.media.duration / 60)}:${String(item.media.duration % 60).padStart(2, "0")}` : "0:00"}
                      </Text>
                    </View>
                  );
                }
                if (item.type === "file" && item.media?.url) {
                  return (
                    <View style={styles.fileContainer}>
                      <Ionicons name="document-text" size={24} color={isOwn ? "#ffffff" : "#155e75"} />
                      <Text style={[styles.fileName, isOwn ? styles.ownText : styles.otherText]} numberOfLines={1}>
                        {item.media.publicId || "File"}
                      </Text>
                    </View>
                  );
                }
                return (
                  <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                    {item.content || `[${item.type}]`}
                  </Text>
                );
              };

              return (
                <View style={[styles.messageRow, isOwn ? styles.ownRow : styles.otherRow]}>
                  <Pressable
                    style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}
                    onLongPress={() => {
                      setSelectedMessageId(item._id);
                      setShowReactionPicker(true);
                    }}
                    onPress={() => {
                      if (selectedMessageId) {
                        setReplyToMessage(item);
                        setSelectedMessageId(null);
                        setShowReactionPicker(false);
                      }
                    }}
                  >
                    {item.replyTo && (
                      <View style={[styles.replyIndicator, isOwn ? styles.ownReplyIndicator : styles.otherReplyIndicator]}>
                        <Ionicons name="return-up-back" size={14} color={isOwn ? "rgba(255,255,255,0.6)" : "#155e75"} />
                        <Text style={[styles.replyIndicatorText, isOwn ? styles.ownReplyText : styles.otherReplyText]} numberOfLines={1}>
                          {typeof item.replyTo.senderId === "string" ? "User" : item.replyTo.senderId.name}
                        </Text>
                        <Text style={[styles.replyIndicatorContent, isOwn ? styles.ownReplyText : styles.otherReplyText]} numberOfLines={1}>
                          {item.replyTo.content || `[${item.replyTo.type}]`}
                        </Text>
                      </View>
                    )}
                    {renderMessageContent()}
                    {(item.reactions && item.reactions.length > 0) && (
                      <View style={styles.reactionsRow}>
                        {item.reactions.map((reaction: MobileMessageReaction, index: number) => (
                          <Text key={index} style={styles.reactionEmoji}>{reaction.emoji}</Text>
                        ))}
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <Text style={[styles.messageMeta, isOwn ? styles.ownMeta : styles.otherMeta]}>
                        {formatTime(item.createdAt)}
                      </Text>
                      <StatusIcon status={item.status} isOwn={isOwn} />
                    </View>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubble-outline" size={40} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyBody}>Send a message to start the conversation.</Text>
              </View>
            }
          />
        )}

        <View style={styles.composer}>
          {selectedMedia ? (
            <View style={styles.mediaPreviewContainer}>
              <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} resizeMode="cover" />
              <Pressable style={styles.cancelMediaButton} onPress={handleCancelMedia}>
                <Ionicons name="close" size={16} color="#ffffff" />
              </Pressable>
              <Pressable
                style={[styles.sendButton, styles.sendMediaButton, isSendingMedia && styles.sendButtonDisabled]}
                disabled={isSendingMedia}
                onPress={handleSendMedia}
              >
                {isSendingMedia ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="send" size={18} color="#ffffff" />
                )}
              </Pressable>
            </View>
          ) : (
            <>
              {replyToMessage && (
                <View style={styles.replyPreviewContainer}>
                  <View style={styles.replyLine} />
                  <View style={styles.replyContent}>
                    <Text style={styles.replyLabel}>Replying to</Text>
                    <Text style={styles.replyText} numberOfLines={1}>
                      {replyToMessage.content || `[${replyToMessage.type}]`}
                    </Text>
                  </View>
                  <Pressable onPress={() => setReplyToMessage(null)} style={styles.cancelReplyButton}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                </View>
              )}
              <Pressable style={styles.attachButton} onPress={handleMediaSelection}>
                <Ionicons name="add-circle-outline" size={24} color="#64748b" />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={handleTextChange}
                placeholder="Type a message"
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={2000}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              {isRecording ? (
                <View style={styles.recordingContainer}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTime}>
                      {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                    </Text>
                  </View>
                  <Pressable style={styles.cancelRecordingButton} onPress={handleCancelRecording} disabled={isSendingVoice}>
                    <Ionicons name="close" size={20} color="#ffffff" />
                  </Pressable>
                  <Pressable style={[styles.sendRecordingButton, isSendingVoice && styles.sendButtonDisabled]} onPress={handleStopRecording} disabled={isSendingVoice}>
                    {isSendingVoice ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="send" size={18} color="#ffffff" />
                    )}
                  </Pressable>
                </View>
              ) : (
                <>
                  {draft.trim() ? (
                    <Pressable
                      style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                      disabled={isSending}
                      onPress={handleSend}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons name="send" size={18} color="#ffffff" />
                      )}
                    </Pressable>
                  ) : (
                    <Pressable style={styles.micButton} onPress={handleStartRecording}>
                      <Ionicons name="mic" size={22} color="#ffffff" />
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showReactionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowReactionPicker(false);
          setSelectedMessageId(null);
        }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => {
          setShowReactionPicker(false);
          setSelectedMessageId(null);
        }}>
          <View style={styles.messageOptionsContainer}>
            <View style={styles.reactionPicker}>
              {REACTION_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => {
                    if (selectedMessageId && session?.user?.userId) {
                      toggleReaction(selectedMessageId, emoji, session.user.userId);
                    }
                    setShowReactionPicker(false);
                    setSelectedMessageId(null);
                  }}
                >
                  <Text style={styles.reactionEmojiButton}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={() => {
                setShowReactionPicker(false);
                setShowDeleteModal(true);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Message</Text>
            <Pressable
              style={styles.deleteOption}
              onPress={() => {
                if (selectedMessageId) {
                  deleteMessage(selectedMessageId, "me");
                }
                setShowDeleteModal(false);
                setSelectedMessageId(null);
              }}
            >
              <Text style={styles.deleteOptionText}>Delete for me</Text>
            </Pressable>
            <Pressable
              style={styles.deleteOption}
              onPress={() => {
                if (selectedMessageId) {
                  deleteMessage(selectedMessageId, "everyone");
                }
                setShowDeleteModal(false);
                setSelectedMessageId(null);
              }}
            >
              <Text style={[styles.deleteOptionText, { color: "#dc2626" }]}>Delete for everyone</Text>
            </Pressable>
            <Pressable
              style={styles.cancelOption}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.cancelOptionText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f2e8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fffdf8",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  typingText: {
    fontSize: 12,
    color: "#155e75",
    fontWeight: "600",
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },
  keyboardView: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  ownRow: {
    justifyContent: "flex-end",
  },
  otherRow: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: "#155e75",
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: "#fffdf8",
    borderBottomLeftRadius: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownText: {
    color: "#ffffff",
  },
  otherText: {
    color: "#0f172a",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  messageMeta: {
    fontSize: 11,
  },
  ownMeta: {
    color: "rgba(255,255,255,0.72)",
  },
  otherMeta: {
    color: "#94a3b8",
  },
  emptyCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
    textAlign: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fffdf8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#155e75",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginTop: 4,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionPickerContainer: {
    position: "absolute",
    bottom: 100,
  },
  reactionPicker: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 30,
    padding: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionEmojiButton: {
    fontSize: 24,
  },
  messageOptionsContainer: {
    position: "absolute",
    bottom: 100,
    alignItems: "center",
    gap: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 16,
  },
  deleteOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  deleteOptionText: {
    fontSize: 16,
    color: "#0f172a",
    textAlign: "center",
  },
  cancelOption: {
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  attachButton: {
    padding: 8,
  },
  mediaPreviewContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  cancelMediaButton: {
    position: "absolute",
    left: 44,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  sendMediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  voiceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  voiceDuration: {
    fontSize: 12,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  fileName: {
    fontSize: 14,
    maxWidth: 150,
  },
  replyPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
    gap: 8,
  },
  replyLine: {
    width: 3,
    height: 30,
    backgroundColor: "#155e75",
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 11,
    color: "#155e75",
    fontWeight: "600",
  },
  replyText: {
    fontSize: 13,
    color: "#475569",
  },
  cancelReplyButton: {
    padding: 4,
  },
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  ownReplyIndicator: {
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  otherReplyIndicator: {
    borderBottomColor: "#e2e8f0",
  },
  replyIndicatorText: {
    fontSize: 11,
    fontWeight: "600",
  },
  ownReplyText: {
    color: "rgba(255,255,255,0.6)",
  },
  otherReplyText: {
    color: "#155e75",
  },
  replyIndicatorContent: {
    fontSize: 11,
    flex: 1,
  },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  recordingTime: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelRecordingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#64748b",
    justifyContent: "center",
    alignItems: "center",
  },
  sendRecordingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#155e75",
    justifyContent: "center",
    alignItems: "center",
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#155e75",
    justifyContent: "center",
    alignItems: "center",
  },
});
