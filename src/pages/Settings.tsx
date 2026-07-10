import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bot,
  MessageSquare,
  Database,
  Key,
  Zap,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Save,
  Globe,
  Mail,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Cpu,
  Plus,
  Trash2,
  Activity,
  Tag,
  X,
  Table,
  DollarSign,
  RefreshCw,
  ShoppingCart,
  Sliders,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE } from "@/config";


const sidebarItems = [
  { id: "ai", label: "AI Preferences", icon: Bot },
  { id: "prompts", label: "Manage Prompts", icon: MessageSquare },
  { id: "sources", label: "Manage Sources", icon: Database },
  { id: "keywords", label: "Keywords Watchlist", icon: Tag },
  { id: "duplicates", label: "Duplicate Detection", icon: ShieldCheck },
  { id: "mappings", label: "Mapping Table", icon: Table },
  { id: "pricing", label: "Price Determination", icon: DollarSign },
  { id: "sales_order_context", label: "Sales Order Context", icon: ShoppingCart },
  { id: "tokens", label: "Token Usage Logs", icon: Activity },
  { id: "defaults", label: "Defaults", icon: Sliders },
  { id: "roles", label: "Manage Roles", icon: Key },
  { id: "credits", label: "Manage AI Credits", icon: Zap },
  { id: "users", label: "User Management", icon: Users },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai");

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col p-6 gap-2">
        <h1 className="text-xl font-bold mb-6 text-foreground">Settings</h1>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              activeTab === item.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-10">
        <div className="w-full">
           {activeTab === "ai" && <AIPreferences />}
          {activeTab === "prompts" && <ManagePrompts />}
          {activeTab === "sources" && <ManageSources />}
          {activeTab === "keywords" && <KeywordsWatchlist />}
          {activeTab === "duplicates" && <DuplicateDetectionSettings />}
          {activeTab === "mappings" && <BusinessPartnerMappings />}
          {activeTab === "roles" && <ManageRoles />}
          {activeTab === "credits" && <ManageCredits />}
          {activeTab === "users" && <ManageUsers />}
          {activeTab === "pricing" && <PriceDeterminationSettings />}
          {activeTab === "sales_order_context" && <SalesOrderContextSettings />}
          {activeTab === "tokens" && <TokenUsageLogs />}
          {activeTab === "defaults" && <DefaultsSettings />}
        </div>
      </div>
    </div>
  );
}

