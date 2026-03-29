import React, { useState, useEffect, useCallback } from "react";

const MODELS = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-haiku-4-20250414", label: "Claude Haiku 4" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  bedrock: [
    {
      value: "anthropic.claude-sonnet-4-20250514-v1:0",
      label: "Claude Sonnet 4 (Bedrock)",
    },
    {
      value: "anthropic.claude-haiku-4-20250414-v1:0",
      label: "Claude Haiku 4 (Bedrock)",
    },
    {
      value: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      label: "Claude 3.5 Sonnet (Bedrock)",
    },
    {
      value: "anthropic.claude-3-5-haiku-20241022-v1:0",
      label: "Claude 3.5 Haiku (Bedrock)",
    },
    { value: "amazon.nova-pro-v1:0", label: "Amazon Nova Pro" },
    { value: "amazon.nova-lite-v1:0", label: "Amazon Nova Lite" },
  ],
};

const PROVIDERS = [
  { id: "openai", label: "OpenAI", emoji: "🟢" },
  { id: "anthropic", label: "Anthropic", emoji: "🟣" },
  { id: "bedrock", label: "AWS Bedrock", emoji: "🔶" },
];

function useChromeStorage() {
  const isExtension =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  const get = useCallback(
    (keys) =>
      new Promise((resolve) => {
        if (!isExtension) {
          try {
            const result = {};
            keys.forEach((key) => {
              const val = localStorage.getItem(`pq_${key}`);
              if (val !== null) {
                result[key] = val;
              }
            });
            resolve(result);
          } catch {
            resolve({});
          }
          return;
        }
        chrome.storage.local.get(keys, (result) => resolve(result));
      }),
    [isExtension],
  );

  const set = useCallback(
    (items) =>
      new Promise((resolve, reject) => {
        if (!isExtension) {
          try {
            Object.entries(items).forEach(([key, val]) => {
              localStorage.setItem(`pq_${key}`, val);
            });
            resolve();
          } catch (e) {
            reject(e);
          }
          return;
        }
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      }),
    [isExtension],
  );

  return { get, set };
}

export default function Options() {
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState(MODELS.openai[0].value);
  const [apiKey, setApiKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const storage = useChromeStorage();

  // Load saved settings on mount
  useEffect(() => {
    async function load() {
      try {
        const result = await storage.get([
          "llmProvider",
          "llmModel",
          "apiKey",
          "awsRegion",
        ]);
        if (result.llmProvider && MODELS[result.llmProvider]) {
          setProvider(result.llmProvider);
          setModel(result.llmModel || MODELS[result.llmProvider][0].value);
        }
        if (result.apiKey) setApiKey(result.apiKey);
        if (result.awsRegion) setAwsRegion(result.awsRegion);
      } catch (err) {
        console.warn("Could not load settings:", err);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  // When provider changes, reset model to first option
  const handleProviderChange = useCallback((newProvider) => {
    setProvider(newProvider);
    setModel(MODELS[newProvider][0].value);
    setSaved(false);
    setError(null);
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    setSaved(false);

    try {
      const data = {
        llmProvider: provider,
        llmModel: model,
        apiKey,
      };
      if (provider === "bedrock") {
        data.awsRegion = awsRegion;
      }
      await storage.set(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [provider, model, apiKey, awsRegion, storage]);

  const apiKeyLabel = provider === "bedrock" ? "AWS Bearer Token" : "API Key";

  if (!loaded) {
    return (
      <div className="options-page">
        <div className="options-card">
          <div className="options-loading">
            <div className="options-loading__spinner" />
            <p className="options-loading__text">Loading settings…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="options-page">
      {/* Success Toast */}
      {saved && (
        <div className="options-toast">
          <div className="options-toast__inner">
            <span className="options-toast__icon">✅</span>
            <span>Settings saved successfully!</span>
          </div>
        </div>
      )}

      <div className="options-card">
        {/* Header */}
        <div className="options-header">
          <h1 className="options-header__title">⚙️ PageQuiz Settings</h1>
          <p className="options-header__subtitle">
            Configure your LLM provider to start generating quizzes
          </p>
        </div>

        {/* Provider Selection */}
        <div className="options-section">
          <label className="options-section__label">Provider</label>
          <div className="provider-tiles">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`provider-tile ${
                  provider === p.id ? "provider-tile--active" : ""
                }`}
                onClick={() => handleProviderChange(p.id)}
              >
                <span className="provider-tile__emoji">{p.emoji}</span>
                <span className="provider-tile__name">{p.label}</span>
                {provider === p.id && (
                  <span className="provider-tile__check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div className="options-section">
          <label className="options-section__label" htmlFor="model-input">
            Model
          </label>
          <div className="options-input-group">
            <input
              id="model-input"
              className="options-input"
              type="text"
              list={`models-${provider}`}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setSaved(false);
              }}
              placeholder="Select a model or type a custom model ID"
              spellCheck={false}
              autoComplete="off"
            />
            <datalist id={`models-${provider}`}>
              {MODELS[provider].map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </datalist>
          </div>
          <p className="options-input-hint">
            Choose from common models or enter any model ID.
          </p>
        </div>

        {/* API Key */}
        <div className="options-section">
          <label className="options-section__label" htmlFor="api-key-input">
            {apiKeyLabel}
          </label>
          <div className="options-input-group">
            <input
              id="api-key-input"
              className="options-input"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
              }}
              placeholder={
                provider === "bedrock"
                  ? "Enter your AWS bearer token"
                  : `Enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key`
              }
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="options-input-toggle"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Hide key" : "Show key"}
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="options-input-hint">
            {provider === "bedrock"
              ? "Your token is stored locally and never sent to third parties."
              : "Your key is stored locally and only used for direct API calls."}
          </p>
        </div>

        {/* AWS Region (Bedrock only) */}
        {provider === "bedrock" && (
          <div className="options-section">
            <label className="options-section__label" htmlFor="region-input">
              AWS Region
            </label>
            <input
              id="region-input"
              className="options-input options-input--region"
              type="text"
              value={awsRegion}
              onChange={(e) => {
                setAwsRegion(e.target.value);
                setSaved(false);
              }}
              placeholder="us-east-1"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="options-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="options-actions">
          <button
            type="button"
            className="options-save-btn"
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
          >
            {saving ? (
              <>
                <span className="options-save-btn__spinner" />
                Saving…
              </>
            ) : (
              <>
                <span>💾</span>
                Save Settings
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="options-footer">
          <p>PageQuiz v1.0 — AI-powered quizzes from any web page</p>
        </div>
      </div>
    </div>
  );
}
