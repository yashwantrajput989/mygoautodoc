import { useState } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";

const tabs = ["Email Configuration", "SAP Integration", "Duplicate Rules", "User Management", "AI Configuration"];

const users = [
  { name: "Max Müller", role: "Admin", status: "Active", lastLogin: "2026-03-02 08:45" },
  { name: "Anna Schmidt", role: "Ops", status: "Active", lastLogin: "2026-03-01 16:30" },
  { name: "Peter Weber", role: "Finance", status: "Active", lastLogin: "2026-02-28 10:15" },
  { name: "Lisa Fischer", role: "Viewer", status: "Inactive", lastLogin: "2026-02-15 09:00" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="fiori-page">
      <h1 className="fiori-page-title">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 -mb-px">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="fiori-object-page-section">
        {activeTab === 0 && <EmailConfig />}
        {activeTab === 1 && <SAPConfig />}
        {activeTab === 2 && <DuplicateRules />}
        {activeTab === 3 && <UserManagement users={users} />}
        {activeTab === 4 && <AIConfig />}
      </div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, value, type = "text", masked = false }: { label: string; value: string; type?: string; masked?: boolean }) {
  return (
    <div>
      <span className="fiori-label">{label}</span>
      <input
        type={masked ? "password" : type}
        defaultValue={value}
        className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function EmailConfig() {
  return (
    <div className="space-y-6">
      <h2 className="fiori-section-title">Email Configuration</h2>
      <FieldGroup>
        <Field label="Sales Email ID" value="sales-orders@company.com" />
        <Field label="Invoice Email ID" value="invoices@company.com" />
        <Field label="IMAP Server" value="imap.company.com" />
        <Field label="Authentication" value="OAuth 2.0" />
        <Field label="Polling Frequency" value="60" type="number" />
      </FieldGroup>
      <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save Changes</button>
    </div>
  );
}

function SAPConfig() {
  return (
    <div className="space-y-6">
      <h2 className="fiori-section-title">SAP Integration</h2>
      <FieldGroup>
        <Field label="SAP Base URL" value="https://s4hana.company.com/sap/opu" />
        <Field label="Client ID" value="client-id-12345" />
        <Field label="Client Secret" value="••••••••••" masked />
        <Field label="Company Code" value="1000" />
        <Field label="Default SO Type" value="OR" />
        <Field label="Retry Attempts" value="3" type="number" />
        <Field label="Retry Interval (sec)" value="30" type="number" />
      </FieldGroup>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save Changes</button>
        <button className="px-4 py-2 text-sm font-medium border border-border rounded hover:bg-muted transition-colors">Test Connection</button>
      </div>
    </div>
  );
}

function DuplicateRules() {
  return (
    <div className="space-y-6">
      <h2 className="fiori-section-title">Duplicate Detection Rules</h2>
      <div>
        <span className="fiori-label mb-2 block">Exact Match Fields</span>
        <div className="space-y-2">
          {["Invoice Number", "Supplier ID", "Invoice Date", "Total Amount", "PO Number"].map((field) => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded border-border" />
              {field}
            </label>
          ))}
        </div>
      </div>
      <FieldGroup>
        <Field label="Amount Tolerance (%)" value="2" type="number" />
        <Field label="Date Tolerance (Days)" value="3" type="number" />
      </FieldGroup>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked className="rounded border-border" />
        Enable Fuzzy Logic Matching
      </label>
      <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save Rules</button>
    </div>
  );
}

function UserManagement({ users }: { users: { name: string; role: string; status: string; lastLogin: string }[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="fiori-section-title mb-0">User Management</h2>
        <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Add User</button>
      </div>
      <table className="fiori-smart-table">
        <thead>
          <tr>
            <th>User Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.name}>
              <td className="font-medium">{user.name}</td>
              <td><span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">{user.role}</span></td>
              <td><StatusBadge status={user.status === "Active" ? "success" : "error"} label={user.status} /></td>
              <td className="text-muted-foreground">{user.lastLogin}</td>
              <td>
                <div className="flex gap-1">
                  <button className="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors">Deactivate</button>
                  <button className="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors">Reset Password</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AIConfig() {
  return (
    <div className="space-y-6">
      <h2 className="fiori-section-title">AI Configuration</h2>
      <FieldGroup>
        <Field label="Confidence Threshold (%)" value="80" type="number" />
        <Field label="Auto-Post Threshold (%)" value="95" type="number" />
      </FieldGroup>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked className="rounded border-border" />
        Enable OCR Processing
      </label>
      <div>
        <span className="fiori-label">Model Selection</span>
        <select className="mt-1 w-full md:w-1/2 h-8 px-3 rounded border border-input bg-background text-sm outline-none">
          <option>GPT-4 Vision (Default)</option>
          <option>Claude 3.5 Sonnet</option>
          <option>Custom Fine-tuned Model</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save Configuration</button>
        <button className="px-4 py-2 text-sm font-medium border border-accent text-accent rounded hover:bg-accent/5 transition-colors">Re-train Model</button>
      </div>
    </div>
  );
}
