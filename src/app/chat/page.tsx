import type { Metadata } from "next";
import { ChatWorkspace } from "@/features/chat/chat-workspace";

export const metadata: Metadata = { title: "Быстрый чат" };

export default function ChatPage() {
  return <ChatWorkspace />;
}