function AIPreferences() {
  const [activeProvider, setActiveProvider] = useState("Gemini");
  const [keys, setKeys] = useState({
    openai: "",
    anthropic: "",
    gemini: "",
    localllm: "",
    mygollm: "",
    mygollm_url: "",
  });
  const [models, setModels] = useState({
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-latest",
    gemini: "gemini-3.5-flash",
    localllm: "gemma4:e4b",
    mygollm: "mygo-llm",
  });
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [tokenLogs, setTokenLogs] = useState<any[]>([]);
  const [isLoadingLogsList, setIsLoadingLogsList] = useState(true);

  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    gemini: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
    localllm: ["gemma4:e4b", "gemma:2b", "gemma:7b", "llama3", "llama3.1", "mistral"],
    mygollm: ["mygo-llm"],
  });
  const [isLoadingModels, setIsLoadingModels] = useState<Record<string, boolean>>({});

  const fetchAvailableModels = async (provider: string, apiKeyOverride?: string) => {
    const keyName = provider === "Claude" ? "anthropic" : provider.toLowerCase();
    const apiKey = apiKeyOverride || keys[keyName as keyof typeof keys];
    if (!apiKey && provider !== "LocalLLM") return;

    setIsLoadingModels(prev => ({ ...prev, [keyName]: true }));
    try {
      const res = await fetch(`${API_BASE}/settings/ai/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: apiKey
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(prev => ({ ...prev, [keyName]: data.models }));
          setModels(prev => {
            const currentModel = prev[keyName as keyof typeof prev];
            if (data.models.length > 0 && !data.models.includes(currentModel)) {
              return { ...prev, [keyName]: data.models[0] };
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch available models", err);
    } finally {
      setIsLoadingModels(prev => ({ ...prev, [keyName]: false }));
    }
  };

  const fetchTokenLogs = async () => {
    setIsLoadingLogsList(true);
    try {
      const res = await fetch(`${API_BASE}/settings/token-usage`);
      if (res.ok) {
        const data = await res.json();
        setTokenLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch token logs", err);
    } finally {
      setIsLoadingLogsList(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.active_provider) setActiveProvider(data.active_provider);
        const loadedKeys = {
          openai: data.openai_api_key || "",
          anthropic: data.anthropic_api_key || "",
          gemini: data.gemini_api_key || "",
          localllm: data.localllm_api_key || "",
          mygollm: data.mygollm_api_key || "",
          mygollm_url: data.mygollm_url || "http://ec2-34-224-26-117.compute-1.amazonaws.com",
        };
        setKeys(loadedKeys);
        setModels({
          openai: data.openai_model || "gpt-4o",
          anthropic: data.anthropic_model || "claude-3-5-sonnet-latest",
          gemini: data.gemini_model || "gemini-3.5-flash",
          localllm: data.localllm_model || "gemma4:e4b",
          mygollm: data.mygollm_model || "mygo-llm",
        });

        // Trigger dynamic model fetches if keys are configured
        if (loadedKeys.openai) fetchAvailableModels("OpenAI", loadedKeys.openai);
        if (loadedKeys.anthropic) fetchAvailableModels("Claude", loadedKeys.anthropic);
        if (loadedKeys.gemini) fetchAvailableModels("Gemini", loadedKeys.gemini);
        fetchAvailableModels("LocalLLM", loadedKeys.localllm || "http://localhost:11434");
        if (loadedKeys.mygollm) fetchAvailableModels("MygoLLM", loadedKeys.mygollm);
      })
      .catch(() => {
        toast.error("Failed to load settings data");
      });

    fetchTokenLogs();
  }, []);

  const handleSave = async (provider: string) => {
    setIsSaving(true);
    const stateKey = provider === "Claude" ? "anthropic" : provider.toLowerCase();
    try {
      const payload: any = {
        provider,
        api_key: keys[stateKey as keyof typeof keys],
        model: models[stateKey as keyof typeof models],
      };
      if (provider === "MygoLLM") {
        payload.url = keys.mygollm_url;
      }
      const res = await fetch(`${API_BASE}/settings/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`${provider} preferences saved successfully`);
        setActiveProvider(provider);
        // Refresh models dynamically
        fetchAvailableModels(provider, keys[stateKey as keyof typeof keys]);
      }
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibility = (provider: string) => {
    setVisibility((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const providers = [
    {
      id: "OpenAI",
      color: "bg-emerald-500",
      description: "GPT-4o & GPT-4o-mini",
      keyName: "openai",
    },
    {
      id: "Claude",
      label: "Claude (Anthropic)",
      color: "bg-amber-500",
      description: "Claude 3.5 Sonnet & Haiku",
      keyName: "anthropic",
    },
    {
      id: "Gemini",
      label: "Gemini (Google)",
      color: "bg-blue-500",
      description: "Gemini 2.5 Flash & 2.5 Pro",
      keyName: "gemini",
    },
    {
      id: "LocalLLM",
      label: "Local LLM (Ollama)",
      color: "bg-purple-500",
      description: "Local Ollama - Gemma / Llama",
      keyName: "localllm",
    },
    {
      id: "MygoLLM",
      label: "Mygo LLM",
      color: "bg-teal-500",
      description: "Mygo Gateway LLM Service",
      keyName: "mygollm",
    },
  ];

  const activeProviderKey = (activeProvider === "Claude" ? "anthropic" : (activeProvider || "").toLowerCase()) || "gemini";
  const currentActiveModel = models[activeProviderKey as keyof typeof models] || "Not selected";
  const cumulativeTokens = tokenLogs.reduce((sum, entry) => sum + (entry.totalTokens || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI Model Management</h2>
        <p className="text-muted-foreground text-sm font-medium">Redesign active models, view real-time token logs, and configure API integrations.</p>
      </div>

      {/* Connection Dashboard Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 p-6 rounded-2xl border border-border bg-gradient-to-br from-card/85 to-card/40 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Connected LLM</span>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mt-1">
                {activeProvider} <span className="font-mono text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground">{currentActiveModel}</span>
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Pipeline
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border/50">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Cumulative Tokens Parsed</span>
              <span className="text-xl font-mono font-bold text-primary">{cumulativeTokens.toLocaleString()}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Documents Processed</span>
              <span className="text-xl font-mono font-bold text-foreground">{tokenLogs.length}</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" /> Processing Performance
            </span>
            <p className="text-xs text-muted-foreground leading-normal font-medium">
              Parser automatically extracts fields, checks duplicates, and matches pricing conditions in SAP.
            </p>
          </div>
          <button 
            onClick={fetchTokenLogs}
            className="mt-4 w-full py-2 bg-muted text-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingLogsList && "animate-spin")} /> Refresh Statistics
          </button>
        </div>
      </div>

      {/* Model Setup Stack */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4" /> API Provider Configurations
        </h3>

        <div className="space-y-4">
          {providers.map((p) => {
            const hasKey = !!keys[p.keyName as keyof typeof keys];
            const isCurrentlyActive = activeProvider === p.id;
            return (
              <div
                key={p.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all relative overflow-hidden bg-card",
                  isCurrentlyActive
                    ? "border-primary/50 shadow-md ring-1 ring-primary/10"
                    : "border-border hover:bg-muted/10"
                )}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="mt-1">
                    <input
                      type="radio"
                      checked={activeProvider === p.id}
                      onChange={() => {
                        setActiveProvider(p.id);
                        handleSave(p.id);
                      }}
                      className="w-4 h-4 text-primary focus:ring-primary border-border cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", p.color)} />
                        <span className="font-bold text-foreground">{p.label || p.id}</span>
                        {p.id === "OpenAI" && <span className="text-[10px] text-muted-foreground px-1 border rounded ml-1">Default</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {hasKey ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {p.id === "LocalLLM" ? "Endpoint set" : "Key set"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" /> {p.id === "LocalLLM" ? "No endpoint set" : "No key set"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{p.description}</p>
                  </div>
                </div>

                <div className="ml-8 space-y-3">
                  {p.id === "MygoLLM" && (
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        Gateway URL
                      </label>
                      <input
                        type="text"
                        value={keys.mygollm_url}
                        onChange={(e) => setKeys({ ...keys, mygollm_url: e.target.value })}
                        placeholder="Enter Mygo Gateway URL (e.g. http://ec2-34-224-26-117.compute-1.amazonaws.com)"
                        className="w-full bg-background/50 border border-border h-11 px-4 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  )}
                  <div>
                    {p.id === "MygoLLM" && (
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        API Key
                      </label>
                    )}
                    <div className="relative">
                      <input
                        type={p.id === "LocalLLM" ? "text" : (visibility[p.id] ? "text" : "password")}
                        value={keys[p.keyName as keyof typeof keys]}
                        onChange={(e) => setKeys({ ...keys, [p.keyName]: e.target.value })}
                        placeholder={p.id === "LocalLLM" ? "Enter Ollama Endpoint URL (e.g. http://localhost:11434)" : `Enter ${p.label || p.id} API key`}
                        className="w-full bg-background/50 border border-border h-11 px-4 pr-24 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {p.id !== "LocalLLM" && (
                          <button
                            onClick={() => toggleVisibility(p.id)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors"
                          >
                            {visibility[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleSave(p.id)}
                          disabled={isSaving || (!keys[p.keyName as keyof typeof keys] && p.id !== "LocalLLM")}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
                        >
                          <Save className="h-3 w-3" /> {p.id === "LocalLLM" ? "Save Endpoint" : (p.id === "MygoLLM" ? "Save Credentials" : "Save Key")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {hasKey && (
                  <div className="mt-4 ml-8 p-4 bg-muted/20 border border-border/50 rounded-lg space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-muted-foreground uppercase block">
                      Select Model
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={models[p.keyName as keyof typeof models] || ""}
                        onChange={(e) => setModels({ ...models, [p.keyName]: e.target.value })}
                        className="bg-background border border-border h-9 px-3 rounded-md text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-64 text-foreground font-medium"
                      >
                        {(availableModels[p.keyName] || []).map((m) => (
                          <option key={m} value={m}>
                            {m} {m.includes("recommended") || m.includes("latest") || m === "gpt-4o" || m === "gemini-3.5-flash" || m === "claude-3-5-sonnet-latest" ? "(Recommended)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => fetchAvailableModels(p.id)}
                        disabled={isLoadingModels[p.keyName] || isSaving}
                        className="p-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-all active:scale-[0.95] flex items-center justify-center h-9"
                        title={p.id === "LocalLLM" ? "Scan Ollama models" : "Fetch latest available models for this key"}
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoadingModels[p.keyName] && "animate-spin")} />
                      </button>
                      <button
                        onClick={() => handleSave(p.id)}
                        disabled={isSaving}
                        className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5 h-9"
                      >
                        <Save className="h-3.5 w-3.5" /> Save Model
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Logs Panel */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Database className="h-4 w-4" /> Recent Document Parsing Logs
        </h3>

        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Document / Context</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">AI Model</th>
                  <th className="p-4 text-center">Prompt Tokens</th>
                  <th className="p-4 text-center">Completion Tokens</th>
                  <th className="p-4 text-center">Total Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoadingLogsList ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        <span>Loading usage records...</span>
                      </div>
                    </td>
                  </tr>
                ) : tokenLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-medium italic">
                      No parsing records logged yet. Process a document to record token usage metrics.
                    </td>
                  </tr>
                ) : (
                  tokenLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors font-medium">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold text-foreground break-all max-w-[220px]" title={log.docName}>
                            {log.docName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-bold">
                          {log.model}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-muted-foreground">
                        {log.promptTokens.toLocaleString()}
                      </td>
                      <td className="p-4 text-center font-mono text-muted-foreground">
                        {log.completionTokens.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {log.totalTokens.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagePrompts() {
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings/prompt`)
      .then((res) => res.json())
      .then((data) => {
        setPrompt(data.prompt);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        toast.success("Analysis prompt updated successfully");
      }
    } catch (err) {
      toast.error("Failed to update prompt");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Manage Prompts</h2>
        <p className="text-muted-foreground text-sm">Customize the AI instructions for document analysis and extraction</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Analysis System Prompt
        </h3>
        
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Core Extraction Instructions
            </span>
            <div className="flex items-center gap-2">
               <span className="px-2 py-0.5 rounded-full bg-success/10 text-[10px] font-bold text-success border border-success/20">Active</span>
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-[500px] p-6 text-sm font-mono bg-background focus:outline-none focus:ring-inset focus:ring-1 focus:ring-primary leading-relaxed"
            placeholder="Loading system prompt..."
          />
          <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground max-w-sm">
              Warning: Modifying the system prompt can significantly alter extraction results. Ensure the JSON schema rules are maintained.
            </p>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg shadow-md hover:bg-primary/90 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Download className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save System Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageSources() {
  const [emails, setEmails] = useState<any[]>([]);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookUser, setOutlookUser] = useState("");
  
  // Add email wizard state
  const [isAdding, setIsAdding] = useState(false);
  const [addStep, setAddStep] = useState(1); // 1: Choose Email Provider Type, 2: Connection Info
  const [selectedProvider, setSelectedProvider] = useState<"Gmail" | "Outlook">("Gmail");
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newServer, setNewServer] = useState("imap.gmail.com");
  const [newExpectedDocType, setNewExpectedDocType] = useState("Vendor Invoice");
  const [newSalesOrg, setNewSalesOrg] = useState("");
  const [newDistrChan, setNewDistrChan] = useState("");
  const [newDivision, setNewDivision] = useState("");
  const [newCompanyCode, setNewCompanyCode] = useState("");
  
  // Testing connection state map: email -> boolean
  const [isTestingEmail, setIsTestingEmail] = useState<Record<string, boolean>>({});
  const [emailStatus, setEmailStatus] = useState<Record<string, "Connected" | "Disconnected" | "Pending">>({});

  const handleEmailChange = (val: string) => {
    setNewEmail(val);
  };

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        let currentEmails = data.emails || [];
        
        // Migrate legacy Gmail config if emails list is empty and user_email exists
        if (currentEmails.length === 0 && data.user_email) {
          currentEmails = [{
            id: Date.now(),
            email: data.user_email,
            password: data.app_password || "",
            server: data.imap_server || "imap.gmail.com",
            expected_doc_type: "Vendor Invoice",
            domain: data.user_email.includes('@') ? data.user_email.split('@')[1] : "",
            customer_name: "",
            customer_address: "",
            active: true,
            provider: "Gmail"
          }];
        }

        if (data.outlook_tokens) {
          setOutlookConnected(true);
          setOutlookUser(data.outlook_tokens.user_principal_name || "");
        }

        // Handle Outlook authentication callback success redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('outlook') === 'success' && data.outlook_tokens) {
          const pendingDocType = localStorage.getItem('outlook_pending_expected_doc_type') || 'Vendor Invoice';
          const pendingSalesOrg = localStorage.getItem('outlook_pending_sales_org') || '';
          const pendingDistrChan = localStorage.getItem('outlook_pending_distr_chan') || '';
          const pendingDivision = localStorage.getItem('outlook_pending_division') || '';
          const pendingCompanyCode = localStorage.getItem('outlook_pending_company_code') || '';

          localStorage.removeItem('outlook_pending_expected_doc_type');
          localStorage.removeItem('outlook_pending_sales_org');
          localStorage.removeItem('outlook_pending_distr_chan');
          localStorage.removeItem('outlook_pending_division');
          localStorage.removeItem('outlook_pending_company_code');

          const newOutlookEmail = {
            id: Date.now(),
            email: data.outlook_tokens.user_principal_name || 'Outlook Mail',
            provider: 'Outlook',
            outlook_tokens: data.outlook_tokens,
            active: true,
            expected_doc_type: pendingDocType,
            sales_org: pendingSalesOrg,
            distr_chan: pendingDistrChan,
            division: pendingDivision,
            company_code: pendingCompanyCode
          };

          // Filter out existing email with same address to avoid duplicate
          const updated = [
            ...currentEmails.filter((e: any) => e.email !== newOutlookEmail.email),
            newOutlookEmail
          ];

          // Save to backend and update state
          fetch(`${API_BASE}/settings/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: updated, outlook_tokens: null }), // Clear root outlook_tokens
          }).then((res) => {
            if (res.ok) {
              toast.success(`Successfully connected Outlook account: ${newOutlookEmail.email}`);
              setEmails(updated);
            }
          });

          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          setEmails(currentEmails);
        }

        // Initialize statuses
        currentEmails.forEach((eConf: any) => {
          if (eConf && eConf.provider === 'Outlook') {
            setEmailStatus(prev => ({ ...prev, [eConf.email]: "Connected" }));
          } else if (eConf) {
            setEmailStatus(prev => ({ ...prev, [eConf.email]: eConf.password ? "Connected" : "Disconnected" }));
          }
        });
      })
      .catch((err) => {
        toast.error("Failed to load settings data");
      });
  }, []);

  const handleSaveEmails = async (updatedEmails: any[]) => {
    try {
      const res = await fetch(`${API_BASE}/settings/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: updatedEmails }),
      });
      if (res.ok) {
        toast.success("Email configurations updated successfully");
        setEmails(updatedEmails);
      }
    } catch (err) {
      toast.error("Failed to save email settings");
    }
  };

  const handleTestEmail = async (emailConf: any) => {
    if (emailConf.provider === "Outlook") {
      toast.success(`Outlook account ${emailConf.email} is active via token authentication.`);
      return;
    }
    setIsTestingEmail(prev => ({ ...prev, [emailConf.email]: true }));
    setEmailStatus(prev => ({ ...prev, [emailConf.email]: "Pending" }));
    try {
      const res = await fetch(`${API_BASE}/settings/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: emailConf.email,
          app_password: emailConf.password,
          imap_server: emailConf.server
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setEmailStatus(prev => ({ ...prev, [emailConf.email]: "Connected" }));
        toast.success(`Connection to ${emailConf.email} successful!`);
      } else {
        setEmailStatus(prev => ({ ...prev, [emailConf.email]: "Disconnected" }));
        toast.error(`Connection to ${emailConf.email} failed: ` + data.message);
      }
    } catch (err) {
      setEmailStatus(prev => ({ ...prev, [emailConf.email]: "Disconnected" }));
      toast.error(`An error occurred testing ${emailConf.email}`);
    } finally {
      setIsTestingEmail(prev => ({ ...prev, [emailConf.email]: false }));
    }
  };

  const handleAddEmailGmail = () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error("Email and App Password are required for Gmail / IMAP");
      return;
    }
    const emailObj = {
      id: Date.now(),
      email: newEmail.trim(),
      password: newPassword,
      server: newServer.trim() || "imap.gmail.com",
      active: true,
      provider: "Gmail",
      expected_doc_type: newExpectedDocType,
      sales_org: newExpectedDocType === "Sales Order" ? newSalesOrg.trim() : "",
      distr_chan: newExpectedDocType === "Sales Order" ? newDistrChan.trim() : "",
      division: newExpectedDocType === "Sales Order" ? newDivision.trim() : "",
      company_code: newExpectedDocType === "Vendor Invoice" ? newCompanyCode.trim() : ""
    };
    const updated = [...emails, emailObj];
    handleSaveEmails(updated);
    resetWizard();
  };

  const handleAddEmailOutlook = () => {
    localStorage.setItem('outlook_pending_expected_doc_type', newExpectedDocType);
    localStorage.setItem('outlook_pending_sales_org', newExpectedDocType === "Sales Order" ? newSalesOrg.trim() : "");
    localStorage.setItem('outlook_pending_distr_chan', newExpectedDocType === "Sales Order" ? newDistrChan.trim() : "");
    localStorage.setItem('outlook_pending_division', newExpectedDocType === "Sales Order" ? newDivision.trim() : "");
    localStorage.setItem('outlook_pending_company_code', newExpectedDocType === "Vendor Invoice" ? newCompanyCode.trim() : "");

    toast.info("Redirecting to Microsoft secure sign-in portal...");
    window.location.href = `${API_BASE}/auth/outlook/login?redirect=true`;
  };

  const resetWizard = () => {
    setNewEmail("");
    setNewPassword("");
    setNewServer("imap.gmail.com");
    setNewExpectedDocType("Vendor Invoice");
    setNewSalesOrg("");
    setNewDistrChan("");
    setNewDivision("");
    setNewCompanyCode("");
    setIsAdding(false);
    setAddStep(1);
  };

  const handleDeleteEmail = (id: number) => {
    if (!confirm("Are you sure you want to remove this email configuration?")) return;
    const updated = emails.filter(e => e.id !== id);
    handleSaveEmails(updated);
  };

  const handleToggleEmail = (id: number) => {
    const updated = emails.map(e => e.id === id ? { ...e, active: !e.active } : e);
    handleSaveEmails(updated);
  };

  const handleFieldChange = (id: number, field: string, value: string) => {
    const updated = emails.map(e => e.id === id ? { ...e, [field]: value } : e);
    setEmails(updated);
  };

  const handleBlurSave = () => {
    handleSaveEmails(emails);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Manage Sources</h2>
          <p className="text-muted-foreground text-sm">Configure active email servers, provider types, document mapping, and SAP company routing</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add Email Channel
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Wizard Add Form */}
        {isAdding && (
          <div className="p-6 border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-primary to-blue-500" />
            
            {/* Header / Steps Indicator */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Add Email Intake Connection</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Setup new ingestion channel credentials</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", addStep >= 1 ? "bg-primary" : "bg-muted")} />
                <span className={cn("w-2 h-2 rounded-full", addStep >= 2 ? "bg-primary" : "bg-muted")} />
                <span className="text-[10px] font-bold text-muted-foreground ml-1">Step {addStep} of 2</span>
              </div>
            </div>

            {/* STEP 1: SELECT PROVIDER */}
            {addStep === 1 && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase">Choose Email Provider Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => { setSelectedProvider("Gmail"); setAddStep(2); }}
                    className={cn(
                      "p-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-start gap-4 bg-background/50",
                      selectedProvider === "Gmail"
                        ? "border-red-500/80 bg-red-500/5 shadow-md shadow-red-500/5"
                        : "border-border hover:border-red-500/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-foreground">Gmail / IMAP Server</h5>
                      <p className="text-xs text-muted-foreground mt-1">Connect standard inbox using custom host, username, and secure App Password credentialing.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => { setSelectedProvider("Outlook"); setAddStep(2); }}
                    className={cn(
                      "p-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-start gap-4 bg-background/50",
                      selectedProvider === "Outlook"
                        ? "border-blue-500/80 bg-blue-500/5 shadow-md shadow-blue-500/5"
                        : "border-border hover:border-blue-500/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-foreground">Microsoft Outlook (OAuth)</h5>
                      <p className="text-xs text-muted-foreground mt-1">Secure, cloud-direct direct integration using official Microsoft Graph API single sign-on authentication.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CONNECTION INFO & FINISH */}
            {addStep === 2 && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Connection Configuration details</label>
                
                {/* Routing & Sales Area Config */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-4">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Document Routing Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected Document Type</label>
                      <select
                        value={newExpectedDocType}
                        onChange={(e) => setNewExpectedDocType(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-medium"
                      >
                        <option value="Vendor Invoice">Vendor Invoice</option>
                        <option value="Sales Order">Sales Order</option>
                      </select>
                    </div>

                    {newExpectedDocType === "Sales Order" ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Sales Org</label>
                          <input
                            value={newSalesOrg}
                            onChange={(e) => setNewSalesOrg(e.target.value)}
                            placeholder="1010"
                            className="w-full h-10 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Dist Channel</label>
                          <input
                            value={newDistrChan}
                            onChange={(e) => setNewDistrChan(e.target.value)}
                            placeholder="01"
                            className="w-full h-10 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Division</label>
                          <input
                            value={newDivision}
                            onChange={(e) => setNewDivision(e.target.value)}
                            placeholder="01"
                            className="w-full h-10 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Company Code</label>
                        <input
                          value={newCompanyCode}
                          onChange={(e) => setNewCompanyCode(e.target.value)}
                          placeholder="1010"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <label className="text-xs font-bold text-muted-foreground uppercase block mt-4">Provider Security Details</label>
                
                {selectedProvider === "Gmail" ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Input standard server credentials. Be sure to use an App Password if connecting with an active Gmail mailbox.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
                        <input
                          value={newEmail}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder="e.g. sales@company.com"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">App Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="16-character secure password"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">IMAP Server Host</label>
                        <input
                          value={newServer}
                          onChange={(e) => setNewServer(e.target.value)}
                          placeholder="imap.gmail.com"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => setAddStep(1)}
                        className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleAddEmailGmail}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                      >
                        Connect Gmail Server
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-2 leading-relaxed">
                      <p className="font-bold flex items-center gap-1.5">
                        <Globe className="h-4 w-4" /> Secure Token-Based OAuth Redirection
                      </p>
                      <p>You will now be redirected to the secure Microsoft Account authentication landing page.</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => setAddStep(1)}
                        className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleAddEmailOutlook}
                        className="px-6 py-2.5 bg-[#0078d4] text-white rounded-lg text-xs font-bold hover:bg-[#005a9e] shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all"
                      >
                        <Globe className="h-4 w-4" /> Sign In with Microsoft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={resetWizard}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/80 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Active Email Connections */}
        <div className="border border-border/80 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-sm shadow-lg mb-6">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Active Email Connections</span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              {emails.length} channels configured
            </span>
          </div>

          {emails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16">Active</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Connection</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-20">Provider</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Routing Details</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-20">Status</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {emails.map((eConf) => (
                    <tr key={eConf.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={eConf.active !== false}
                          onChange={() => handleToggleEmail(eConf.id)}
                          className="rounded border-border cursor-pointer text-primary w-4 h-4 bg-background outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-foreground text-sm">{eConf.email}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {eConf.provider === "Outlook" ? "Microsoft Graph Cloud Sync" : eConf.server}
                        </div>
                      </td>
                      <td className="p-4">
                        {eConf.provider === "Outlook" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 shadow-sm">
                            <Globe className="h-3 w-3" /> Outlook
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 shadow-sm">
                            <Mail className="h-3 w-3" /> Gmail / IMAP
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={eConf.expected_doc_type || "Vendor Invoice"}
                            onChange={(e) => {
                              const updatedVal = e.target.value;
                              handleFieldChange(eConf.id, "expected_doc_type", updatedVal);
                              handleSaveEmails(emails.map(x => x.id === eConf.id ? { ...x, expected_doc_type: updatedVal } : x));
                            }}
                            className="bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary font-medium w-36"
                          >
                            <option value="Sales Order">Sales Order</option>
                            <option value="Vendor Invoice">Vendor Invoice</option>
                          </select>
                          {(eConf.expected_doc_type || "Vendor Invoice") === "Sales Order" ? (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold">Sales Org</span>
                                <input
                                  type="text"
                                  value={eConf.sales_org || ""}
                                  onChange={(e) => handleFieldChange(eConf.id, "sales_org", e.target.value)}
                                  onBlur={handleBlurSave}
                                  placeholder="1010"
                                  className="w-14 h-7 px-1.5 rounded border border-border bg-background text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold">Dist Channel</span>
                                <input
                                  type="text"
                                  value={eConf.distr_chan || ""}
                                  onChange={(e) => handleFieldChange(eConf.id, "distr_chan", e.target.value)}
                                  onBlur={handleBlurSave}
                                  placeholder="01"
                                  className="w-14 h-7 px-1.5 rounded border border-border bg-background text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold">Division</span>
                                <input
                                  type="text"
                                  value={eConf.division || ""}
                                  onChange={(e) => handleFieldChange(eConf.id, "division", e.target.value)}
                                  onBlur={handleBlurSave}
                                  placeholder="01"
                                  className="w-14 h-7 px-1.5 rounded border border-border bg-background text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold">Company Code</span>
                                <input
                                  type="text"
                                  value={eConf.company_code || ""}
                                  onChange={(e) => handleFieldChange(eConf.id, "company_code", e.target.value)}
                                  onBlur={handleBlurSave}
                                  placeholder="1010"
                                  className="w-16 h-7 px-1.5 rounded border border-border bg-background text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {emailStatus[eConf.email] === "Pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                            <Activity className="h-3 w-3 animate-spin" /> Verifying
                          </span>
                        ) : emailStatus[eConf.email] === "Connected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Disconnected
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {eConf.provider !== "Outlook" && (
                            <button
                              onClick={() => handleTestEmail(eConf)}
                              disabled={isTestingEmail[eConf.email]}
                              className="px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50"
                            >
                              Test
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEmail(eConf.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto opacity-30 mb-2 text-primary" />
              <p className="text-xs font-bold text-foreground">No active email connections</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function KeywordsWatchlist() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.email_body_keywords) {
          setKeywords(data.email_body_keywords);
        }
      });
  }, []);

  const handleSaveKeywords = async (updatedKeywords: string[]) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_body_keywords: updatedKeywords }),
      });
      if (res.ok) {
        toast.success("Keywords watchlist updated successfully");
        setKeywords(updatedKeywords);
      }
    } catch (err) {
      toast.error("Failed to save keywords");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim()) return;
    if (keywords.includes(newKeyword.trim())) {
      toast.info("Keyword already exists");
      return;
    }
    const updated = [...keywords, newKeyword.trim()];
    handleSaveKeywords(updated);
    setNewKeyword("");
  };

  const handleRemoveKeyword = (kw: string) => {
    const updated = keywords.filter(k => k !== kw);
    handleSaveKeywords(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Keywords Watchlist</h2>
        <p className="text-muted-foreground text-sm">Scan raw email text bodies for expected documents if no attachments exist</p>
      </div>

      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Email Body Keywords Watchlist</h3>
            <p className="text-[10px] text-muted-foreground">Define triggering keywords for text body parsing</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Define keywords below. When an incoming email is received and does not contain a PDF attachment, the system will search for these terms in the text body (case-insensitive). If matched, it will run AI extraction on the text body directly.
          </p>
          
          <form onSubmit={handleAddKeyword} className="flex gap-2 max-w-md">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. sales order, PO, purchase order, order confirmation"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1 hover:shadow-sm disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add Keyword
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {keywords.length > 0 ? (
              keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shadow-sm"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="hover:bg-primary/25 rounded-full p-0.5 transition-all text-primary/75 hover:text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No keywords added yet. Add terms above to activate body parsing.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DuplicateDetectionSettings() {
  const [docType, setDocType] = useState("PO order");
  const [rules, setRules] = useState({
    "PO order": ["PO Number", "Vendor Name", "Total Amount"],
    "Sales order": ["Order ID", "Customer Name", "Order Date"]
  });

  const availableHeaders = [
    "PO Number", "Vendor Name", "Total Amount", "Order ID", "Customer Name", "Order Date", "Invoice Number", "Quantity", "Unit Price", "Currency"
  ];

  const toggleHeader = (header: string) => {
    setRules(prev => {
      const current = prev[docType as keyof typeof prev];
      if (current.includes(header)) {
        return { ...prev, [docType]: current.filter(h => h !== header) };
      } else {
        return { ...prev, [docType]: [...current, header] };
      }
    });
    toast.success(`Updated duplicate criteria for ${docType}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Duplicate Detection</h2>
        <p className="text-muted-foreground text-sm">Configure how system identifies duplicate documents</p>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
          <label className="text-xs font-bold text-muted-foreground uppercase block mb-3">Document Type Selection</label>
          <div className="relative group">
            <select 
              value={docType} 
              onChange={(e) => setDocType(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none transition-all cursor-pointer font-medium"
            >
              <option value="PO order">Purchase Order (PO)</option>
              <option value="Sales order">Sales Order</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <Bot className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary" /> Fields to Check for Duplicates
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Select the data fields that must match for a document to be flagged as a duplicate in "{docType}" category.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableHeaders.map(header => (
                <button
                  key={header}
                  onClick={() => toggleHeader(header)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border text-sm transition-all text-left",
                    rules[docType as keyof typeof rules].includes(header)
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/10 grayscale opacity-80 hover:grayscale-0 hover:opacity-100"
                  )}
                >
                  <span className="font-semibold">{header}</span>
                  {rules[docType as keyof typeof rules].includes(header) ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-dashed border-muted-foreground/30" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-dashed border-border flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
             </div>
             <div>
                <p className="text-xs font-bold text-foreground line-clamp-1">Auto-Archive High Confidence Duplicates</p>
                <p className="text-[10px] text-muted-foreground">Matches with {'>'}95% confidence will be automatically archived.</p>
             </div>
             <div className="ml-auto">
                <div className="w-10 h-5 bg-primary/20 rounded-full relative p-1 cursor-pointer">
                   <div className="w-3 h-3 bg-primary rounded-full absolute right-1" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageRoles() {
  const roles = [
    { name: "Administrator", description: "Full access to all system features, user management, and sensitive settings.", users: 2, level: "High" },
    { name: "Reviewer", description: "Can view, edit, and verify extracted document data. Limited settings access.", users: 5, level: "Medium" },
    { name: "Viewer", description: "Read-only access to documents, analytics, and non-sensitive data.", users: 12, level: "Low" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Manage Roles</h2>
        <p className="text-muted-foreground text-sm">Define system permissions and organizational access levels</p>
      </div>

      <div className="grid gap-4">
        {roles.map(role => (
          <div key={role.name} className="p-6 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all flex items-start justify-between group shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-foreground text-lg">{role.name}</h3>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest",
                  role.level === "High" ? "bg-red-100 text-red-600 border-red-200" :
                  role.level === "Medium" ? "bg-orange-100 text-orange-600 border-orange-200" :
                  "bg-blue-100 text-blue-600 border-blue-200"
                )}>
                  {role.level} Access
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 max-w-xl">{role.description}</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-bold">
                       U{i+1}
                    </div>
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-card bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                    +{role.users - 3}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {role.users} Users Assigned
                </span>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all self-center group-hover:shadow-lg group-hover:shadow-primary/10">
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageCredits() {
  const metrics = [
    { label: "Total Quota", value: "50,000", subtitle: "Monthly allowance", icon: Database, color: "text-blue-500" },
    { label: "Credits Used", value: "12,450", subtitle: "Updated live", icon: Zap, color: "text-amber-500" },
    { label: "Remaining", value: "37,550", subtitle: "75% left", icon: CheckCircle2, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI Credits usage</h2>
        <p className="text-muted-foreground text-sm">Monitor credits consumed by automated extraction agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map(m => (
          <div key={m.label} className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <m.icon className="h-12 w-12" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{m.label}</span>
            <div className="text-3xl font-black text-foreground mt-2">{m.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
               <span className={cn("w-1.5 h-1.5 rounded-full", m.color.replace('text', 'bg'))} />
               {m.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div className="relative p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background flex items-center justify-between overflow-hidden shadow-inner">
        <div className="absolute right-[-10%] top-[-20%] opacity-[0.03] rotate-12">
           <Zap size={200} />
        </div>
        <div className="relative z-10 max-w-lg">
          <h3 className="text-xl font-black text-foreground mb-2">Maximize your automation throughput</h3>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            "We've seen a 30% increase in productivity for teams using our premium high-volume extraction plans."
          </p>
          <div className="mt-6 flex items-center gap-4">
             <button className="px-8 py-3 bg-primary text-primary-foreground font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-105 transition-all text-sm uppercase tracking-tighter">
               Upgrade Enterprise Plan
             </button>
             <button className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors underline">
               Download detailed report
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Viewer");

  const loadUsers = () => {
    fetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });
      if (res.ok) {
        toast.success("User added successfully");
        setIsAdding(false);
        setName("");
        setEmail("");
        setPassword("");
        loadUsers();
      } else {
        const data = await res.json();
        toast.error(data.detail || "Failed to add user");
      }
    } catch {
      toast.error("Failed to connect to user database server");
    }
  };

  const handleDeleteUser = async (id: string, emailAddress: string) => {
    const sessionUser = JSON.parse(localStorage.getItem("user") || '{}');
    if (sessionUser.email === emailAddress) {
      toast.error("You cannot delete your own logged-in account!");
      return;
    }
    if (!confirm("Are you sure you want to remove this user account?")) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("User deleted successfully");
        loadUsers();
      } else {
        toast.error("Failed to delete user");
      }
    } catch {
      toast.error("Failed to connect to user database server");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">User Management</h2>
          <p className="text-muted-foreground text-sm">Control access, roles, and security for your organization</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Users className="h-4 w-4" /> Add User
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddUser} className="p-5 border border-border bg-card rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-250 shadow-md">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">Register New Corporate User</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@mygo.ai"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Initial Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="Administrator">Administrator</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 border border-border rounded text-[10px] font-bold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-[10px] font-bold hover:shadow-sm"
            >
              Add Corporate User
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">User Profile</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assigned Role</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Access Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Created At</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-muted/10 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary text-xs">
                        {u.name && typeof u.name === 'string' && u.name.trim().length > 0 ? u.name.trim().charAt(0).toUpperCase() : "U"}
                     </div>
                     <div>
                        <div className="font-bold text-sm text-foreground">{u.name}</div>
                        <div className="text-[10px] text-muted-foreground">{u.email}</div>
                     </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-bold text-foreground">{u.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase shadow-sm",
                    u.active !== false ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                  )}>
                    {u.active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] font-semibold text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteUser(u.id, u.email)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Download({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

interface BPMapping {
  email: string;
  partnerName: string;
  expected_doc_type: string;
  customer_address?: string;
  sales_org?: string;
  distr_chan?: string;
  division?: string;
  company_code?: string;
}

function BusinessPartnerMappings() {
  const [mappings, setMappings] = useState<BPMapping[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newDocType, setNewDocType] = useState("Sales Order");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newSalesOrg, setNewSalesOrg] = useState("1010");
  const [newDistrChan, setNewDistrChan] = useState("01");
  const [newDivision, setNewDivision] = useState("01");
  const [newCompanyCode, setNewCompanyCode] = useState("1010");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.bp_mappings && Array.isArray(data.bp_mappings)) {
          setMappings(data.bp_mappings);
        }
      })
      .catch(() => toast.error("Failed to load mappings"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleFetchAddress = async () => {
    if (!newPartnerName.trim()) {
      toast.error("Please enter a Business Partner Name/ID first");
      return;
    }
    setIsFetchingAddress(true);
    try {
      const res = await fetch(`${API_BASE}/sap/business-partner?query=${encodeURIComponent(newPartnerName.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch Business Partner from SAP");
      }
      
      const addrList = data.to_BusinessPartnerAddress?.results || data.to_BusinessPartnerAddress || [];
      const addr = Array.isArray(addrList) ? addrList[0] : addrList;
      if (!addr) {
        toast.warning("No address record found in SAP for this Business Partner");
        setNewCustomerAddress("No Address Record in SAP");
        return;
      }
      const street = addr.StreetName || addr.Street || '';
      const city = addr.CityName || addr.City || '';
      const postal = addr.PostalCode || '';
      const country = addr.Country || '';
      const formattedAddr = [street, city, postal, country].filter(Boolean).join(', ');
      
      setNewCustomerAddress(formattedAddr || "No Address Record in SAP");
      toast.success("Customer address successfully loaded from SAP!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch customer address from SAP");
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const handleAddMapping = () => {
    if (!newEmail.trim() || !newPartnerName.trim()) {
      toast.error("Please provide both email and partner name");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("Please provide a valid email address");
      return;
    }

    // Check for duplicates
    if (mappings.some(m => m.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      toast.error("This email address is already mapped");
      return;
    }

    const mappingObj: BPMapping = {
      email: newEmail.trim().toLowerCase(),
      partnerName: newPartnerName.trim(),
      expected_doc_type: newDocType,
    };

    if (newDocType === "Sales Order") {
      mappingObj.sales_org = newSalesOrg.trim() || "1010";
      mappingObj.distr_chan = newDistrChan.trim() || "01";
      mappingObj.division = newDivision.trim() || "01";
      mappingObj.customer_address = newCustomerAddress.trim();
    } else {
      mappingObj.company_code = newCompanyCode.trim() || "1010";
      mappingObj.customer_address = newCustomerAddress.trim();
    }

    setMappings([...mappings, mappingObj]);
    setNewEmail("");
    setNewPartnerName("");
    setNewCustomerAddress("");
    setNewSalesOrg("1010");
    setNewDistrChan("01");
    setNewDivision("01");
    setNewCompanyCode("1010");
    toast.success("Mapping added to draft list");
  };

  const handleDeleteMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
    toast.success("Mapping removed from draft list");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/bp-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Mappings saved successfully");
      } else {
        toast.error(data.error || "Failed to save mappings");
      }
    } catch (err) {
      toast.error("Failed to save mappings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Business Partner Mappings</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Map incoming email sender addresses directly to SAP Business Partners and configure default document routing, Sales Area parameters, or Company Codes.
        </p>
      </div>

      <div className="fiori-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Mapping</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email ID</label>
            <input
              type="email"
              placeholder="supplier@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected Doc Type</label>
            <select
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value)}
              className="w-full h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
            >
              <option value="Sales Order">Sales Order</option>
              <option value="Vendor Invoice">Vendor Invoice</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business Partner Name / ID</label>
            <input
              type="text"
              placeholder="e.g. C00003 or Albyco Belgium"
              value={newPartnerName}
              onChange={(e) => setNewPartnerName(e.target.value)}
              className="w-full h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Will be auto-filled or type manually"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                className="flex-1 h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
              />
              <button
                type="button"
                onClick={handleFetchAddress}
                disabled={isFetchingAddress}
                className="px-3 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {isFetchingAddress ? (
                  <Activity className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                Fetch Address
              </button>
            </div>
          </div>

          {newDocType === "Sales Order" ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sales Org</label>
                <input
                  type="text"
                  placeholder="1010"
                  value={newSalesOrg}
                  onChange={(e) => setNewSalesOrg(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-bold text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dist. Chan</label>
                <input
                  type="text"
                  placeholder="01"
                  value={newDistrChan}
                  onChange={(e) => setNewDistrChan(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-bold text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Division</label>
                <input
                  type="text"
                  placeholder="01"
                  value={newDivision}
                  onChange={(e) => setNewDivision(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-bold text-center"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company Code</label>
              <input
                type="text"
                placeholder="1010"
                value={newCompanyCode}
                onChange={(e) => setNewCompanyCode(e.target.value)}
                className="w-full h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 font-bold"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleAddMapping}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Add Mapping
          </button>
        </div>
      </div>

      <div className="fiori-card overflow-hidden">
        <div className="p-3 border-b border-border bg-card">
          <span className="text-xs font-bold uppercase tracking-tight">Active Mappings ({mappings.length})</span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">Loading mappings...</div>
          ) : (
            <table className="fiori-smart-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Email ID</th>
                  <th className="text-left w-28">Doc Type</th>
                  <th className="text-left">Business Partner Name</th>
                  <th className="text-left w-36">Sales Area / Co.Code</th>
                  <th className="text-left">Address</th>
                  <th className="w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, index) => (
                  <tr key={index} className="hover:bg-muted/10">
                    <td className="font-mono text-xs font-medium text-foreground">{m.email}</td>
                    <td>
                      {m.expected_doc_type === "Sales Order" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                          Sales Order
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400">
                          Vendor Invoice
                        </span>
                      )}
                    </td>
                    <td className="text-xs font-bold text-primary">{m.partnerName}</td>
                    <td className="text-xs font-mono">
                      {m.expected_doc_type === "Sales Order" ? (
                        <span className="text-muted-foreground">
                          Org: <strong className="text-foreground">{m.sales_org || "1010"}</strong> | Chan: <strong className="text-foreground">{m.distr_chan || "01"}</strong> | Div: <strong className="text-foreground">{m.division || "01"}</strong>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          CoCode: <strong className="text-foreground">{m.company_code || "1010"}</strong>
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground max-w-xs truncate" title={m.customer_address}>
                      {m.customer_address || "—"}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleDeleteMapping(index)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                        title="Delete Mapping"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      No active mappings defined. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Mappings"}
        </button>
      </div>
    </div>
  );
}


function DefaultsSettings() {
  const [selectedContext, setSelectedContext] = useState("Sales Order");
  const [defaultOrderType, setDefaultOrderType] = useState("OR1");
  const [defaultOrderBlock, setDefaultOrderBlock] = useState("");
  const [pricingCondition, setPricingCondition] = useState("PR00");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("0003");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.sales_order_default_type !== undefined) {
            setDefaultOrderType(data.sales_order_default_type);
          }
          if (data.sales_order_default_block !== undefined) {
            setDefaultOrderBlock(data.sales_order_default_block);
          }
          if (data.sales_order_pricing_condition !== undefined) {
            setPricingCondition(data.sales_order_pricing_condition);
          }
          if (data.sales_order_payment_terms !== undefined) {
            setDefaultPaymentTerms(data.sales_order_payment_terms);
          }
        }
      })
      .catch(() => {
        toast.error("Failed to load Defaults settings");
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/sales-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sales_order_default_type: defaultOrderType,
          sales_order_default_block: defaultOrderBlock,
          sales_order_pricing_condition: pricingCondition,
          sales_order_payment_terms: defaultPaymentTerms,
        }),
      });
      if (res.ok) {
        toast.success("Defaults settings saved successfully");
      } else {
        throw new Error("Save failed");
      }
    } catch (err: any) {
      toast.error("Failed to save Defaults settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Defaults Configuration</h2>
        <p className="text-muted-foreground text-sm font-medium">
          Configure default document parameters and rules for each document context
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
        {/* Context Selector */}
        <div className="space-y-2 max-w-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Select Document Context
          </label>
          <select
            value={selectedContext}
            onChange={(e) => setSelectedContext(e.target.value)}
            className="w-full h-11 px-3 border border-border rounded-lg bg-background focus:ring-1 focus:ring-primary outline-none font-bold text-sm"
          >
            <option value="Sales Order">Sales Order</option>
            <option value="Vendor Invoice">Vendor Invoice</option>
          </select>
        </div>

        {selectedContext === "Sales Order" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <hr className="border-border/60" />

            {/* Default Order Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary block">
                Default Order Type
              </label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. OR1"
                  value={defaultOrderType}
                  onChange={(e) => setDefaultOrderType(e.target.value)}
                  className="px-4 h-11 w-full bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal max-w-xl">
                The document type used when creating Sales Orders in SAP (default is <code className="bg-muted px-1 py-0.5 rounded">OR1</code>).
              </p>
            </div>

            <hr className="border-border/60" />

            {/* Default Order Block */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary block">
                Default Order Block (Billing/Delivery Block)
              </label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. 01 (leave blank for none)"
                  value={defaultOrderBlock}
                  onChange={(e) => setDefaultOrderBlock(e.target.value)}
                  className="px-4 h-11 w-full bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal max-w-xl">
                If configured, this block code will be populated as the delivery and billing block reason at the Sales Order header to prevent automatic processing.
              </p>
            </div>

            <hr className="border-border/60" />

            {/* Pricing Condition for Gross Price */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary block">
                Pricing Condition for Gross Price
              </label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. PPR0 or PR00"
                  value={pricingCondition}
                  onChange={(e) => setPricingCondition(e.target.value)}
                  className="px-4 h-11 w-full bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal max-w-xl">
                The condition type (e.g. <code className="bg-muted px-1 py-0.5 rounded">PPR0</code> or <code className="bg-muted px-1 py-0.5 rounded">PR00</code>) used when passing line-item unit prices nested under <code className="bg-muted px-1 py-0.5 rounded">to_PricingElement</code> in the Sales Order payload.
              </p>
            </div>

            <hr className="border-border/60" />

            {/* Default Payment Terms */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary block">
                Default Payment Terms (Pyt Terms)
              </label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. 0003"
                  value={defaultPaymentTerms}
                  onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                  className="px-4 h-11 w-full bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all font-medium font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal max-w-xl">
                The payment terms key (e.g. <code className="bg-muted px-1 py-0.5 rounded">0003</code> for 14 days 3%, 20/2%, 30 net) passed as <code className="bg-muted px-1 py-0.5 rounded">CustomerPaymentTerms</code> in the Sales Order payload.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 border border-dashed border-border rounded-xl text-center text-muted-foreground text-xs animate-in fade-in duration-300">
            No configuration needed for Vendor Invoice defaults.
          </div>
        )}
      </div>

      {selectedContext === "Sales Order" && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving Settings..." : "Save Defaults configuration"}
          </button>
        </div>
      )}
    </div>
  );
}

function TokenUsageLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/settings/token-usage`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        toast.error("Failed to fetch token usage logs");
      }
    } catch {
      toast.error("Error loading token usage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalInput = logs.reduce((sum, item) => sum + (item.promptTokens || 0), 0);
  const totalOutput = logs.reduce((sum, item) => sum + (item.completionTokens || 0), 0);
  const totalAll = logs.reduce((sum, item) => sum + (item.totalTokens || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Token Usage Logs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Historical overview of token consumption and processing duration by AI model requests.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Ingestions</span>
          <span className="text-2xl font-bold text-foreground mt-2">{logs.length}</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Input Tokens</span>
          <span className="text-2xl font-bold text-foreground mt-2">{totalInput.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Output Tokens</span>
          <span className="text-2xl font-bold text-foreground mt-2">{totalOutput.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Tokens</span>
          <span className="text-2xl font-bold text-primary mt-2">{totalAll.toLocaleString()}</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
            Loading token usage history...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No token usage history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Document</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Model</th>
                  <th className="p-4 text-right">Input Tokens</th>
                  <th className="p-4 text-right">Output Tokens</th>
                  <th className="p-4 text-right">Total Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium text-foreground truncate max-w-[200px]" title={item.docName}>
                      {item.docName || "Unknown"}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-foreground font-mono text-xs">
                      {item.model}
                    </td>
                    <td className="p-4 text-right text-muted-foreground font-mono">
                      {(item.promptTokens || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-muted-foreground font-mono">
                      {(item.completionTokens || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-primary font-bold font-mono">
                      {(item.totalTokens || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceDeterminationSettings() {
  const [form, setForm] = useState({
    customer_requested_price: "",
    calculate_price_formula: true,
    price_formula_type: "amount_times_qty",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          customer_requested_price: data.customer_requested_price || "",
          calculate_price_formula: data.calculate_price_formula !== false,
          price_formula_type: data.price_formula_type || "amount_times_qty",
        });
      })
      .catch(() => toast.error("Failed to load pricing settings"));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Pricing settings saved successfully");
      } else {
        toast.error("Failed to save pricing settings");
      }
    } catch {
      toast.error("Error saving pricing settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Price Determination</h2>
        <p className="text-muted-foreground text-sm font-medium">
          Configure how prices are calculated and resolved from extracted document data.
        </p>
      </div>

      <div className="space-y-6 p-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Customer Requested Price Override
          </label>
          <input
            type="number"
            value={form.customer_requested_price}
            onChange={(e) => setForm({ ...form, customer_requested_price: e.target.value })}
            placeholder="e.g. 150.00 — leave blank to use document value"
            className="w-full bg-background/50 border border-border h-11 px-4 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          />
          <p className="text-xs text-muted-foreground">If set, this price overrides the document-extracted price for all sales orders.</p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20">
          <input
            type="checkbox"
            id="calc_formula"
            checked={form.calculate_price_formula}
            onChange={(e) => setForm({ ...form, calculate_price_formula: e.target.checked })}
            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
          />
          <label htmlFor="calc_formula" className="text-sm font-medium cursor-pointer">
            Calculate Price Using Formula
          </label>
        </div>

        {form.calculate_price_formula && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Price Formula Type
            </label>
            <select
              value={form.price_formula_type}
              onChange={(e) => setForm({ ...form, price_formula_type: e.target.value })}
              className="bg-background border border-border h-10 px-3 rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all text-foreground font-medium"
            >
              <option value="amount_times_qty">Amount × Quantity</option>
              <option value="unit_price">Unit Price Only</option>
              <option value="total_amount">Total Amount Only</option>
            </select>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Pricing Settings"}
        </button>
      </div>
    </div>
  );
}

function SalesOrderContextSettings() {
  const [form, setForm] = useState({
    sales_order_default_type: "OR1",
    sales_order_default_block: "",
    sales_order_pricing_condition: "PR00",
    sales_order_payment_terms: "0003",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          sales_order_default_type: data.sales_order_default_type || "OR1",
          sales_order_default_block: data.sales_order_default_block || "",
          sales_order_pricing_condition: data.sales_order_pricing_condition || "PR00",
          sales_order_payment_terms: data.sales_order_payment_terms || "0003",
        });
      })
      .catch(() => toast.error("Failed to load sales order settings"));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/sales-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Sales Order settings saved successfully");
      } else {
        toast.error("Failed to save Sales Order settings");
      }
    } catch {
      toast.error("Error saving Sales Order settings");
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { key: "sales_order_default_type", label: "Default Order Type", placeholder: "e.g. OR1", hint: "SAP order type used when creating sales orders (e.g. OR, OR1, TA)." },
    { key: "sales_order_default_block", label: "Default Delivery Block", placeholder: "e.g. 01 — leave blank for none", hint: "Optional SAP delivery block code applied to new orders." },
    { key: "sales_order_pricing_condition", label: "Pricing Condition Key", placeholder: "e.g. PR00", hint: "SAP condition type used for the main price in the sales order (e.g. PR00, PB00)." },
    { key: "sales_order_payment_terms", label: "Default Payment Terms", placeholder: "e.g. 0003", hint: "SAP payment terms key applied to new sales orders (e.g. 0001, 0003, ZB14)." },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Sales Order Context</h2>
        <p className="text-muted-foreground text-sm font-medium">
          Define SAP defaults that are applied when creating sales orders from extracted documents.
        </p>
      </div>

      <div className="space-y-6 p-6 rounded-2xl border border-border bg-card shadow-sm">
        {fields.map(({ key, label, placeholder, hint }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              {label}
            </label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full bg-background/50 border border-border h-11 px-4 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Sales Order Settings"}
        </button>
      </div>
    </div>
  );
}
