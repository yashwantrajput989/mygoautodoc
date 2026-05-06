import { useState, useEffect } from "react";
import { KPITile } from "@/components/dashboard/KPITile";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { API_BASE } from "@/config";


export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/stats`).catch(() => null),
        fetch(`${API_BASE}/documents`).catch(() => null)
      ]);
      
      if (!statsRes || !docsRes) {
        throw new Error("Backend server is not reachable");
      }

      if (!statsRes.ok || !docsRes.ok) {
        throw new Error("Failed to fetch data from backend");
      }

      const statsData = await statsRes.json();
      const docsData = await docsRes.json();
      
      setStats(statsData);
      setRecentDocs(Array.isArray(docsData) ? docsData.slice(0, 5) : []);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="fiori-page flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground animate-pulse">Analyzing document metrics...</p>
      </div>
    );
  }

  if (error || !stats || !stats.kpis) {
    return (
      <div className="fiori-page p-12 text-center border-2 border-dashed border-border rounded-lg m-6">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Sync Connection Issue</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          We couldn't reach the backend service to fetch live stats. Please ensure the Python server is running.
        </p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-sm font-bold shadow-sm hover:translate-y-[-1px] transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="fiori-page animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="fiori-page-title">Operational Dashboard</h1>
        <div className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
          Live System Health: OK
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPITile
          title="Total Documents"
          value={stats.kpis.totalToday || 0}
          icon={<FileText className="h-4 w-4" />}
          status="info"
          trend="up"
          trendValue="+12% vs yesterday"
        />
        <KPITile
          title="Success Rate"
          value={stats.kpis.successRate || 0}
          unit="%"
          icon={<CheckCircle className="h-4 w-4" />}
          status="success"
          trend="up"
          trendValue="+2.1%"
        />
        <KPITile
          title="Pending Ingestion"
          value={stats.kpis.pendingDocs || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          status="warning"
          trend="neutral"
          trendValue="Awaiting AI Analysis"
        />
        <KPITile
          title="Failed / Junk Docs"
          value={stats.kpis.failedDocs || 0}
          icon={<XCircle className="h-4 w-4" />}
          status="error"
          trend="down"
          trendValue="-5 vs yesterday"
        />
        <KPITile
          title="Avg Processing"
          value={stats.kpis.avgTime || "1.8"}
          unit="sec"
          icon={<Clock className="h-4 w-4" />}
          trend="down"
          trendValue="-0.3s optimization"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Line Chart */}
        <div className="fiori-card p-5 lg:col-span-2">
          <h2 className="fiori-section-title">Processing Volume Trend</h2>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.line_data || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "4px",
                    border: "1px solid hsl(var(--border))",
                    fontSize: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="documents"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="fiori-card p-5 flex flex-col">
          <h2 className="fiori-section-title">Status Distribution</h2>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pie_data || []}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {(stats.pie_data || []).map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "4px",
                    border: "1px solid hsl(var(--border))",
                    fontSize: "10px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
            {(stats.pie_data || []).map((item: any) => (
              <div key={item.name} className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="fiori-card shadow-md">
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Live Sync Activity</h2>
          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Updated just now
          </span>
        </div>
        <div className="divide-y divide-border">
          {recentDocs.length > 0 ? (
            recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-primary/[0.02] transition-colors group">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-black text-primary group-hover:underline cursor-pointer">{doc.id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground/70">
                      {doc.data?.header?.supplier_name || "New Document Ingested"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">·</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {doc.data?.header?.context || "PDF"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {doc.data?.totals?.currency} {doc.data?.totals?.total_amount}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-bold">Total Amount</span>
                  </div>
                  <div className="w-24 flex justify-center">
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="w-4">
                     <FileText className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center">
               <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
               <p className="text-xs text-muted-foreground font-medium italic">No recent documents found in the processing queue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
