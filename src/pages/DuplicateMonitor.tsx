import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "sonner";
import { API_BASE } from "@/config";
import { ShieldAlert, Check, RefreshCw, ArrowLeftRight, Tag } from "lucide-react";

export default function DuplicateMonitor() {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [comparing, setComparing] = useState<number | null>(null);

  const fetchDuplicates = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/duplicates`);
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data);
      } else {
        toast.error("Failed to load duplicate detection data");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleConfirm = async (id: string, invoiceNo: string) => {
    if (!confirm(`Are you sure you want to confirm document ${invoiceNo} as a duplicate and delete it?`)) return;
    
    toast.loading("Moving duplicate document to Recycle Bin...", { id: "dup-action" });
    try {
      const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Duplicate confirmed: ${invoiceNo}. Document moved to Recycle Bin.`, { id: "dup-action" });
        setComparing(null);
        fetchDuplicates(true);
      } else {
        toast.error("Failed to delete document", { id: "dup-action" });
      }
    } catch (err) {
      toast.error("Connection error", { id: "dup-action" });
    }
  };

  const handleOverride = async (id: string, invoiceNo: string) => {
    if (!confirm(`Mark ${invoiceNo} as unique and override duplicate warning?`)) return;
    
    toast.loading("Marking document as unique...", { id: "dup-action" });
    try {
      const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override_duplicate: true })
      });
      if (res.ok) {
        toast.success(`Duplicate overridden: ${invoiceNo} marked as unique.`, { id: "dup-action" });
        setComparing(null);
        fetchDuplicates(true);
      } else {
        toast.error("Failed to override duplicate status", { id: "dup-action" });
      }
    } catch (err) {
      toast.error("Connection error", { id: "dup-action" });
    }
  };

  return (
    <div className="fiori-page">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="fiori-page-title">Duplicate Monitor</h1>
          <button 
            onClick={() => fetchDuplicates(true)}
            disabled={isRefreshing || isLoading}
            title="Refresh Scan"
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-all flex items-center justify-center bg-card border border-border shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="fiori-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Scanning processed documents for duplicates...</p>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full">
              <Check className="h-10 w-10" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Inbox Clear</h3>
              <p className="text-xs text-muted-foreground mt-1">No active duplicate invoices or orders detected in SAP readiness queue.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="fiori-smart-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Invoice / PO Number</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Match Confidence</th>
                  <th>Matching Doc</th>
                  <th>Suggested Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((dup, i) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors">
                    <td className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{dup.supplier}</span>
                        {dup.hasKeyword && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-100/40 px-1.5 py-0.5 rounded border border-emerald-500/20 mt-1 w-max">
                            <Tag className="h-2.5 w-2.5" />
                            Keyword: {dup.matchedKeyword}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{dup.invoiceNo}</td>
                    <td className="text-muted-foreground">{dup.date || "—"}</td>
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
                    <td className="text-primary font-medium">{dup.matchingDoc}</td>
                    <td>
                      <StatusBadge
                        status={dup.suggested === "Confirm Duplicate" ? "error" : "warning"}
                        label={dup.suggested}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleConfirm(dup.id, dup.invoiceNo)}
                          className="px-2 py-1 text-[10px] font-bold text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => handleOverride(dup.id, dup.invoiceNo)}
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
        )}
      </div>

      {/* Comparison View */}
      {comparing !== null && duplicates[comparing] && (
        <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-2">
             <h2 className="fiori-section-title flex items-center gap-2">
               <ArrowLeftRight className="h-4 w-4 text-primary" />
               Document Comparison Analysis
             </h2>
             <button onClick={() => setComparing(null)} className="text-xs text-muted-foreground hover:text-foreground underline">Close View</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ComparisonCard
              title="Recent Document (Duplicate Candidate)"
              docId={duplicates[comparing].human_readable_id}
              data={{
                supplier: duplicates[comparing].supplier,
                invoiceNo: duplicates[comparing].invoiceNo,
                date: duplicates[comparing].date,
                amount: duplicates[comparing].amount,
              }}
              highlight
            />
            <ComparisonCard
              title="Existing Match (System Master)"
              docId={duplicates[comparing].matchingDoc}
              data={{
                supplier: duplicates[comparing].matchingDocDetails?.supplier || duplicates[comparing].supplier,
                invoiceNo: duplicates[comparing].matchingDocDetails?.invoiceNo || duplicates[comparing].invoiceNo,
                date: duplicates[comparing].matchingDocDetails?.date || duplicates[comparing].date,
                amount: duplicates[comparing].matchingDocDetails?.amount || duplicates[comparing].amount,
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
    <div className={`fiori-object-page-section p-4 ${highlight ? "border-primary/20 bg-primary/5" : "bg-card"}`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">{docId}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><span className="fiori-label text-[10px]">Supplier</span><p className="text-xs font-medium mt-0.5">{data.supplier}</p></div>
        <div><span className="fiori-label text-[10px]">Invoice / PO No</span><p className="text-xs font-medium mt-0.5">{data.invoiceNo}</p></div>
        <div><span className="fiori-label text-[10px]">Date</span><p className="text-xs font-medium mt-0.5">{data.date || "—"}</p></div>
        <div>
          <span className="fiori-label text-[10px]">Amount</span>
          <p className={`text-xs font-black mt-0.5 ${highlight ? "text-primary" : ""}`}>{data.amount}</p>
        </div>
      </div>
    </div>
  );
}
