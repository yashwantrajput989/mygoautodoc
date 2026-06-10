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
        <div className="max-w-4xl mx-auto">
           {activeTab === "ai" && <AIPreferences />}
          {activeTab === "prompts" && <ManagePrompts />}
          {activeTab === "sources" && <ManageSources />}
          {activeTab === "keywords" && <KeywordsWatchlist />}
          {activeTab === "duplicates" && <DuplicateDetectionSettings />}
          {activeTab === "mappings" && <BusinessPartnerMappings />}
          {activeTab === "roles" && <ManageRoles />}
          {activeTab === "credits" && <ManageCredits />}
          {activeTab === "users" && <ManageUsers />}
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
  });
  const [models, setModels] = useState({
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-latest",
    gemini: "gemini-2.5-flash",
  });
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.active_provider) setActiveProvider(data.active_provider);
        setKeys({
          openai: data.openai_api_key || "",
          anthropic: data.anthropic_api_key || "",
          gemini: data.gemini_api_key || "",
        });
        setModels({
          openai: data.openai_model || "gpt-4o",
          anthropic: data.anthropic_model || "claude-3-5-sonnet-latest",
          gemini: data.gemini_model || "gemini-2.5-flash",
        });
      })
      .catch(() => {
        toast.error("Failed to load settings data");
      });
  }, []);

  const handleSave = async (provider: string) => {
    setIsSaving(true);
    const stateKey = provider === "Claude" ? "anthropic" : provider.toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/settings/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: keys[stateKey as keyof typeof keys],
          model: models[stateKey as keyof typeof models],
        }),
      });
      if (res.ok) {
        toast.success(`${provider} preferences saved successfully`);
        setActiveProvider(provider);
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
      color: "bg-green-500",
      description: "GPT-4 - Embeddings - Recommended",
      keyName: "openai",
    },
    {
      id: "Claude",
      label: "Claude (Anthropic)",
      color: "bg-orange-500",
      description: "claude-sonnet-4-6 - Long context",
      keyName: "anthropic",
    },
    {
      id: "Gemini",
      label: "Gemini (Google)",
      color: "bg-blue-500",
      description: "gemini-2.5-flash - Multimodal",
      keyName: "gemini",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI Preferences</h2>
        <p className="text-muted-foreground text-sm">Configure API keys and choose which LLM powers each agent</p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4" /> LLM Providers & API Keys
        </h3>

        <div className="space-y-4">
          {providers.map((p) => {
            const hasKey = !!keys[p.keyName as keyof typeof keys];
            return (
              <div
                key={p.id}
                className={cn(
                  "p-6 rounded-xl border transition-all relative overflow-hidden",
                  activeProvider === p.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="mt-1">
                    <input
                      type="radio"
                      checked={activeProvider === p.id}
                      onChange={() => setActiveProvider(p.id)}
                      className="w-4 h-4 text-primary focus:ring-primary border-border"
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
                            <CheckCircle2 className="h-3.5 w-3.5" /> Key set
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" /> No key set
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>

                <div className="relative ml-8">
                  <input
                    type={visibility[p.id] ? "text" : "password"}
                    value={keys[p.keyName as keyof typeof keys]}
                    onChange={(e) => setKeys({ ...keys, [p.keyName]: e.target.value })}
                    placeholder={`Enter ${p.label || p.id} API key`}
                    className="w-full bg-background/50 border border-border h-11 px-4 pr-24 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => toggleVisibility(p.id)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors"
                    >
                      {visibility[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleSave(p.id)}
                      disabled={isSaving || !keys[p.keyName as keyof typeof keys]}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Save className="h-3 w-3" /> Save Key
                    </button>
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
                        {p.id === "OpenAI" && (
                          <>
                            <option value="gpt-4o">gpt-4o (Recommended)</option>
                            <option value="gpt-4o-mini">gpt-4o-mini</option>
                            <option value="gpt-4-turbo">gpt-4-turbo</option>
                            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                          </>
                        )}
                        {p.id === "Claude" && (
                          <>
                            <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest (Recommended)</option>
                            <option value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</option>
                            <option value="claude-3-opus-latest">claude-3-opus-latest</option>
                          </>
                        )}
                        {p.id === "Gemini" && (
                          <>
                            <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                            <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                          </>
                        )}
                      </select>
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
  const [addStep, setAddStep] = useState(1); // 1: Select Provider, 2: Routing Config, 3: Connection Info
  const [selectedProvider, setSelectedProvider] = useState<"Gmail" | "Outlook">("Gmail");
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newServer, setNewServer] = useState("imap.gmail.com");
  const [newDocType, setNewDocType] = useState("Vendor Invoice");
  const [newCompanyCode, setNewCompanyCode] = useState("");
  
  // Testing connection state map: email -> boolean
  const [isTestingEmail, setIsTestingEmail] = useState<Record<string, boolean>>({});
  const [emailStatus, setEmailStatus] = useState<Record<string, "Connected" | "Disconnected" | "Pending">>({});

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        let currentEmails = data.emails || [];
        
        // Migrate legacy Gmail config if emails list is empty and user_email exists
        if (currentEmails.length === 0 && data.user_email) {
          currentEmails = [{
            id: Date.now(),
            email: data.user_email,
            password: data.app_password || "",
            server: data.imap_server || "imap.gmail.com",
            expected_doc_type: "Vendor Invoice",
            company_code: "",
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
          const pendingType = sessionStorage.getItem('pending_outlook_doctype') || 'Vendor Invoice';
          const pendingCC = sessionStorage.getItem('pending_outlook_cc') || '';
          
          const newOutlookEmail = {
            id: Date.now(),
            email: data.outlook_tokens.user_principal_name || 'Outlook Mail',
            provider: 'Outlook',
            outlook_tokens: data.outlook_tokens,
            expected_doc_type: pendingType,
            company_code: pendingCC,
            active: true
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

          // Clear session storage and URL query
          sessionStorage.removeItem('pending_outlook_doctype');
          sessionStorage.removeItem('pending_outlook_cc');
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          setEmails(currentEmails);
        }

        // Initialize statuses
        currentEmails.forEach((eConf: any) => {
          if (eConf.provider === 'Outlook') {
            setEmailStatus(prev => ({ ...prev, [eConf.email]: "Connected" }));
          } else {
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
      expected_doc_type: newDocType,
      company_code: newCompanyCode.trim(),
      active: true,
      provider: "Gmail"
    };
    const updated = [...emails, emailObj];
    handleSaveEmails(updated);
    resetWizard();
  };

  const handleAddEmailOutlook = () => {
    // Save choices to session storage so we retrieve them on success callback redirect
    sessionStorage.setItem('pending_outlook_doctype', newDocType);
    sessionStorage.setItem('pending_outlook_cc', newCompanyCode);
    
    toast.info("Redirecting to Microsoft secure sign-in portal...");
    window.location.href = `${API_BASE}/auth/outlook/login?redirect=true`;
  };

  const resetWizard = () => {
    setNewEmail("");
    setNewPassword("");
    setNewServer("imap.gmail.com");
    setNewDocType("Vendor Invoice");
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
                <p className="text-[10px] text-muted-foreground mt-0.5">Setup new ingestion channel routing rules</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", addStep >= 1 ? "bg-primary" : "bg-muted")} />
                <span className={cn("w-2 h-2 rounded-full", addStep >= 2 ? "bg-primary" : "bg-muted")} />
                <span className={cn("w-2 h-2 rounded-full", addStep >= 3 ? "bg-primary" : "bg-muted")} />
                <span className="text-[10px] font-bold text-muted-foreground ml-1">Step {addStep} of 3</span>
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

            {/* STEP 2: ROUTING CONFIG */}
            {addStep === 2 && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Document Routing Rules</label>
                <p className="text-xs text-muted-foreground mb-2">Define what document category is expected on this email channel and how it maps to your SAP organization code.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected Doc Type</label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-medium"
                    >
                      <option value="Vendor Invoice">Vendor Invoice</option>
                      <option value="Sales Order">Sales Order</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">SAP Company Code</label>
                    <input
                      value={newCompanyCode}
                      onChange={(e) => setNewCompanyCode(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary font-mono font-bold"
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
                    onClick={() => setAddStep(3)}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/95 shadow-sm"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONNECTION INFO & FINISH */}
            {addStep === 3 && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Connection Security details</label>
                
                {selectedProvider === "Gmail" ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Input standard server credentials. Be sure to use an App Password if connecting with an active Gmail mailbox.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
                        <input
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
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
                        onClick={() => setAddStep(2)}
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
                      <p>Expected Document Type: <strong className="text-white">{newDocType}</strong> | Company Code: <strong className="text-white">{newCompanyCode || "None"}</strong></p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => setAddStep(2)}
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

        {/* Unified Email channels list view */}
        <div className="border border-border/80 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-sm shadow-lg">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Added Email Integration Channels</span>
            <span className="text-[10px] text-muted-foreground font-semibold">{emails.length} channels configured</span>
          </div>

          {emails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16">Active</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Connection</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-36">Provider</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-48">Expected Type</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-28">Co. Code</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-32">Status</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right w-24">Actions</th>
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
                        <select
                          value={eConf.expected_doc_type || "Invoice"}
                          onChange={(e) => {
                            handleFieldChange(eConf.id, "expected_doc_type", e.target.value);
                            setTimeout(handleBlurSave, 100);
                          }}
                          className="h-8 px-2.5 rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary w-40 font-medium text-xs shadow-inner"
                        >
                          <option value="Vendor Invoice">Vendor Invoice</option>
                          <option value="Sales Order">Sales Order</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <input
                          value={eConf.company_code || ""}
                          onChange={(e) => handleFieldChange(eConf.id, "company_code", e.target.value)}
                          onBlur={handleBlurSave}
                          placeholder="—"
                          className="w-20 h-8 px-2 rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary font-mono text-center font-bold text-xs shadow-inner"
                        />
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
            <div className="p-12 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto opacity-30 mb-3 text-primary" />
              <p className="text-sm font-bold text-foreground">No active email channel sources</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Click "Add Email Channel" at the top to configure your first Gmail/IMAP server or Outlook Graph API sync.</p>
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
        if (data.email_body_keywords) {
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
                        {u.name ? u.name[0].toUpperCase() : "U"}
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

function BusinessPartnerMappings() {
  const [mappings, setMappings] = useState<{ email: string; partnerName: string }[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

    setMappings([...mappings, { email: newEmail.trim().toLowerCase(), partnerName: newPartnerName.trim() }]);
    setNewEmail("");
    setNewPartnerName("");
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
          Map incoming email sender addresses directly to SAP Business Partners. If an email is received from a mapped address, its Business Partner name will automatically be assigned to the mapped value rather than the one extracted by the AI model.
        </p>
      </div>

      <div className="fiori-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Mapping</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email ID</label>
            <input
              type="email"
              placeholder="supplier@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business Partner Name</label>
            <input
              type="text"
              placeholder="e.g. Albyco Belgium"
              value={newPartnerName}
              onChange={(e) => setNewPartnerName(e.target.value)}
              className="w-full h-8 px-3 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAddMapping}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all active:scale-95"
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
                  <th className="text-left">Business Partner Name</th>
                  <th className="w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, index) => (
                  <tr key={index} className="hover:bg-muted/10">
                    <td className="font-mono text-xs font-medium text-foreground">{m.email}</td>
                    <td className="text-xs font-medium text-primary">{m.partnerName}</td>
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
                    <td colSpan={3} className="text-center py-8 text-muted-foreground text-xs">
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

