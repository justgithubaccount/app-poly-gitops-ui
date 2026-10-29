import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Folder,
  MessageSquare,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sun,
  Workflow,
  type LucideProps,
} from "lucide-react";

const icons = {
  back: ArrowLeft,
  forward: ArrowRight,
  selected: Check,
  open: ChevronRight,
  project: Folder,
  chat: MessageSquare,
  system: Monitor,
  dark: Moon,
  add: Plus,
  refresh: RefreshCw,
  send: Send,
  settings: Settings,
  light: Sun,
  automation: Workflow,
} as const;

export type IconName = keyof typeof icons;

export function AppIcon({ name, ...props }: LucideProps & { name: IconName }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" focusable="false" strokeWidth={1.75} {...props} />;
}
