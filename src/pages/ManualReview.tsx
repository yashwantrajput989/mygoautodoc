import { useState } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";

const queue = [
  { id: "DOC-1021", supplier: "BASF", type: "Invoice", amount: "€3,780.00", confidence: 45, reason: "Low Confidence", status: "error" as const },
  { id: "DOC-1022", supplier: "SAP SE", type: "Invoice", amount: "€45,100.00", confidence: 72, reason: "Duplicate", status: "duplicate" as const },
  { id: "DOC-1016", supplier: "Merck KGaA", type: "Invoice", amount: "€7,340.00", confidence: 62, reason: "Duplicate", status: "duplicate" as const },
  { id: "DOC-1014", supplier: "Evonik", type: "Invoice", amount: "€2,100.00", confidence: 38, reason: "Failed OCR", status: "error" as const },
  { id: "DOC-1012", supplier: "Fresenius", type: "PO", amount: "€15,800.00", confidence: 55, reason: "Low Confidence", status: "warning" as const },
];

export default function ManualReview() {
  const [selected, setSelected] = useState(queue[0]);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);

  return (
    <div className="fiori-page">
      <h1 className="fiori-page-title">Manual Review Workbench</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-11rem)]">
        {/* Left Panel - Queue */}
        <div className="fiori-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold mb-3">Document Queue</h2>
            <div className="flex gap-2 flex-wrap">
              <select className="h-7 px-2 rounded border border-input bg-background text-xs outline-none">
                <option>All Reasons</option>
                <option>Failed</option>
                <option>Duplicate</option>
                <option>Low Confidence</option>
              </select>
              <input type="date" className="h-7 px-2 rounded border border-input bg-background text-xs outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-border">
            {queue.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors ${
                  selected.id === doc.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{doc.id}</span>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="text-xs text-muted-foreground">{doc.supplier} · {doc.amount}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {doc.reason} · {doc.confidence}%
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Detail */}
        <div className="lg:col-span-2 fiori-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{selected.id}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{selected.supplier} · {selected.type} · {selected.amount}</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Reprocess
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* Validation Indicators */}
            <div className="flex gap-3 flex-wrap">
              <ValidationPill label="Supplier Match" valid={true} />
              <ValidationPill label="Amount Verified" valid={false} />
              <ValidationPill label="PO Exists" valid={true} />
              <ValidationPill label="Date Valid" valid={true} />
              <ValidationPill label="No Duplicate" valid={selected.status !== "duplicate"} />
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="fiori-label">Supplier</span>
                <input defaultValue={selected.supplier} className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <span className="fiori-label">Invoice Number</span>
                <input defaultValue="INV-2026-0455" className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <span className="fiori-label">Invoice Date</span>
                <input type="date" defaultValue="2026-03-01" className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <span className="fiori-label">Total Amount</span>
                <input defaultValue={selected.amount} className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <span className="fiori-label">Currency</span>
                <input defaultValue="EUR" className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <span className="fiori-label">PO Number</span>
                <input defaultValue="4500089010" className="mt-1 w-full h-8 px-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>

            {/* Override Duplicate */}
            <div className="p-4 bg-muted/30 rounded border border-border">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideDuplicate}
                    onChange={(e) => setOverrideDuplicate(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm font-medium">Override Duplicate Detection</span>
                </label>
              </div>
              {overrideDuplicate && (
                <div className="mt-3">
                  <span className="fiori-label">Override Reason (Required)</span>
                  <textarea
                    placeholder="Explain why this is not a duplicate..."
                    className="mt-1 w-full p-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Totals Recalculation */}
            <div className="p-4 bg-card rounded border border-border">
              <h3 className="text-sm font-semibold mb-3">Calculated Totals</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="fiori-label">Subtotal</span>
                  <p className="text-sm font-medium mt-1">€3,500.00</p>
                </div>
                <div>
                  <span className="fiori-label">Tax (7.6%)</span>
                  <p className="text-sm font-medium mt-1">€280.00</p>
                </div>
                <div>
                  <span className="fiori-label">Total</span>
                  <p className="text-lg font-semibold mt-0.5">€3,780.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationPill({ label, valid }: { label: string; valid: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${
        valid
          ? "bg-success/10 text-success border-success/20"
          : "bg-destructive/10 text-destructive border-destructive/20"
      }`}
    >
      {valid ? "✓" : "✕"} {label}
    </span>
  );
}
