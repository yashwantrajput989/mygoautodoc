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
} from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE } from "@/config";


const sidebarItems = [
  { id: "ai", label: "AI Preferences", icon: Bot },
  { id: "prompts", label: "Manage Prompts", icon: MessageSquare },
  { id: "sources", label: "Manage Sources", icon: Database },
  { id: "duplicates", label: "Duplicate Detection", icon: ShieldCheck },
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
          {activeTab === "duplicates" && <DuplicateDetectionSettings />}
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
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.active_provider) setActiveProvider(data.active_provider);
      });
  }, []);

  const handleSave = async (provider: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: keys[provider.toLowerCase() as keyof typeof keys],
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
          {providers.map((p) => (
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
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> No key set
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
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
              </div>
            </div>
          ))}
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("imap.gmail.com");
  const [activeSource, setActiveSource] = useState("Gmail");
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookUser, setOutlookUser] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const handleSourceChange = async (source: string) => {
    setActiveSource(source);
    try {
      await fetch(`${API_BASE}/settings/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_source: source }),
      });
      toast.success(`Source switched to ${source}`);
    } catch (err) {
      toast.error("Failed to update active source");
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user_email) setEmail(data.user_email);
        if (data.imap_server) setServer(data.imap_server);
        if (data.active_source) setActiveSource(data.active_source);
        if (data.outlook_tokens) {
          setOutlookConnected(true);
          setOutlookUser(data.outlook_tokens.user_principal_name);
        }
      });
  }, []);

  const handleSaveGmail = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: email, app_password: password, imap_server: server }),
      });
      if (res.ok) {
        toast.success("Gmail configuration saved successfully");
      }
    } catch (err) {
      toast.error("Failed to save settings");
    }
  };

  const handleTestGmail = async () => {
    setIsTesting(true);
    try {
      const res = await fetch(`${API_BASE}/settings/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: email, app_password: password, imap_server: server }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setIsConnected(true);
        toast.success("Connection successful! Gmail is synced.");
      } else {
        setIsConnected(false);
        toast.error("Connection failed: " + data.message);
      }
    } catch (err) {
      setIsConnected(false);
      toast.error("An error occurred during testing");
    } finally {
      setIsTesting(false);
    }
  };

  const handleOutlookConnect = () => {
    toast.info("Redirecting to Microsoft login...");
    // Use direct redirect to avoid popup blockers
    window.location.href = `${API_BASE}/auth/outlook/login?redirect=true`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">Manage Sources</h2>
        <p className="text-muted-foreground text-sm">Configure email accounts and document intake channels</p>
      </div>

      <div className="space-y-6">
        {/* Gmail Card */}
        <div className={cn(
          "p-6 rounded-xl border transition-all relative overflow-hidden",
          activeSource === "Gmail" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card shadow-sm"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <input 
              type="radio" 
              checked={activeSource === "Gmail"} 
              onChange={() => handleSourceChange("Gmail")}
              className="w-4 h-4 text-primary"
            />
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Gmail / Workspace</h3>
              <p className="text-[10px] text-muted-foreground">Sync via standard IMAP</p>
            </div>
            {isConnected === true && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-[10px] font-bold text-success">
                <ShieldCheck className="h-3 w-3" /> Connected
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8">
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
               <input
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none"
               />
            </div>
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-muted-foreground uppercase">App Password</label>
               <input
                 type="password"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none"
               />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <button onClick={handleSaveGmail} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-2">
                <Save className="h-3 w-3" /> Save Gmail
              </button>
              <button onClick={handleTestGmail} disabled={isTesting} className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted">
                {isTesting ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </div>

        {/* Outlook Card */}
        <div className={cn(
          "p-6 rounded-xl border transition-all relative overflow-hidden",
          activeSource === "Outlook" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card shadow-sm"
        )}>
           <div className="flex items-center gap-3">
            <input 
              type="radio" 
              checked={activeSource === "Outlook"} 
              onChange={() => handleSourceChange("Outlook")}
              className="w-4 h-4 text-primary"
            />
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Microsoft Outlook Support</h3>
              <p className="text-[10px] text-muted-foreground">Direct Graph API integration (OAuth 2.0)</p>
            </div>
            {outlookConnected && (
              <div className="ml-auto flex flex-col items-end">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-[10px] font-bold text-success">
                  <ShieldCheck className="h-3 w-3" /> Connected
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{outlookUser}</span>
              </div>
            )}
          </div>
          
          <div className="mt-6 pl-8">
            <button 
              onClick={handleOutlookConnect}
              className={cn(
                "px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm",
                outlookConnected 
                  ? "border border-border text-muted-foreground hover:bg-muted" 
                  : "bg-[#0078d4] text-white hover:bg-[#005a9e]"
              )}
            >
              <Globe className="h-4 w-4" />
              {outlookConnected ? "Reconnect Outlook Account" : "Connect Outlook Account"}
            </button>
            <p className="text-[10px] text-muted-foreground mt-3 font-medium">
              Uses Microsoft Graph API for secure, token-based access. No password storage required.
            </p>
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
  const users = [
    { name: "John Doe", email: "john@mygo.ai", role: "Administrator", status: "Active", lastActive: "2 mins ago" },
    { name: "Jane Smith", email: "jane.s@company.com", role: "Reviewer", status: "Active", lastActive: "1 hour ago" },
    { name: "Alex Johnson", email: "alex@support.de", role: "Viewer", status: "Inactive", lastActive: "2 days ago" },
    { name: "Sarah Williams", email: "sarah.w@tech.io", role: "Reviewer", status: "Active", lastActive: "Online" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">User Management</h2>
          <p className="text-muted-foreground text-sm">Control access, roles, and security for your organization</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Users className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">User Profile</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assigned Role</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Access Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Last Activity</th>
              <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.email} className="hover:bg-muted/10 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary text-xs">
                        {u.name[0]}
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
                    "px-2 py-0.5 rounded-full text-[10px] font-black border uppercase",
                    u.status === "Active" ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-muted text-muted-foreground border-border"
                  )}>
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] font-medium text-muted-foreground">
                  {u.lastActive}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                    <Smartphone className="h-4 w-4" /> {/* Just a placeholder icon button */}
                  </button>
                  <button className="text-xs font-black text-primary hover:underline ml-2">Manage</button>
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

