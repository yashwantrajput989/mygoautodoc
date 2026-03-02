import { useState } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";

const duplicates = [
  { supplier: "SAP SE", invoiceNo: "INV-2026-0855", date: "2026-03-02", amount: "€45,100.00", matchConfidence: 95, matchingDoc: "DOC-0988", suggested: "Confirm Duplicate" },
  { supplier: "Merck KGaA", invoiceNo: "INV-2026-0712", date: "2026-02-28", amount: "€7,340.00", matchConfidence: 88, matchingDoc: "DOC-0920", suggested: "Confirm Duplicate" },
  { supplier: "Bosch GmbH", invoiceNo: "INV-2026-0891", date: "2026-03-01", amount: "€12,450.00", matchConfidence: 72, matchingDoc: "DOC-1005", suggested: "Review" },
  { supplier: "Continental AG", invoiceNo: "INV-2026-0633", date: "2026-02-25", amount: "€22,100.00", matchConfidence: 65, matchingDoc: "DOC-0870", suggested: "Review" },
];

export default function DuplicateMonitor() {
  const [comparing, setComparing] = useState<number | null>(null);

  return (
    <div className="fiori-page">
      <h1 className="fiori-page-title">Duplicate Monitor</h1>

      {/* Table */}
      <div className="fiori-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="fiori-smart-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Invoice Number</th>
                <th>Invoice Date</th>
                <th>Amount</th>
                <th>Match Confidence</th>
                <th>Matching Doc</th>
                <th>Suggested Action</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {duplicates.map((dup, i) => (
                <tr key={i}>
                  <td className="font-medium">{dup.supplier}</td>
                  <td>{dup.invoiceNo}</td>
                  <td className="text-muted-foreground">{dup.date}</td>
                  <td className="font-medium">{dup.amount}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${dup.matchConfidence}%`,
                            backgroundColor: dup.matchConfidence >= 85 ? "hsl(0, 100%, 37%)" : "hsl(26, 100%, 45%)",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{dup.matchConfidence}%</span>
                    </div>
                  </td>
                  <td className="text-primary font-medium">{dup.matchingDoc}</td>
                  <td>
                    <StatusBadge
                      status={dup.suggested === "Confirm Duplicate" ? "error" : "warning"}
                      label={dup.suggested}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button className="px-2 py-1 text-xs font-medium text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors">
                        Confirm
                      </button>
                      <button className="px-2 py-1 text-xs font-medium text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors">
                        Override
                      </button>
                      <button
                        onClick={() => setComparing(comparing === i ? null : i)}
                        className="px-2 py-1 text-xs font-medium border border-border rounded hover:bg-muted transition-colors"
                      >
                        Compare
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison View */}
      {comparing !== null && (
        <div className="mt-4 animate-fade-in">
          <h2 className="fiori-section-title">Document Comparison</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ComparisonCard
              title="Current Invoice"
              docId={`DOC-${1022 - comparing}`}
              data={{
                supplier: duplicates[comparing].supplier,
                invoiceNo: duplicates[comparing].invoiceNo,
                date: duplicates[comparing].date,
                amount: duplicates[comparing].amount,
              }}
              highlight
            />
            <ComparisonCard
              title="Existing Match"
              docId={duplicates[comparing].matchingDoc}
              data={{
                supplier: duplicates[comparing].supplier,
                invoiceNo: duplicates[comparing].invoiceNo,
                date: duplicates[comparing].date,
                amount: duplicates[comparing].amount,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonCard({
  title,
  docId,
  data,
  highlight = false,
}: {
  title: string;
  docId: string;
  data: { supplier: string; invoiceNo: string; date: string; amount: string };
  highlight?: boolean;
}) {
  return (
    <div className={`fiori-object-page-section ${highlight ? "border-accent/40" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-primary font-medium">{docId}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><span className="fiori-label">Supplier</span><p className="text-sm mt-0.5">{data.supplier}</p></div>
        <div><span className="fiori-label">Invoice No</span><p className="text-sm mt-0.5">{data.invoiceNo}</p></div>
        <div><span className="fiori-label">Date</span><p className="text-sm mt-0.5">{data.date}</p></div>
        <div>
          <span className="fiori-label">Amount</span>
          <p className={`text-sm mt-0.5 font-medium ${highlight ? "text-accent" : ""}`}>{data.amount}</p>
        </div>
      </div>
    </div>
  );
}
