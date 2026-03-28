import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink mb-6">设置</h1>
      <SettingsPageClient />
    </main>
  );
}
