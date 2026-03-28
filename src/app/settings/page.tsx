import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="page-header">
          <h1 className="page-title">设置</h1>
          <p className="page-desc">
            配置 AI 服务商、翻译模型和提示词
          </p>
        </div>
        <SettingsPageClient />
      </div>
    </main>
  );
}
