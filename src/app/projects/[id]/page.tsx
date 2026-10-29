import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/features/chat/chat-workspace";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <ChatWorkspace key={id} projectId={id} />;
}
