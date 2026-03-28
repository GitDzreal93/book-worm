"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelInfo } from "@/types/settings";

interface ModelSelectorProps {
  provider: string;
  selectedModel: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({
  provider,
  selectedModel,
  onChange,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/settings/models?provider=${encodeURIComponent(provider)}`,
      );
      const data = (await res.json()) as {
        models: ModelInfo[];
      };
      setModels(data.models);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  // When provider changes, auto-select the first model if the current
  // selection is not in the new list.
  useEffect(() => {
    if (models.length > 0 && !models.some((m) => m.id === selectedModel)) {
      onChange(models[0].id);
    }
  }, [models, selectedModel, onChange]);

  return (
    <select
      value={selectedModel}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className="w-full text-sm border border-line rounded-md px-3 py-2 bg-bg text-ink focus:outline-none focus:border-ink disabled:opacity-50"
    >
      {loading ? (
        <option>加载模型列表...</option>
      ) : (
        models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))
      )}
    </select>
  );
}
