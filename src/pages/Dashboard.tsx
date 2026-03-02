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
  BarChart,
  Bar,
} from "recharts";

const lineData = [
  { date: "Mon", documents: 42 },
  { date: "Tue", documents: 58 },
  { date: "Wed", documents: 45 },
  { date: "Thu", documents: 72 },
  { date: "Fri", documents: 65 },
  { date: "Sat", documents: 28 },
  { date: "Sun", documents: 18 },
];

const pieData = [
  { name: "Success", value: 68, color: "hsl(152, 77%, 28%)" },
  { name: "Failed", value: 8, color: "hsl(0, 100%, 37%)" },
  { name: "Pending", value: 15, color: "hsl(210, 88%, 43%)" },
  { name: "Duplicate", value: 9, color: "hsl(28, 92%, 48%)" },
];

const barData = [
  { vendor: "Bosch GmbH", invoices: 34 },
  { vendor: "Siemens AG", invoices: 28 },
  { vendor: "SAP SE", invoices: 22 },
  { vendor: "BASF", invoices: 18 },
  { vendor: "BMW AG", invoices: 15 },
];

const recentDocs = [
  { id: "DOC-1024", type: "Invoice", supplier: "Bosch GmbH", amount: "€12,450.00", status: "success" as const, time: "2 min ago" },
  { id: "DOC-1023", type: "PO", supplier: "Siemens AG", amount: "€8,200.00", status: "pending" as const, time: "5 min ago" },
  { id: "DOC-1022", type: "Invoice", supplier: "SAP SE", amount: "€45,100.00", status: "duplicate" as const, time: "12 min ago" },
  { id: "DOC-1021", type: "Invoice", supplier: "BASF", amount: "€3,780.00", status: "error" as const, time: "18 min ago" },
  { id: "DOC-1020", type: "PO", supplier: "BMW AG", amount: "€92,600.00", status: "success" as const, time: "25 min ago" },
];

export default function Dashboard() {
  return (
    <div className="fiori-page">
      <h1 className="fiori-page-title">Dashboard</h1>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPITile
          title="Total Documents Today"
          value={328}
          icon={<FileText className="h-4 w-4" />}
          status="info"
          trend="up"
          trendValue="+12% vs yesterday"
        />
        <KPITile
          title="Success Rate"
          value="94.2"
          unit="%"
          icon={<CheckCircle className="h-4 w-4" />}
          status="success"
          trend="up"
          trendValue="+2.1%"
        />
        <KPITile
          title="Duplicate Flags"
          value={14}
          icon={<AlertTriangle className="h-4 w-4" />}
          status="warning"
          trend="down"
          trendValue="-3 vs yesterday"
        />
        <KPITile
          title="Failed Documents"
          value={8}
          icon={<XCircle className="h-4 w-4" />}
          status="error"
          trend="down"
          trendValue="-5 vs yesterday"
        />
        <KPITile
          title="Avg Processing Time"
          value="1.8"
          unit="sec"
          icon={<Clock className="h-4 w-4" />}
          trend="down"
          trendValue="-0.3s improvement"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart */}
        <div className="fiori-card p-5 lg:col-span-2">
          <h2 className="fiori-section-title">Documents Processed Over Time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <Tooltip
                contentStyle={{
                  borderRadius: "4px",
                  border: "1px solid hsl(210, 14%, 89%)",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="documents"
                stroke="hsl(210, 88%, 43%)"
                strokeWidth={2}
                dot={{ fill: "hsl(210, 88%, 43%)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="fiori-card p-5">
          <h2 className="fiori-section-title">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "4px",
                  border: "1px solid hsl(210, 14%, 89%)",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="fiori-card p-5">
          <h2 className="fiori-section-title">Top Vendors by Invoice Volume</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210, 8%, 46%)" />
              <YAxis dataKey="vendor" type="category" tick={{ fontSize: 11 }} width={90} stroke="hsl(210, 8%, 46%)" />
              <Tooltip
                contentStyle={{
                  borderRadius: "4px",
                  border: "1px solid hsl(210, 14%, 89%)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="invoices" fill="hsl(210, 88%, 43%)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="fiori-card">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Recent Documents</h2>
          </div>
          <div className="divide-y divide-border">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{doc.id}</span>
                    <span className="text-xs text-muted-foreground">{doc.supplier} · {doc.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{doc.amount}</span>
                  <StatusBadge status={doc.status} />
                  <span className="text-xs text-muted-foreground">{doc.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
