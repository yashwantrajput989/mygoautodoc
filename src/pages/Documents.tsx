import { useState } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

const documents = [
  { id: "DOC-1024", context: "Invoice", supplier: "Bosch GmbH", amount: "€12,450.00", confidence: 98, duplicate: false, status: "success" as const, sapDoc: "5105600123", date: "2026-03-02" },
  { id: "DOC-1023", context: "PO", supplier: "Siemens AG", amount: "€8,200.00", confidence: 95, duplicate: false, status: "pending" as const, sapDoc: "—", date: "2026-03-02" },
  { id: "DOC-1022", context: "Invoice", supplier: "SAP SE", amount: "€45,100.00", confidence: 72, duplicate: true, status: "duplicate" as const, sapDoc: "—", date: "2026-03-02" },
  { id: "DOC-1021", context: "Invoice", supplier: "BASF", amount: "€3,780.00", confidence: 45, duplicate: false, status: "error" as const, sapDoc: "—", date: "2026-03-01" },
  { id: "DOC-1020", context: "PO", supplier: "BMW AG", amount: "€92,600.00", confidence: 99, duplicate: false, status: "success" as const, sapDoc: "4500089012", date: "2026-03-01" },
  { id: "DOC-1019", context: "Invoice", supplier: "Henkel AG", amount: "€5,670.00", confidence: 88, duplicate: false, status: "success" as const, sapDoc: "5105600120", date: "2026-03-01" },
  { id: "DOC-1018", context: "Invoice", supplier: "ThyssenKrupp", amount: "€18,900.00", confidence: 91, duplicate: false, status: "success" as const, sapDoc: "5105600119", date: "2026-02-28" },
  { id: "DOC-1017", context: "PO", supplier: "Volkswagen AG", amount: "€124,500.00", confidence: 96, duplicate: false, status: "success" as const, sapDoc: "4500089008", date: "2026-02-28" },
  { id: "DOC-1016", context: "Invoice", supplier: "Merck KGaA", amount: "€7,340.00", confidence: 62, duplicate: true, status: "duplicate" as const, sapDoc: "—", date: "2026-02-28" },
  { id: "DOC-1015", context: "Invoice", supplier: "Continental AG", amount: "€22,100.00", confidence: 94, duplicate: false, status: "success" as const, sapDoc: "5105600115", date: "2026-02-27" },
];

export default function Documents() {
  const navigate = useNavigate();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedRows((prev) =>
      prev.length === documents.length ? [] : documents.map((d) => d.id)
    );
  };

  return (
    <div className="fiori-page">
      <div className="flex items-center justify-between">
        <h1 className="fiori-page-title">Documents</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-border rounded hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          {selectedRows.length > 0 && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Reprocess ({selectedRows.length})
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="fiori-filter-bar">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            className="h-8 pl-8 pr-3 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>
        <select className="h-8 px-3 rounded border border-input bg-background text-sm outline-none w-36">
          <option value="">All Statuses</option>
          <option>Success</option>
          <option>Pending</option>
          <option>Failed</option>
          <option>Duplicate</option>
        </select>
        <select className="h-8 px-3 rounded border border-input bg-background text-sm outline-none w-28">
          <option value="">All Types</option>
          <option>Invoice</option>
          <option>PO</option>
        </select>
        <input type="date" className="h-8 px-3 rounded border border-input bg-background text-sm outline-none" />
        <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-primary hover:underline">
          <Filter className="h-3.5 w-3.5" /> More Filters
        </button>
      </div>

      {/* Table */}
      <div className="fiori-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="fiori-smart-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === documents.length}
                    onChange={toggleAll}
                    className="rounded border-border"
                  />
                </th>
                <th>Document ID</th>
                <th>Context</th>
                <th>Supplier / Customer</th>
                <th>Amount</th>
                <th>Confidence</th>
                <th>Duplicate</th>
                <th>Status</th>
                <th>SAP Doc #</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(doc.id)}
                      onChange={() => toggleRow(doc.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="font-medium text-primary">{doc.id}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                      {doc.context}
                    </span>
                  </td>
                  <td>{doc.supplier}</td>
                  <td className="font-medium">{doc.amount}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${doc.confidence}%`,
                            backgroundColor:
                              doc.confidence >= 90
                                ? "hsl(152, 77%, 28%)"
                                : doc.confidence >= 70
                                ? "hsl(26, 100%, 45%)"
                                : "hsl(0, 100%, 37%)",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{doc.confidence}%</span>
                    </div>
                  </td>
                  <td>
                    {doc.duplicate ? (
                      <StatusBadge status="duplicate" label="Yes" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="text-muted-foreground">{doc.sapDoc}</td>
                  <td className="text-muted-foreground">{doc.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Showing 10 of 328 documents</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">Previous</button>
            <button className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground">1</button>
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">2</button>
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">3</button>
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
