import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Mail, Lock, Key, Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { API_BASE } from "@/config";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Account created successfully! Please sign in.");
        navigate("/login");
      } else {
        toast.error(data.detail || "Failed to create account");
      }
    } catch (err) {
      toast.error("Failed to connect to authentication server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090b11] text-slate-100 relative overflow-hidden font-sans">
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Signup Card */}
      <div className="w-full max-w-md mx-4 p-8 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-2xl flex flex-col gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-inner">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-4">Create Your Account</h2>
          <p className="text-xs text-slate-400">Join the automated DocSyncAI processing catalog</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-white/5 bg-slate-950/40 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@company.com"
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-white/5 bg-slate-950/40 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Role</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-white/5 bg-slate-950/40 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-slate-300 cursor-pointer appearance-none"
              >
                <option value="Administrator" className="bg-[#090b11]">Administrator (Full Access)</option>
                <option value="Reviewer" className="bg-[#090b11]">Reviewer (Edit & Verify)</option>
                <option value="Viewer" className="bg-[#090b11]">Viewer (Read Only)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full h-11 pl-11 pr-12 rounded-xl border border-white/5 bg-slate-950/40 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600 font-mono"
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
            disabled={isLoading}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all text-sm mt-6"
          >
            {isLoading ? "Creating Account..." : "Create Account"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/5">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
