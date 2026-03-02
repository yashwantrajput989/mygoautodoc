import { KPITile } from "@/components/dashboard/KPITile";
import {
  DollarSign,
  ShoppingCart,
  Shield,
  Zap,
  UserCheck,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const monthlyVolume = [
  { month: "Sep", count: 820 },
  { month: "Oct", count: 950 },
  { month: "Nov", count: 1100 },
  { month: "Dec", count: 880 },
  { month: "Jan", count: 1250 },
  { month: "Feb", count: 1380 },
  { month: "Mar", count: 1420 },
];

const cycleTime = [
  { month: "Sep", seconds: 4.2 },
  { month: "Oct", seconds: 3.8 },
  { month: "Nov", seconds: 3.1 },
  { month: "Dec", seconds: 2.9 },
  { month: "Jan", seconds: 2.4 },
  { month: "Feb", seconds: 2.0 },
  { month: "Mar", seconds: 1.8 },
];

const errorBreakdown = [
  { name: "OCR Failure", value: 35, color: "hsl(0, 100%, 37%)" },
  { name: "Missing Fields", value: 25, color: "hsl(26, 100%, 45%)" },
  { name: "SAP Rejection", value: 20, color: "hsl(210, 88%, 43%)" },
  { name: "Network Error", value: 12, color: "hsl(210, 8%, 46%)" },
  { name: "Other", value: 8, color: "hsl(210, 14%, 89%)" },
];

const topEntities = [
  { name: "Bosch GmbH", value: 145 },
  { name: "Siemens AG", value: 128 },
  { name: "BMW AG", value: 98 },
  { name: "SAP SE", value: 87 },
  { name: "BASF", value: 72 },
  { name: "Henkel AG", value: 65 },
];

export default function Analytics() {
  return (
    <div className="fiori-page">
      <div className="flex items-center justify-between">
        <h1 className="fiori-page-title">Analytics</h1>
        <div className="flex items-center gap-2">
          <input type="date" defaultValue="2026-01-01" className="h-8 px-3 rounded border border-input bg-background text-sm outline-none" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" defaultValue="2026-03-02" className="h-8 px-3 rounded border border-input bg-background text-sm outline-none" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-border rounded hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPITile title="Total Invoice Value" value="€2.4M" icon={<DollarSign className="h-4 w-4" />} status="info" trend="up" trendValue="+18% MoM" />
        <KPITile title="Total SO Value" value="€1.8M" icon={<ShoppingCart className="h-4 w-4" />} status="info" trend="up" trendValue="+12% MoM" />
        <KPITile title="Duplicate Savings" value="€185K" icon={<Shield className="h-4 w-4" />} status="success" trend="up" trendValue="14 prevented" />
        <KPITile title="Automation Rate" value="94.2" unit="%" icon={<Zap className="h-4 w-4" />} status="success" trend="up" trendValue="+3.1%" />
        <KPITile title="Manual Rate" value="5.8" unit="%" icon={<UserCheck className="h-4 w-4" />} trend="down" trendValue="-3.1%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="fiori-card p-5">
          <h2 className="fiori-section-title">Monthly Processing Volume</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <Tooltip contentStyle={{ borderRadius: "4px", border: "1px solid hsl(210, 14%, 89%)", fontSize: "12px" }} />
              <Bar dataKey="count" fill="hsl(210, 88%, 43%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="fiori-card p-5">
          <h2 className="fiori-section-title">Cycle Time Reduction</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cycleTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" unit="s" />
              <Tooltip contentStyle={{ borderRadius: "4px", border: "1px solid hsl(210, 14%, 89%)", fontSize: "12px" }} />
              <Line type="monotone" dataKey="seconds" stroke="hsl(152, 77%, 28%)" strokeWidth={2} dot={{ fill: "hsl(152, 77%, 28%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="fiori-card p-5">
          <h2 className="fiori-section-title">Error Root Cause Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={errorBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value">
                {errorBreakdown.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "4px", border: "1px solid hsl(210, 14%, 89%)", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {errorBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>

        <div className="fiori-card p-5">
          <h2 className="fiori-section-title">Top Suppliers / Customers</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topEntities} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} stroke="hsl(210, 8%, 46%)" />
              <Tooltip contentStyle={{ borderRadius: "4px", border: "1px solid hsl(210, 14%, 89%)", fontSize: "12px" }} />
              <Bar dataKey="value" fill="hsl(28, 92%, 48%)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
