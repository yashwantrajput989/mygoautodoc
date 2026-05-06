import { useState } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "sonner";

const INITIAL_DUPLICATES = [
  { supplier: "SAP SE", invoiceNo: "INV-2026-0855", date: "2026-03-02", amount: "€45,100.00", matchConfidence: 95, matchingDoc: "DOC-0988", suggested: "Confirm Duplicate" },
  { supplier: "Merck KGaA", invoiceNo: "INV-2026-0712", date: "2026-02-28", amount: "€7,340.00", matchConfidence: 88, matchingDoc: "DOC-0920", suggested: "Confirm Duplicate" },
  { supplier: "Bosch GmbH", invoiceNo: "INV-2026-0891", date: "2026-03-01", amount: "€12,450.00", matchConfidence: 72, matchingDoc: "DOC-1005", suggested: "Review" },
  { supplier: "Continental AG", invoiceNo: "INV-2026-0633", date: "2026-02-25", amount: "€22,100.00", matchConfidence: 65, matchingDoc: "DOC-0870", suggested: "Review" },
  { supplier: "Siemens AG", invoiceNo: "INV-2026-1120", date: "2026-03-05", amount: "€31,200.00", matchConfidence: 91, matchingDoc: "DOC-0955", suggested: "Confirm Duplicate" },
  { supplier: "Volkswagen AG", invoiceNo: "INV-2026-0544", date: "2026-02-20", amount: "€128,400.00", matchConfidence: 45, matchingDoc: "DOC-0740", suggested: "Review" },
];

export default function DuplicateMonitor() {
  const [comparing, setComparing] = useState<number | null>(null);

  const handleConfirm = (invoiceNo: string) => {
    toast.success(`Duplicate confirmed: ${invoiceNo}. Document has been archived.`);
  };

  const handleOverride = (invoiceNo: string) => {
    toast.success(`Duplicate overridden: ${invoiceNo} marked as unique.`);
  };

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
              {INITIAL_DUPLICATES.map((dup, i) => (
                <tr key={i}>
                  <td className="font-medium text-foreground">{dup.supplier}</td>
                  <td>{dup.invoiceNo}</td>
                  <td className="text-muted-foreground">{dup.date}</td>
                  <td className="font-medium text-foreground">{dup.amount}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${dup.matchConfidence}%`,
                            backgroundColor: dup.matchConfidence >= 85 ? "#c00" : "#e68a00",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">{dup.matchConfidence}%</span>
                    </div>
                  </td>
                  <td className="text-primary font-medium hover:underline cursor-pointer">{dup.matchingDoc}</td>
                  <td>
                    <StatusBadge
                      status={dup.suggested === "Confirm Duplicate" ? "error" : "warning"}
                      label={dup.suggested}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleConfirm(dup.invoiceNo)}
                        className="px-2 py-1 text-[10px] font-bold text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                         onClick={() => handleOverride(dup.invoiceNo)}
                        className="px-2 py-1 text-[10px] font-bold text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors"
                      >
                        Override
                      </button>
                      <button
                        onClick={() => setComparing(comparing === i ? null : i)}
                        className={`px-2 py-1 text-[10px] font-bold border border-border rounded hover:bg-muted transition-colors ${comparing === i ? 'bg-muted' : ''}`}
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
        <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-2">
             <h2 className="fiori-section-title">Document Comparison Analysis</h2>
             <button onClick={() => setComparing(null)} className="text-xs text-muted-foreground hover:text-foreground underline">Close View</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ComparisonCard
              title="Recent Document"
              docId={`DOC-NEW-${comparing}`}
              data={{
                supplier: INITIAL_DUPLICATES[comparing].supplier,
                invoiceNo: INITIAL_DUPLICATES[comparing].invoiceNo,
                date: INITIAL_DUPLICATES[comparing].date,
                amount: INITIAL_DUPLICATES[comparing].amount,
              }}
              highlight
            />
            <ComparisonCard
              title="Existing Match"
              docId={INITIAL_DUPLICATES[comparing].matchingDoc}
              data={{
                supplier: INITIAL_DUPLICATES[comparing].supplier,
                invoiceNo: INITIAL_DUPLICATES[comparing].invoiceNo,
                date: INITIAL_DUPLICATES[comparing].date,
                amount: INITIAL_DUPLICATES[comparing].amount,
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
    <div className={`fiori-object-page-section p-4 ${highlight ? "border-primary/20" : ""}`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">{docId}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><span className="fiori-label text-[10px]">Supplier</span><p className="text-xs font-medium mt-0.5">{data.supplier}</p></div>
        <div><span className="fiori-label text-[10px]">Invoice No</span><p className="text-xs font-medium mt-0.5">{data.invoiceNo}</p></div>
        <div><span className="fiori-label text-[10px]">Date</span><p className="text-xs font-medium mt-0.5">{data.date}</p></div>
        <div>
          <span className="fiori-label text-[10px]">Amount</span>
          <p className={`text-xs font-black mt-0.5 ${highlight ? "text-primary" : ""}`}>{data.amount}</p>
        </div>
      </div>
    </div>
  );
}


