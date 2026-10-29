import type { Metadata } from "next";
import { AutomationWorkspace } from "@/features/automation/automation-workspace";

export const metadata: Metadata = { title: "Автоматизация" };

export default function AutomationPage() {
  return <AutomationWorkspace />;
}
