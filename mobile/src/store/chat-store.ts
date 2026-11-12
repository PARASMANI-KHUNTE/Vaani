import { create } from "zustand";
import { MobileChat } from "@/lib/types";

type ChatStore = {
  chats: MobileChat[];
  selectedChatId: string | null;
  setChats: (chats: MobileChat[]) => void;
  upsertChat: (chat: MobileChat) => void;
  removeChat: (chatId: string) => void;
  selectChat: (chatId: string | null) => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  selectedChatId: null,
  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats.filter((entry) => entry._id !== chat._id)],
    })),
  removeChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((entry) => entry._id !== chatId),
      selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
    })),
  selectChat: (chatId) => set({ selectedChatId: chatId }),
}));
