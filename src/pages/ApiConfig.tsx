import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Globe,
  Shield,
  Activity,
  Search,
  Edit3,
  CheckCircle,
  AlertTriangle,
  X,
  Key,
  Lock,
  User as UserIcon,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/config";
import { StatusBadge } from "@/components/common/StatusBadge";

interface ApiConfigItem {
  id: number;
  name: string;
  endpoint: string;
  auth_type: string;
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
  key_name?: string;
  key_value?: string;
  oauth_token_url?: string;
  status: string;
  created_at: string;
}

export default function ApiConfig() {
  const [apis, setApis] = useState<ApiConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formAuthType, setFormAuthType] = useState("None");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formKeyValue, setFormKeyValue] = useState("");
  const [formOauthTokenUrl, setFormOauthTokenUrl] = useState("");

  const fetchApis = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api-configs`);
      if (!res.ok) throw new Error("Failed to fetch API catalog");
      const data = await res.json();
      setApis(data);
    } catch (err) {
      toast.error("Failed to load API catalog");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormEndpoint("");
    setFormAuthType("None");
    setFormClientId("");
    setFormClientSecret("");
    setFormUsername("");
    setFormPassword("");
    setFormKeyName("");
    setFormKeyValue("");
    setFormOauthTokenUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (api: ApiConfigItem) => {
    setEditingId(api.id);
    setFormName(api.name);
    setFormEndpoint(api.endpoint);
    setFormAuthType(api.auth_type);
    setFormClientId(api.client_id || "");
    setFormClientSecret(api.client_secret || "");
    setFormUsername(api.username || "");
    setFormPassword(api.password || "");
    setFormKeyName(api.key_name || "");
    setFormKeyValue(api.key_value || "");
    setFormOauthTokenUrl(api.oauth_token_url || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this API configuration?")) return;
    try {
      const res = await fetch(`${API_BASE}/api-configs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("API deleted successfully");
        fetchApis();
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      toast.error("Failed to delete API");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEndpoint.trim()) {
      toast.error("Name and Endpoint URL are required");
      return;
    }

    const payload = {
      name: formName,
      endpoint: formEndpoint,
      auth_type: formAuthType,
      client_id: formClientId,
      client_secret: formClientSecret,
      username: formUsername,
      password: formPassword,
      key_name: formKeyName,
      key_value: formKeyValue,
      oauth_token_url: formOauthTokenUrl
    };

    try {
      const url = editingId 
        ? `${API_BASE}/api-configs/${editingId}`
        : `${API_BASE}/api-configs`;
      
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingId ? "API updated successfully" : "API added successfully");
        setIsModalOpen(false);
        fetchApis();
      } else {
        throw new Error("Save failed");
      }
    } catch (err) {
      toast.error("Failed to save API configuration");
    }
  };

  const handleTestConnection = async (api: ApiConfigItem) => {
    setIsTesting(api.id);
    try {
      const res = await fetch(`${API_BASE}/api-configs/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: api.id,
          endpoint: api.endpoint,
          auth_type: api.auth_type,
          oauth_token_url: api.oauth_token_url,
          client_id: api.client_id,
          client_secret: api.client_secret,
          username: api.username,
          password: api.password,
          key_name: api.key_name,
          key_value: api.key_value
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Connection successful! URL returned status ${data.statusCode}`);
      } else {
        toast.error(`Connection failed: ${data.message}`);
      }
    } catch (err) {
      toast.error("Failed to test connection");
    } finally {
      setIsTesting(null);
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredApis = apis.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fiori-page">
      <div className="flex items-center justify-between">
        <h1 className="fiori-page-title">Integration Hub (API Config)</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-card border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none w-[200px] md:w-[260px] transition-all"
            />
          </div>
          <button
            onClick={fetchApis}
            title="Refresh List"
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors border border-border"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Add API Connection
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="fiori-card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p>Fetching API catalog...</p>
            </div>
          ) : (
            <table className="fiori-smart-table">
              <thead>
                <tr>
                  <th>API Connection</th>
                  <th>Protocol / Auth</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApis.map((api) => (
                  <tr key={api.id} className="hover:bg-muted/20 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{api.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[280px] mt-0.5" title={api.endpoint}>
                            API: {api.endpoint}
                          </p>
                          {api.auth_type === "OAuth2" && api.oauth_token_url && (
                            <p className="text-[9px] font-mono text-primary truncate max-w-[280px] mt-0.5" title={api.oauth_token_url}>
                              Auth: {api.oauth_token_url}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        <span>{api.auth_type}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">Active</span>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(api.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTestConnection(api)}
                          disabled={isTesting === api.id}
                          className="px-2 py-1 text-[10px] font-bold text-primary border border-primary/30 rounded hover:bg-primary/5 disabled:opacity-50 transition-colors"
                          title="Test Connectivity"
                        >
                          {isTesting === api.id ? "Testing..." : "Test Conn"}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(api)}
                          className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(api.id)}
                          className="w-7 h-7 rounded border border-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredApis.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Globe className="h-8 w-8 opacity-25" />
                        <p>No API connections configured yet. Add your first connection to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* API Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-lg border border-border shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                  {editingId ? "Edit API Connection" : "Add API Connection"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Context Name */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">API Name</label>
                <input
                  type="text"
                  placeholder="e.g. SAP Gateway ERP, HubSpot Hub"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">Endpoint Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/v1"
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>

              {/* Authentication Type */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">Authorization Protocol</label>
                <select
                  value={formAuthType}
                  onChange={(e) => setFormAuthType(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="None">None (Public Access)</option>
                  <option value="API Key">API Key (Header / Query)</option>
                  <option value="Basic Auth">Basic Authentication (Username/Pass)</option>
                  <option value="OAuth2">OAuth 2.0 (Client Credentials)</option>
                </select>
              </div>

              {/* API Key Form Fields */}
              {formAuthType === "API Key" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 border border-border/60 rounded animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Key Field Name</label>
                    <div className="relative">
                      <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="X-API-Key / Authorization"
                        value={formKeyName}
                        onChange={(e) => setFormKeyName(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Key Secret Value</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type={showSecret["key"] ? "text" : "password"}
                        placeholder="Enter key secret..."
                        value={formKeyValue}
                        onChange={(e) => setFormKeyValue(e.target.value)}
                        className="w-full h-8 pl-8 pr-8 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowSecret("key")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret["key"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Auth Form Fields */}
              {formAuthType === "Basic Auth" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 border border-border/60 rounded animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Username</label>
                    <div className="relative">
                      <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Admin"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type={showSecret["pass"] ? "text" : "password"}
                        placeholder="Enter password..."
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full h-8 pl-8 pr-8 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowSecret("pass")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret["pass"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OAuth2 Form Fields */}
              {formAuthType === "OAuth2" && (
                <div className="p-4 bg-muted/10 border border-border/60 rounded space-y-3 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="fiori-label text-[10px] block mb-1">Client ID</label>
                      <input
                        type="text"
                        placeholder="Enter client ID"
                        value={formClientId}
                        onChange={(e) => setFormClientId(e.target.value)}
                        className="w-full h-8 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="fiori-label text-[10px] block mb-1">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showSecret["oauth"] ? "text" : "password"}
                          placeholder="Enter client secret"
                          value={formClientSecret}
                          onChange={(e) => setFormClientSecret(e.target.value)}
                          className="w-full h-8 pl-3 pr-8 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowSecret("oauth")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecret["oauth"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="fiori-label text-[10px] block mb-1">OAuth Token Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://login.microsoftonline.com/common/oauth2/v2.0/token"
                      value={formOauthTokenUrl}
                      onChange={(e) => setFormOauthTokenUrl(e.target.value)}
                      className="w-full h-8 px-3 text-xs font-mono border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      required={formAuthType === "OAuth2"}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold border border-border rounded hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow transition-all active:scale-95"
                >
                  {editingId ? "Save Changes" : "Save Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
