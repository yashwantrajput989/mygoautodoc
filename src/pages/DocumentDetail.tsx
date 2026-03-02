import { useParams, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useState } from "react";
import {
  ArrowLeft,
  Edit,
  RefreshCw,
  Copy,
  XCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";

const lineItems = [
  { item: 1, material: "MAT-001", description: "Steel Bearings 50mm", qty: 100, unitPrice: 45.00, discount: 5, tax: 7.6, netAmount: 4275.00, glAccount: "400100" },
  { item: 2, material: "MAT-002", description: "Hydraulic Seals Pack", qty: 50, unitPrice: 28.50, discount: 0, tax: 7.6, netAmount: 1425.00, glAccount: "400100" },
  { item: 3, material: "MAT-003", description: "Precision Gears Set", qty: 25, unitPrice: 180.00, discount: 10, tax: 7.6, netAmount: 4050.00, glAccount: "400200" },
  { item: 4, material: "MAT-004", description: "Coolant Fluid 5L", qty: 200, unitPrice: 12.50, discount: 0, tax: 7.6, netAmount: 2500.00, glAccount: "400300" },
];

const auditTrail = [
  { action: "Document Created", user: "System", timestamp: "2026-03-02 09:15:22", prevValue: "—", newValue: "DOC-1024" },
  { action: "OCR Extraction", user: "System", timestamp: "2026-03-02 09:15:24", prevValue: "—", newValue: "Confidence: 98%" },
  { action: "Validation Passed", user: "System", timestamp: "2026-03-02 09:15:25", prevValue: "—", newValue: "All fields valid" },
  { action: "Posted to SAP", user: "System", timestamp: "2026-03-02 09:15:30", prevValue: "Pending", newValue: "5105600123" },
];

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    email: true,
    header: true,
    lineItems: true,
    audit: false,
  });

  const toggle = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fiori-page">
      {/* Back Nav */}
      <button
        onClick={() => navigate("/documents")}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Documents
      </button>

      {/* Object Page Header */}
      <div className="fiori-object-page-header rounded border border-border">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold">{id || "DOC-1024"}</h1>
              <StatusBadge status="success" />
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="fiori-label mr-1.5">Confidence</span>
                <span className="font-medium text-foreground">98%</span>
              </div>
              <div>
                <span className="fiori-label mr-1.5">Duplicate</span>
                <span className="font-medium text-foreground">No</span>
              </div>
              <div>
                <span className="fiori-label mr-1.5">SAP Doc</span>
                <span className="font-medium text-foreground">5105600123</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded hover:bg-muted transition-colors">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded hover:bg-muted transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Reprocess
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded hover:bg-muted transition-colors">
              <Copy className="h-3.5 w-3.5" /> Mark Duplicate
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors">
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Email Info */}
      <CollapsibleSection title="Email Information" open={expandedSections.email} onToggle={() => toggle("email")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Source Email" value="invoices@bosch.com" />
          <FormField label="Received" value="2026-03-02 09:14:55" />
        </div>
        <div className="mt-4">
          <span className="fiori-label">Email Body</span>
          <div className="mt-1.5 p-3 bg-muted/50 rounded text-sm text-foreground leading-relaxed">
            Dear Team,<br /><br />
            Please find attached our invoice #INV-2026-0892 for the delivery of materials as per PO 4500089010.
            Payment terms: Net 30 days.<br /><br />
            Best regards,<br />
            Bosch Accounts Payable
          </div>
        </div>
      </CollapsibleSection>

      {/* Section 2: Header Data */}
      <CollapsibleSection title="Extracted Header Data" open={expandedSections.header} onToggle={() => toggle("header")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Supplier" value="Bosch GmbH" editable />
          <FormField label="PO Number" value="4500089010" editable />
          <FormField label="Invoice Number" value="INV-2026-0892" editable />
          <FormField label="Invoice Date" value="2026-03-01" type="date" editable />
          <FormField label="Delivery Date" value="2026-02-28" type="date" editable />
          <FormField label="Currency" value="EUR" editable />
          <FormField label="Total Amount" value="€12,450.00" editable />
          <FormField label="Tax Amount" value="€948.00" editable />
          <FormField label="Discount" value="€200.00" editable />
        </div>
      </CollapsibleSection>

      {/* Section 3: Line Items */}
      <CollapsibleSection title="Line Items" open={expandedSections.lineItems} onToggle={() => toggle("lineItems")}>
        <div className="overflow-x-auto">
          <table className="fiori-smart-table">
            <thead>
              <tr>
                <th>Item #</th>
                <th>Material</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount %</th>
                <th>Tax %</th>
                <th>Net Amount</th>
                <th>GL Account</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.item}>
                  <td>{item.item}</td>
                  <td className="font-medium">{item.material}</td>
                  <td>{item.description}</td>
                  <td>{item.qty}</td>
                  <td>€{item.unitPrice.toFixed(2)}</td>
                  <td>{item.discount}%</td>
                  <td>{item.tax}%</td>
                  <td className="font-medium">€{item.netAmount.toFixed(2)}</td>
                  <td>{item.glAccount}</td>
                  <td>
                    <button className="p-1 hover:bg-destructive/10 rounded text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Row
        </button>
      </CollapsibleSection>

      {/* Section 4: Audit Trail */}
      <CollapsibleSection title="Audit Trail" open={expandedSections.audit} onToggle={() => toggle("audit")}>
        <table className="fiori-smart-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Timestamp</th>
              <th>Previous Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {auditTrail.map((entry, i) => (
              <tr key={i}>
                <td>{entry.action}</td>
                <td>{entry.user}</td>
                <td className="text-muted-foreground">{entry.timestamp}</td>
                <td className="text-muted-foreground">{entry.prevValue}</td>
                <td>{entry.newValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fiori-object-page-section">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-4"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <h2 className="text-lg font-semibold">{title}</h2>
      </button>
      {open && children}
    </div>
  );
}

function FormField({
  label,
  value,
  editable = false,
  type = "text",
}: {
  label: string;
  value: string;
  editable?: boolean;
  type?: string;
}) {
  return (
    <div>
      <span className="fiori-label">{label}</span>
      {editable ? (
        <input
          type={type}
          defaultValue={value}
          className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <p className="mt-1 text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}
