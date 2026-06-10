import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Key,
  ShieldCheck,
  Activity,
  LogOut,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config";

export default function AdminPage() {
  const navigate = useNavigate();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Login Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Management State
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Create User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Viewer");

  // Check login state on mount
  useEffect(() => {
    const session = localStorage.getItem("user");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.role === "Administrator") {
        setIsAdminLoggedIn(true);
        setAdminUser(parsed);
        loadUsers();
      }
    }
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data);
        }
      }
    } catch {
      toast.error("Failed to load user directory");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter credentials");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user.role !== "Administrator") {
          toast.error("Access denied. Only Administrators can access this portal!");
          setIsLoggingIn(false);
          return;
        }
        localStorage.setItem("user", JSON.stringify(data.user));
        setAdminUser(data.user);
        setIsAdminLoggedIn(true);
        toast.success(`Admin session started. Welcome, ${data.user.name}!`);
        loadUsers();
      } else {
        toast.error(data.detail || "Invalid email or password");
      }
    } catch {
      toast.error("Authentication server offline");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsAdminLoggedIn(false);
    setAdminUser(null);
    toast.info("Logged out from admin panel");
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true, active: true }),
      });
      if (res.ok) {
        toast.success("User registration approved!");
        loadUsers();
      } else {
        toast.error("Approval failed");
      }
    } catch {
      toast.error("Database connection lost");
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    if (adminUser && adminUser.id === userId) {
      toast.error("You cannot deactivate your own account!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.ok) {
        toast.success(currentActive ? "User account deactivated" : "User account activated");
        loadUsers();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Database connection lost");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`User role updated to ${newRole}`);
        loadUsers();
      } else {
        toast.error("Failed to update role");
      }
    } catch {
      toast.error("Database connection lost");
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (adminUser && adminUser.email === userEmail) {
      toast.error("You cannot delete your own account!");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user ${userEmail}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("User permanently deleted");
        loadUsers();
      } else {
        toast.error("Delete operation failed");
      }
    } catch {
      toast.error("Database connection lost");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      toast.error("All fields are required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      if (res.ok) {
        toast.success("New user created and approved!");
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setIsAddingUser(false);
        loadUsers();
      } else {
        const data = await res.json();
        toast.error(data.detail || "Failed to create user");
      }
    } catch {
      toast.error("Failed to connect to user database server");
    }
  };

  // Split users into pending approvals vs directory
  const pendingUsers = users.filter((u) => u.approved === false);
  const activeDirectory = users.filter((u) => u.approved !== false);

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#07090e] text-slate-100 relative overflow-hidden font-sans">
        {/* Background Ambient Blobs */}
        <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-red-500/10 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[150px] pointer-events-none" />

        {/* Login Container Card */}
        <div className="w-full max-w-md mx-4 p-8 rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-xl shadow-2xl flex flex-col gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-500/5">
              <Shield className="h-7 w-7 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mt-4">DocSyncAI Admin Portal</h2>
            <p className="text-xs text-slate-400">Authenticate to manage user approvals and permissions</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mygo.ai"
                  className="w-full h-11 pl-11 pr-4 rounded-xl border border-white/5 bg-slate-950/40 text-sm outline-none focus:ring-2 focus:ring-red-500/40 focus:border-transparent transition-all placeholder:text-slate-600 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-11 pr-12 rounded-xl border border-white/5 bg-slate-950/40 text-sm outline-none focus:ring-2 focus:ring-red-500/40 focus:border-transparent transition-all placeholder:text-slate-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 rounded-md transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] disabled:opacity-50 transition-all text-sm mt-6"
            >
              {isLoggingIn ? "Authenticating..." : "Access Admin Panel"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          
          <div className="text-center pt-2 border-t border-white/5">
            <button
              onClick={() => navigate("/login")}
              className="text-xs text-slate-400 hover:text-white font-semibold flex items-center justify-center gap-1.5 mx-auto"
            >
              ← Back to standard login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b11] text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                DocSync Admin Portal
                <span className="px-2 py-0.5 text-[9px] font-black tracking-widest uppercase bg-red-500/15 border border-red-500/20 text-red-400 rounded-full">
                  Console
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Logged in as {adminUser?.name || "System Admin"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadUsers}
              className="p-2 border border-white/5 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
              title="Refresh Records"
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingUsers && "animate-spin")} />
            </button>
            <button
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-xl hover:shadow-lg transition-all active:scale-95"
            >
              <UserPlus className="h-4 w-4" /> Add Corporate ID
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 border border-white/5 bg-slate-900/30 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/20 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Directory</span>
              <p className="text-3xl font-black text-white">{activeDirectory.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/20 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Approvals</span>
              <p className="text-3xl font-black text-amber-400">{pendingUsers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/20 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Administrators</span>
              <p className="text-3xl font-black text-red-400">
                {users.filter(u => u.role === "Administrator").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
              <Key className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Add User Form overlay */}
        {isAddingUser && (
          <form onSubmit={handleCreateUser} className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                <UserPlus className="h-4 w-4" /> Create & Approve Direct User
              </h3>
              <button type="button" onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-white p-1">
                <UserX className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="john@mygo.ai"
                  className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Choose password"
                  className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs outline-none focus:ring-1 focus:ring-primary font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs outline-none focus:ring-1 focus:ring-primary text-slate-300 font-bold"
                >
                  <option value="Administrator" className="bg-[#090b11]">Administrator</option>
                  <option value="Reviewer" className="bg-[#090b11]">Reviewer</option>
                  <option value="Viewer" className="bg-[#090b11]">Viewer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-4 py-2 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs hover:shadow-lg"
              >
                Add & Approve User
              </button>
            </div>
          </form>
        )}

        {/* Pending Approval Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> Pending Registration Approvals
          </h3>

          <div className="rounded-2xl border border-white/5 bg-slate-900/10 overflow-hidden shadow-2xl">
            {isLoadingUsers ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                <p className="text-xs font-semibold">Scanning registration database...</p>
              </div>
            ) : pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-white/5">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Profile</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Requested Role</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Registration Date</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center font-black text-amber-400 text-xs">
                              {u.name ? u.name[0].toUpperCase() : "U"}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-slate-900 border border-white/5 text-slate-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-semibold text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 shadow"
                            >
                              <UserCheck className="h-3 w-3" /> Approve Access
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="px-3.5 py-1.5 bg-slate-900 border border-white/5 hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all active:scale-95"
                            >
                              <UserX className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-500/80 animate-in zoom-in duration-300" />
                <div>
                  <p className="text-sm font-bold text-white">All Clear!</p>
                  <p className="text-xs text-slate-500 mt-1">There are no pending user registration approval requests at this time.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Directory Listing */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Active Directory (Approved Users)
          </h3>

          <div className="rounded-2xl border border-white/5 bg-slate-900/10 overflow-hidden shadow-2xl">
            {isLoadingUsers ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-semibold">Retrieving user roster...</p>
              </div>
            ) : activeDirectory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-white/5">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Profile</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Security Authorization Role</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Directory Status</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Created At</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Directory Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeDirectory.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center font-black text-primary text-xs">
                              {u.name ? u.name[0].toUpperCase() : "U"}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={adminUser && adminUser.id === u.id}
                            className="bg-slate-950 border border-white/5 text-xs text-slate-300 font-bold rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          >
                            <option value="Administrator">Administrator</option>
                            <option value="Reviewer">Reviewer</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(u.id, u.active !== false)}
                            disabled={adminUser && adminUser.id === u.id}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase shadow-sm active:scale-95 transition-all disabled:opacity-50",
                              u.active !== false
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                                : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15"
                            )}
                          >
                            {u.active !== false ? "Active" : "Deactivated"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-semibold text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={adminUser && adminUser.id === u.id}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                            title="Delete User Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">No approved accounts found in directory.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
