"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { AppIcon } from "@/components/icons";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const options = [
  { value: "light", label: "Светлая", icon: "light" },
  { value: "dark", label: "Тёмная", icon: "dark" },
  { value: "system", label: "Системная", icon: "system" },
] as const;

export function ThemeSelector() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();
  return (
    <RadioGroup
      aria-label="Цветовая тема"
      value={hydrated ? theme : undefined}
      onValueChange={setTheme}
      disabled={!hydrated}
      className="flex flex-wrap gap-section-head"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex min-h-control-h cursor-pointer items-center gap-inline rounded-md border px-panel-compact py-inline",
            hydrated && theme === option.value && "bg-accent font-semibold",
          )}
        >
          <RadioGroupItem
            value={option.value}
            aria-label={option.label}
            // Selection follows the primitive's roving focus. Do not depend
            // on the vendor's deferred keydown -> click timing for selection.
            onFocus={() => setTheme(option.value)}
          />
          <AppIcon name={option.icon} className="size-4" />
          <span className="text-body-supporting">{option.label}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
