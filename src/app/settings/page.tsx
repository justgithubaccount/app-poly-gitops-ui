import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ApiDiagnostics } from "@/features/settings/api-diagnostics";
import { ThemeSelector } from "@/features/settings/theme-selector";

export const metadata: Metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-5xl flex-col gap-section-gap px-page-x-mobile pt-page-top pb-section-gap md:px-page-x">
      <PageHeader
        title="Настройки"
        description="Внешний вид рабочего пространства и подключение к Chat API."
      />
      <section aria-labelledby="appearance-heading" className="flex flex-col gap-section-head">
        <h2 id="appearance-heading" className="text-section">
          Внешний вид
        </h2>
        <p className="text-body-supporting text-muted-foreground">
          Тема сохраняется только в этом браузере.
        </p>
        <ThemeSelector />
      </section>
      <ApiDiagnostics />
      <section
        aria-labelledby="provider-settings-heading"
        className="flex flex-col gap-section-head"
      >
        <h2 id="provider-settings-heading" className="text-section">
          Модель и провайдер
        </h2>
        <p className="max-w-reading text-body-supporting text-muted-foreground">
          Настраиваются на стороне FastAPI. API изменения этих настроек пока нет.
        </p>
      </section>
    </div>
  );
}
