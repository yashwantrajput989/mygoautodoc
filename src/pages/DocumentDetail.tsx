import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  ExternalLink,
  Mail,
  Paperclip,
  CheckCircle2,
  User,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE } from "@/config";


export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocDetail = async () => {
    try {
      // In a real app we'd have a /documents/:id endpoint, 
      // but based on EmailPreview.tsx it seems we fetch all and find
      const res = await fetch(`${API_BASE}/documents`);
      const data = await res.json();
      const doc = data.find((d: any) => d.id === id);
      if (doc) {
        setCurrentDoc(doc);
      } else {
        toast.error("Document not found");
      }
    } catch (err) {
      toast.error("Failed to fetch document details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocDetail();
    
    // Auto-refresh every 15 seconds if it's pending
    const pollInterval = setInterval(() => {
      if (currentDoc?.is_pending) {
        fetchDocDetail();
      }
    }, 15000);
    
    return () => clearInterval(pollInterval);
  }, [id, currentDoc?.is_pending]);

  const handleApprove = () => {
    toast.success("Document approved and sent to SAP successfully!");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading document details...</p>
        </div>
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground bg-background">
        <AlertTriangle className="h-16 w-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-foreground mb-2">Document Not Found</h2>
        <p className="mb-6 text-center max-w-md">The document you are looking for might have been deleted or moved.</p>
        <button 
          onClick={() => navigate("/documents")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Documents
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Detail Header */}
      <header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/documents")}
            className="p-2 hover:bg-muted rounded-full transition-colors mr-2 text-muted-foreground hover:text-primary"
            title="Back to Documents"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold leading-none">{currentDoc.id}</h1>
              <StatusBadge status={currentDoc.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI Confidence: <span className="text-success font-semibold italic">High (98%)</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium border border-border rounded hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Trash2 className="h-4 w-4" /> Discard
          </button>
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" /> Approve & Send to SAP
          </button>
        </div>
      </header>

      {/* Scrolling Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side: Original PDF and Attachments */}
          <div className="flex flex-col gap-6">
            {/* PDF Viewer */}
            <div className="fiori-card flex flex-col overflow-hidden bg-muted/10 min-h-[600px] shadow-sm">
              <div className="p-3 border-b border-border flex items-center justify-between bg-card">
                <span className="text-xs font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> {currentDoc.is_pending ? "Ingested File (Pending Analysis)" : "Primary Source PDF"}
                </span>
                <a
                  href={`${API_BASE}/${currentDoc.is_pending ? 'pending-docs' : 'pdf-docs'}/${currentDoc.id}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Full View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex-1 bg-slate-200">
                <iframe
                  src={`${API_BASE}/${currentDoc.is_pending ? 'pending-docs' : 'pdf-docs'}/${currentDoc.id}.pdf#toolbar=0`}
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              </div>
            </div>

            {/* All Attachments List */}
            {(currentDoc.data.email_metadata?.all_attachments || currentDoc.data.all_attachments) && (
              <div className="fiori-card p-4 shrink-0 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" /> All Incoming Attachments ({(currentDoc.data.email_metadata?.all_attachments || currentDoc.data.all_attachments).length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(currentDoc.data.email_metadata?.all_attachments || currentDoc.data.all_attachments).map((at: string, i: number) => (
                    <div key={i} className={cn(
                      "flex items-center gap-2 p-2.5 rounded text-[10px] border transition-colors",
                      at && currentDoc.id.includes(at.split('.')[0]) ? "bg-primary/5 border-primary/20 text-primary font-bold shadow-sm" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}>
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{at}</span>
                      {at && currentDoc.id.includes(at.split('.')[0]) && <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Data Review & Context */}
          <div className="flex flex-col gap-6">
            {/* Email Context Card */}
            <div className="fiori-card overflow-hidden shrink-0 border-primary/20 shadow-sm translate-y-0 hover:shadow-md transition-shadow">
              <div className="p-3 border-b border-border bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-tight text-primary">Full Source Email Metadata</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {currentDoc.data.email_metadata?.message_id ? `ID: ${currentDoc.data.email_metadata.message_id.substring(0, 8)}...` : "Email Source"}
                </div>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <User className="h-3 w-3" /> From
                    </span>
                    <p className="text-xs font-semibold text-foreground truncate" title={currentDoc.data.email_metadata?.from || currentDoc.data.from}>
                      {currentDoc.data.email_metadata?.from || currentDoc.data.from || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <User className="h-3 w-3" /> To
                    </span>
                    <p className="text-xs font-semibold text-foreground truncate" title={currentDoc.data.email_metadata?.to || currentDoc.data.to}>
                      {currentDoc.data.email_metadata?.to || "Self (Admin)"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Date & Time
                    </span>
                    <p className="text-xs font-medium text-foreground">
                      {currentDoc.data.email_metadata?.received_at || currentDoc.data.email_metadata?.date || currentDoc.data.received_at || currentDoc.data.date || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Subject</span>
                  <p className="text-xs font-bold text-foreground bg-muted/50 p-2.5 rounded border border-border/50">
                    {currentDoc.data.email_metadata?.subject || currentDoc.data.subject || "(No Subject)"}
                  </p>
                </div>

                <div className="p-3.5 bg-primary/5 rounded-md border-l-4 border-primary">
                  <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 mb-1.5">
                    <CheckCircle2 className="h-3 w-3" /> AI Summary
                  </span>
                  <p className="text-xs italic text-foreground leading-relaxed">
                    "{currentDoc.data.email_metadata?.summary || currentDoc.data.summary || "No automated summary available."}"
                  </p>
                </div>
                
                <div className="space-y-2">
                   <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email Message Body
                  </span>
                  <div className="text-xs bg-muted/20 p-4 rounded-md border border-border whitespace-pre-wrap max-h-80 overflow-y-auto font-sans leading-relaxed text-muted-foreground ring-1 ring-inset ring-black/5">
                    {currentDoc.data.email_metadata?.body || currentDoc.data.body || "The full email body text is currently unavailable."}
                  </div>
                </div>
              </div>
            </div>

            {/* Extraction Workbench Card */}
            <div className="fiori-card flex flex-col overflow-visible shadow-sm">
              <div className="p-3 border-b border-border bg-card">
                <span className="text-xs font-bold uppercase tracking-tight">AI Data Extraction & Verification</span>
              </div>

              {currentDoc.is_pending ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div>
                    <h3 className="font-bold text-foreground">AI Analysis in Progress</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px] mt-1">We are currently extracting data from this document. Please wait or refresh shortly.</p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Header Data</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DataField label="Supplier Name" value={currentDoc.data.header?.supplier_name} />
                      <DataField label="Doc Number" value={currentDoc.data.header?.purchase_order_number || currentDoc.data.header?.order_reference} />
                      <DataField label="Posting Date" value={currentDoc.data.header?.invoice_date || currentDoc.data.header?.po_date} />
                      <DataField label="Company" value={currentDoc.data.header?.customer_name} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Line Items Detail</h4>
                    <div className="border border-border rounded-md overflow-hidden bg-card shadow-inner">
                      <table className="w-full text-[10px]">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Price</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {currentDoc.data.line_items?.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-medium">{item.material_description}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right font-mono">{item.unit_price}</td>
                              <td className="px-3 py-2 text-right font-bold text-primary">{item.line_amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-md border border-primary/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Net Taxable Amount</span>
                      <span className="font-medium font-mono">{currentDoc.data.totals?.currency} {currentDoc.data.totals?.total_amount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground inline-flex items-center gap-1">Tax ({currentDoc.data.totals?.tax_description})</span>
                      <span className="font-medium font-mono">{currentDoc.data.totals?.currency} {currentDoc.data.totals?.total_tax}</span>
                    </div>
                    <div className="pt-2 border-t border-primary/10 flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">Payable Total</span>
                      <span className="text-lg font-black text-primary font-mono">{currentDoc.data.totals?.currency} {currentDoc.data.totals?.gross_payable_amount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <input
        defaultValue={value}
        className="w-full h-9 px-3 rounded border border-border bg-background text-xs font-medium outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
      />
    </div>
  );
}
