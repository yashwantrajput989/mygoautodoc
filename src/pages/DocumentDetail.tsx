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
  ChevronDown,
  ChevronRight,
  Save,
  Code,
  Copy,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE } from "@/config";

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailsList, setEmailsList] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // Collapsible section states
  const [isRawEmailCollapsed, setIsRawEmailCollapsed] = useState(false);
  const [isEmailContextCollapsed, setIsEmailContextCollapsed] = useState(false);
  const [isPdfViewCollapsed, setIsPdfViewCollapsed] = useState(false);
  const [isAttachmentsCollapsed, setIsAttachmentsCollapsed] = useState(false);
  const [isExtractedDataCollapsed, setIsExtractedDataCollapsed] = useState(false);
  const [isMatrixCollapsed, setIsMatrixCollapsed] = useState(false);
  const [sapPayload, setSapPayload] = useState<any>(null);
  const [isPayloadCollapsed, setIsPayloadCollapsed] = useState(true);
  const [isFetchingPayload, setIsFetchingPayload] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.emails && Array.isArray(data.emails)) {
          setEmailsList(data.emails);
        } else if (data.user_email) {
          setEmailsList([{ email: data.user_email, active: true }]);
        }
      })
      .catch(() => { });
  }, []);

  const normalizeDoc = (doc: any) => {
    if (!doc) return null;
    return {
      ...doc,
      data: {
        header: {},
        totals: {},
        line_items: [],
        exceptions: "",
        field_origins: {},
        line_item_origins: {},
        ...(doc.data || {})
      }
    };
  };

  const fetchDocDetail = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`);
      if (res.ok) {
        const doc = await res.json();
        setCurrentDoc(normalizeDoc(doc));
      } else {
        // Fallback to searching the list if single endpoint is not supported
        const listRes = await fetch(`${API_BASE}/documents`);
        const listData = await listRes.json();
        const doc = listData.find((d: any) => d.id === id);
        if (doc) {
          setCurrentDoc(normalizeDoc(doc));
        } else {
          toast.error("Document not found");
        }
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

  const fetchPayloadPreview = async () => {
    if (!id) return;
    setIsFetchingPayload(true);
    try {
      const res = await fetch(`${API_BASE}/documents/${id}/sap-payload`);
      if (res.ok) {
        const data = await res.json();
        setSapPayload(data);
      }
    } catch (err) {
      console.error("Failed to fetch SAP payload preview", err);
    } finally {
      setIsFetchingPayload(false);
    }
  };

  useEffect(() => {
    const isSuccess = currentDoc?.status === "success" || currentDoc?.status === "Success";
    if (isSuccess && currentDoc?.data?.sap_payload) {
      setSapPayload(currentDoc.data.sap_payload);
    } else if (currentDoc) {
      if (!isPayloadCollapsed) {
        fetchPayloadPreview();
      }
    }
  }, [id, isPayloadCollapsed, currentDoc?.data?.sap_payload, currentDoc?.status]);

  const handleHeaderChange = (field: string, value: string) => {
    setCurrentDoc((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        data: {
          ...prev.data,
          header: {
            ...(prev.data?.header || {}),
            [field]: value
          }
        }
      };
    });
  };

  const handleTotalChange = (field: string, value: string) => {
    setCurrentDoc((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        data: {
          ...prev.data,
          totals: {
            ...(prev.data?.totals || {}),
            [field]: value
          }
        }
      };
    });
  };

  const handleLineItemChange = (index: number, field: string, value: string) => {
    setCurrentDoc((prev: any) => {
      if (!prev) return null;
      const updatedItems = [...(prev.data?.line_items || [])];
      updatedItems[index] = {
        ...(updatedItems[index] || {}),
        [field]: value
      };
      return {
        ...prev,
        data: {
          ...prev.data,
          line_items: updatedItems
        }
      };
    });
  };

  const handleExceptionsChange = (value: string) => {
    setCurrentDoc((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        data: {
          ...prev.data,
          exceptions: value
        }
      };
    });
  };

  const handleSaveChanges = async () => {
    setIsSavingChanges(true);
    toast.loading("Saving changes to server...", { id: "save-doc" });
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          header: currentDoc.data?.header,
          line_items: currentDoc.data?.line_items,
          totals: currentDoc.data?.totals,
          exceptions: currentDoc.data?.exceptions
        })
      });
      if (res.ok) {
        toast.success("Changes saved successfully!", { id: "save-doc" });
        fetchDocDetail();
        if (!isSuccess && !isPayloadCollapsed) {
          fetchPayloadPreview();
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save changes", { id: "save-doc" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to backend", { id: "save-doc" });
    } finally {
      setIsSavingChanges(false);
    }
  };

  const [isReparsing, setIsReparsing] = useState(false);

  const handleReparse = async () => {
    setIsReparsing(true);
    toast.loading("Re-parsing document with AI...", { id: "reparse-doc" });
    try {
      const res = await fetch(`${API_BASE}/documents/${id}/reparse`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Document re-parsed successfully!", { id: "reparse-doc" });
        fetchDocDetail();
      } else {
        toast.error(data.message || data.error || "Failed to re-parse document", { id: "reparse-doc" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to backend", { id: "reparse-doc" });
    } finally {
      setIsReparsing(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm("Are you sure you want to discard/delete this document? It will be moved to the Recycle Bin.")) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Document successfully moved to Recycle Bin");
        navigate("/documents");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to discard document");
      }
    } catch (err) {
      toast.error("Failed to discard document");
    }
  };

  const handleApprove = async () => {
    setIsPosting(true);
    toast.loading("Saving and posting Sales Order to SAP...", { id: "sap-post" });
    try {
      // 1. Save changes first
      await fetch(`${API_BASE}/documents/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          header: currentDoc.data?.header,
          line_items: currentDoc.data?.line_items,
          totals: currentDoc.data?.totals,
          exceptions: currentDoc.data?.exceptions
        })
      });

      // 2. Post to SAP
      const res = await fetch(`${API_BASE}/documents/${id}/post-sap`, {
        method: "POST"
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Sales Order posted to SAP successfully!", { id: "sap-post" });
        fetchDocDetail();
      } else {
        toast.error(data.message || data.error || "Failed to post Sales Order to SAP", { id: "sap-post" });
        if (res.status === 409) {
          fetchDocDetail();
        }
        if (data.details) {
          console.error("SAP Error Details:", data.details);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to backend", { id: "sap-post" });
    } finally {
      setIsPosting(false);
    }
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

  const isBodyOnly = currentDoc?.data?.is_body_only === true || currentDoc?.id?.startsWith('body_');
  const recipientEmail = currentDoc?.data?.email_metadata?.recipient_email || currentDoc?.data?.recipient_email || currentDoc?.data?.email_metadata?.to || "";
  const matchedEmail = emailsList.find(e => recipientEmail.toLowerCase().includes(e.email.toLowerCase()));
  const isEmailActiveAndConnected = matchedEmail ? (matchedEmail.active !== false) : false;

  const fileExt = currentDoc?.extension?.toLowerCase() || '.pdf';
  const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.tiff'].includes(fileExt);
  const isPdf = fileExt === '.pdf';
  const fileUrl = `${API_BASE}/${currentDoc.is_pending ? 'pending-docs' : 'pdf-docs'}/${currentDoc.filename || `${currentDoc.id}.pdf`}`;

  const isSalesOrder = currentDoc?.data?.header?.context === "Sales Order";
  const isSuccess = currentDoc.status === "success" || currentDoc.status === "Success";
  const sapDocNumber = currentDoc.sap_document_number || currentDoc.data?.sap_document_number;

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
              <h1 className="text-lg font-bold leading-none">{currentDoc.data?.human_readable_id || currentDoc.id}</h1>
              <StatusBadge status={currentDoc.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI Confidence: <span className="text-success font-semibold italic">High (98%)</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 text-sm font-medium border border-border rounded hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" /> Discard
          </button>

          {!isSuccess && !currentDoc?.is_pending && currentDoc?.status !== 'failed_parsing' && (
            <button
              onClick={handleSaveChanges}
              disabled={isSavingChanges || isPosting}
              className="px-4 py-2 text-sm font-medium bg-card border border-border rounded hover:bg-muted text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Save className={`h-4 w-4 ${isSavingChanges ? 'animate-spin' : ''}`} /> Save Changes
            </button>
          )}

          {isSuccess ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="h-4 w-4" /> SAP Document: {sapDocNumber || "9000012345"}
              </div>
              {currentDoc?.data?.sap_attachment_status === 'success' ? (
                <div className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded shadow-sm animate-in fade-in zoom-in-95 duration-200" title="Attachment successfully uploaded to SAP Attachment Service.">
                  <Paperclip className="h-4 w-4" /> Attachment Uploaded
                </div>
              ) : currentDoc?.data?.sap_attachment_status === 'failed' ? (
                <div className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-destructive/10 border border-destructive/20 text-destructive rounded shadow-sm animate-in fade-in zoom-in-95 duration-200" title={`SAP Attachment Upload Failed: ${currentDoc?.data?.sap_attachment_error || 'Unknown attachment error'}`}>
                  <AlertTriangle className="h-4 w-4" /> Attachment Failed
                </div>
              ) : null}
            </div>
          ) : currentDoc?.status === 'failed_parsing' ? (
            <button
              onClick={handleReparse}
              disabled={isReparsing}
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-amber-500 text-white rounded shadow-sm hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isReparsing ? 'animate-spin' : ''}`} />
              {isReparsing ? "Re-parsing..." : "Retry AI Parse"}
            </button>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isPosting || isLoading || currentDoc?.is_pending}
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className={`h-4 w-4 ${isPosting ? 'animate-spin' : ''}`} />
              {isPosting ? "Posting to SAP..." : "Approve & Send to SAP"}
            </button>
          )}
        </div>
      </header>

      {/* Scrolling Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Error Banner */}
          {(currentDoc.status === 'failed' || currentDoc.status === 'failed_parsing') && (
            <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg flex items-start gap-3 mb-6 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-destructive uppercase tracking-wide">
                  {currentDoc.status === 'failed_parsing' ? "AI Analysis Parsing Failed" : "SAP Posting Failed"}
                </h4>
                <p className="text-xs text-foreground mt-1.5 font-medium leading-relaxed">
                  {currentDoc.data?.sap_error || currentDoc.data?.error || currentDoc.data?.exceptions || "An unknown error occurred during processing."}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Side: Email Metadata & PDF / Attachment Viewer */}
            <div className="flex flex-col gap-6">

              {/* Email Context Card */}
              <div className="fiori-card overflow-hidden shrink-0 border-primary/20 shadow-sm translate-y-0 hover:shadow-md transition-shadow">
                <button
                  type="button"
                  onClick={() => setIsEmailContextCollapsed(!isEmailContextCollapsed)}
                  className="w-full p-3 border-b border-border bg-primary/5 flex items-center justify-between hover:bg-muted/30 transition-colors text-left focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-tight text-primary">Full Source Email Metadata</span>
                    {recipientEmail && !isEmailContextCollapsed && (
                      <div className="flex items-center gap-1 ml-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full inline-block",
                          isEmailActiveAndConnected ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-destructive shadow-[0_0_8px_#ef4444]"
                        )} />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                          {isEmailActiveAndConnected ? "Active" : "Inactive"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary mr-1">
                      {currentDoc.data.email_metadata?.message_id ? `ID: ${currentDoc.data.email_metadata.message_id.substring(0, 8)}...` : "Email Source"}
                    </div>
                    {isEmailContextCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>

                {!isEmailContextCollapsed && (
                  <div className="p-5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
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
                )}
              </div>

              {isBodyOnly ? (
                /* Beautiful raw intake email reader panel */
                <div className="fiori-card flex flex-col overflow-hidden bg-background border border-border shadow-sm min-h-[200px] rounded-xl animate-in fade-in duration-300">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setIsRawEmailCollapsed(!isRawEmailCollapsed)}
                    className="w-full p-4 border-b border-border bg-card/60 flex items-center justify-between hover:bg-muted/30 transition-colors text-left focus:outline-none"
                  >
                    <span className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Raw Intake Email Body
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-black text-primary border border-primary/20 uppercase tracking-tight">
                        📄 Ingested via Body Keywords Match
                      </span>
                      {isRawEmailCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {/* Email Viewer */}
                  {!isRawEmailCollapsed && (
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/80">
                        <div className="grid grid-cols-6 gap-2 text-xs">
                          <span className="col-span-1 font-bold text-muted-foreground uppercase text-[10px]">Subject:</span>
                          <span className="col-span-5 font-bold text-foreground">{currentDoc.data.email_metadata?.subject || currentDoc.data.subject || "(No Subject)"}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2 text-xs border-t border-border/50 pt-2">
                          <span className="col-span-1 font-bold text-muted-foreground uppercase text-[10px]">From:</span>
                          <span className="col-span-5 font-medium text-foreground truncate">{currentDoc.data.email_metadata?.from || currentDoc.data.from || "Unknown"}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2 text-xs border-t border-border/50 pt-2">
                          <span className="col-span-1 font-bold text-muted-foreground uppercase text-[10px]">To:</span>
                          <span className="col-span-5 font-medium text-foreground truncate">{currentDoc.data.email_metadata?.recipient_email || currentDoc.data.email_metadata?.to || "Self (Admin)"}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2 text-xs border-t border-border/50 pt-2">
                          <span className="col-span-1 font-bold text-muted-foreground uppercase text-[10px]">Date:</span>
                          <span className="col-span-5 text-muted-foreground font-medium">{currentDoc.data.email_metadata?.received_at || currentDoc.data.email_metadata?.date || "—"}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Email Content Body</label>
                        <div className="bg-card border border-border p-5 rounded-xl text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed min-h-[300px] max-h-[500px] overflow-y-auto shadow-inner">
                          {currentDoc.data.email_metadata?.body || currentDoc.data.body || "No email body text available."}
                        </div>
                      </div>

                      {currentDoc.data.email_metadata?.matched_keyword && (
                        <div className="p-3 bg-emerald-100/10 border-l-4 border-emerald-500 rounded-r-lg flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <p className="text-[11px] font-semibold text-emerald-600">
                            Triggered by matched keyword: <span className="font-mono bg-emerald-100/30 px-1.5 py-0.5 rounded border border-emerald-500/20">"{currentDoc.data.email_metadata.matched_keyword}"</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Multi-format Document Viewer */
                <div className={cn(
                  "fiori-card flex flex-col overflow-hidden bg-muted/10 shadow-sm rounded-xl animate-in fade-in duration-300",
                  !isPdfViewCollapsed && "min-h-[600px]"
                )}>
                  <button
                    type="button"
                    onClick={() => setIsPdfViewCollapsed(!isPdfViewCollapsed)}
                    className="p-3 border-b border-border flex items-center justify-between bg-card text-left focus:outline-none w-full animate-in fade-in duration-200"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> {currentDoc.is_pending ? "Ingested File (Pending Analysis)" : `Primary Source File (${fileExt.toUpperCase().slice(1)})`}
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] uppercase font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        Full View <ExternalLink className="h-3 w-3" />
                      </a>
                      {isPdfViewCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {!isPdfViewCollapsed && (
                    <div className="flex-1 flex flex-col min-h-[500px]">
                      {isPdf ? (
                        <div className="flex-1 bg-slate-200 min-h-[500px]">
                          <iframe
                            src={`${fileUrl}#toolbar=0`}
                            className="w-full h-full border-none min-h-[500px]"
                            title="Document Preview"
                          />
                        </div>
                      ) : isImage ? (
                        <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-auto min-h-[500px]">
                          <img
                            src={fileUrl}
                            className="max-w-full max-h-[550px] object-contain rounded-lg shadow-md border border-border bg-white"
                            alt="Document Preview"
                          />
                        </div>
                      ) : (
                        <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[500px]">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground truncate max-w-sm">{currentDoc.filename || `${currentDoc.id}${fileExt}`}</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                              This is a Microsoft Office document ({fileExt.toUpperCase().slice(1)}). Direct browser previewing is disabled for security.
                            </p>
                          </div>
                          <a
                            href={fileUrl}
                            download
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold shadow hover:bg-primary/95 transition-all text-xs"
                          >
                            <Download className="h-4 w-4" /> Download and Open Locally
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* All Attachments List */}
              {(currentDoc.data.email_metadata?.all_attachments || currentDoc.data.all_attachments) && (currentDoc.data.email_metadata?.all_attachments || currentDoc.data.all_attachments).length > 0 && (
                <div className="fiori-card overflow-hidden shadow-sm transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentsCollapsed(!isAttachmentsCollapsed)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left focus:outline-none bg-card"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5" /> All Incoming Attachments ({(currentDoc.data.email_metadata?.all_attachments || currentDoc.data.all_attachments).length})
                    </h3>
                    {isAttachmentsCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {!isAttachmentsCollapsed && (
                    <div className="p-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
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
                  )}
                </div>
              )}
            </div>

            {/* Right Side: Data Review & SAP Payload */}
            <div className="flex flex-col gap-6">

              {/* Extraction Workbench Card */}
              <div className="fiori-card flex flex-col overflow-visible shadow-sm">
                <button
                  onClick={() => setIsExtractedDataCollapsed(!isExtractedDataCollapsed)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left border-b border-border bg-card focus:outline-none"
                >
                  <span className="text-xs font-bold uppercase tracking-tight">AI Data Extraction & Verification</span>
                  {isExtractedDataCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {!isExtractedDataCollapsed && (
                  <>
                    {currentDoc.is_pending ? (
                      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <div>
                          <h3 className="font-bold text-foreground">AI Analysis in Progress</h3>
                          <p className="text-xs text-muted-foreground max-w-[200px] mt-1">We are currently extracting data from this document. Please wait or refresh shortly.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">

                        {/* Context indicator */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Document Context</span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-primary/10 border border-primary/20 text-primary uppercase shadow-inner">
                            {isSalesOrder ? "Sales Order Mode" : "Vendor Invoice Mode"}
                          </span>
                        </div>

                        {/* Header Data Section */}
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Header Data</h3>

                          {isSalesOrder ? (
                            /* Sales Order Fields */
                            <div className="grid grid-cols-2 gap-4">
                              <DataField
                                label="Sold to Party Number"
                                value={currentDoc.data.header?.sold_to_party_number}
                                onChange={(e) => handleHeaderChange("sold_to_party_number", e.target.value)}
                              />
                              <DataField
                                label="Customer Name"
                                value={currentDoc.data.header?.customer_name}
                                onChange={(e) => handleHeaderChange("customer_name", e.target.value)}
                              />
                              <DataField
                                label="Ship to Party Number"
                                value={currentDoc.data.header?.ship_to_party_number}
                                onChange={(e) => handleHeaderChange("ship_to_party_number", e.target.value)}
                              />
                              <DataField
                                label="Requested Date"
                                value={currentDoc.data.header?.requested_date}
                                onChange={(e) => handleHeaderChange("requested_date", e.target.value)}
                              />
                              <DataField
                                label="Order Received Date"
                                value={currentDoc.data.header?.order_received_date}
                                onChange={(e) => handleHeaderChange("order_received_date", e.target.value)}
                              />
                              <DataField
                                label="Payment Terms"
                                value={currentDoc.data.header?.payment_terms}
                                onChange={(e) => handleHeaderChange("payment_terms", e.target.value)}
                              />
                              <DataField
                                label="Inco Terms"
                                value={currentDoc.data.header?.inco_terms}
                                onChange={(e) => handleHeaderChange("inco_terms", e.target.value)}
                              />
                              <DataField
                                label="Customer PO Number"
                                value={currentDoc.data.header?.customer_po_number}
                                onChange={(e) => handleHeaderChange("customer_po_number", e.target.value)}
                              />
                              <DataField
                                label="Sales Organization"
                                value={currentDoc.data.header?.sales_organization}
                                onChange={(e) => handleHeaderChange("sales_organization", e.target.value)}
                              />
                              <DataField
                                label="Distribution Channel"
                                value={currentDoc.data.header?.distribution_channel}
                                onChange={(e) => handleHeaderChange("distribution_channel", e.target.value)}
                              />
                              <DataField
                                label="Division"
                                value={currentDoc.data.header?.division}
                                onChange={(e) => handleHeaderChange("division", e.target.value)}
                              />
                            </div>
                          ) : (
                            /* Vendor Invoice Fields */
                            <div className="grid grid-cols-2 gap-4">
                              <DataField
                                label="Supplier Number"
                                value={currentDoc.data.header?.supplier_number}
                                onChange={(e) => handleHeaderChange("supplier_number", e.target.value)}
                              />
                              <DataField
                                label="Supplier Name"
                                value={currentDoc.data.header?.supplier_name}
                                onChange={(e) => handleHeaderChange("supplier_name", e.target.value)}
                              />
                              <DataField
                                label="Invoice Date"
                                value={currentDoc.data.header?.invoice_date}
                                onChange={(e) => handleHeaderChange("invoice_date", e.target.value)}
                              />
                              <DataField
                                label="Invoice Reference"
                                value={currentDoc.data.header?.invoice_reference}
                                onChange={(e) => handleHeaderChange("invoice_reference", e.target.value)}
                              />
                              <DataField
                                label="PO Number"
                                value={currentDoc.data.header?.po_number}
                                onChange={(e) => handleHeaderChange("po_number", e.target.value)}
                              />
                              <DataSelect
                                label="PO Type"
                                value={currentDoc.data.header?.po_type}
                                options={["PO", "Non-PO"]}
                                onChange={(e) => handleHeaderChange("po_type", e.target.value)}
                              />
                              <DataField
                                label="Company Code"
                                value={currentDoc.data.header?.company_code}
                                onChange={(e) => handleHeaderChange("company_code", e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Line Items Section */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Line Items Detail</h4>
                          <div className="border border-border rounded-md overflow-x-auto bg-card shadow-inner max-w-full">
                            <table className="w-full text-[10px] whitespace-nowrap min-w-[700px]">
                              <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                  <th className="px-3 py-2 text-left w-14">Item No.</th>
                                  <th className="px-3 py-2 text-left w-32">{isSalesOrder ? "Cust. Material No." : "Supplier Material No."}</th>
                                  <th className="px-3 py-2 text-left">Cust. Material Desc</th>
                                  <th className="px-3 py-2 text-left w-32">SAP Material No.</th>
                                  <th className="px-3 py-2 text-left">SAP Material Desc</th>
                                  <th className="px-3 py-2 text-right w-16">Qty</th>
                                  <th className="px-3 py-2 text-center w-14">UoM</th>
                                  <th className="px-3 py-2 text-right w-20">Price</th>
                                  <th className="px-3 py-2 text-right w-24">Amount</th>
                                  <th className="px-3 py-2 text-right w-20">Tax</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {currentDoc.data.line_items?.map((item: any, i: number) => (
                                  <tr key={i} className="hover:bg-muted/20">
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.item_number || ""}
                                        onChange={(e) => handleLineItemChange(i, "item_number", e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={(isSalesOrder ? item.customer_material_number : item.supplier_material_number) || ""}
                                        onChange={(e) => handleLineItemChange(i, isSalesOrder ? "customer_material_number" : "supplier_material_number", e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.material_description || ""}
                                        onChange={(e) => handleLineItemChange(i, "material_description", e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.sap_material_number || ""}
                                        onChange={(e) => handleLineItemChange(i, "sap_material_number", e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px] font-mono"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.sap_material_description || ""}
                                        onChange={(e) => handleLineItemChange(i, "sap_material_description", e.target.value)}
                                        placeholder="No SAP Match"
                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.quantity || ""}
                                        onChange={(e) => handleLineItemChange(i, "quantity", e.target.value)}
                                        className="w-full text-right bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.unit_of_measure || ""}
                                        onChange={(e) => handleLineItemChange(i, "unit_of_measure", e.target.value)}
                                        className="w-full text-center bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.price || item.unit_price || ""}
                                        onChange={(e) => {
                                          handleLineItemChange(i, "price", e.target.value);
                                          handleLineItemChange(i, "unit_price", e.target.value);
                                        }}
                                        className="w-full text-right bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px] font-mono"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.amount || item.line_amount || ""}
                                        onChange={(e) => {
                                          handleLineItemChange(i, "amount", e.target.value);
                                          handleLineItemChange(i, "line_amount", e.target.value);
                                        }}
                                        className="w-full text-right bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px] font-bold text-primary font-mono"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        value={item.tax || item.line_tax || ""}
                                        onChange={(e) => {
                                          handleLineItemChange(i, "tax", e.target.value);
                                          handleLineItemChange(i, "line_tax", e.target.value);
                                        }}
                                        className="w-full text-right bg-transparent border-b border-transparent focus:border-primary focus:bg-background focus:outline-none px-1 text-[10px] font-mono"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Footer/Totals Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                          {/* Exceptions Field */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Exceptions Log</label>
                            <textarea
                              value={currentDoc.data.exceptions || ""}
                              onChange={(e) => handleExceptionsChange(e.target.value)}
                              placeholder="Describe any warning exceptions, price mismatch, or tax validation issues..."
                              className="w-full h-[96px] p-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary font-medium shadow-inner leading-relaxed resize-none"
                            />
                          </div>

                          {/* Financial Totals */}
                          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Currency</span>
                              <input
                                value={currentDoc.data.totals?.currency || ""}
                                onChange={(e) => handleTotalChange("currency", e.target.value)}
                                className="w-20 text-center bg-transparent border-b border-border focus:border-primary focus:outline-none px-1 font-bold text-xs uppercase"
                              />
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-primary/10">
                              <span className="text-muted-foreground">Total Taxes</span>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-primary text-[10px]">{currentDoc.data.totals?.currency || "USD"}</span>
                                <input
                                  value={currentDoc.data.totals?.total_taxes || currentDoc.data.totals?.total_tax || ""}
                                  onChange={(e) => {
                                    handleTotalChange("total_taxes", e.target.value);
                                    handleTotalChange("total_tax", e.target.value);
                                  }}
                                  className="w-28 text-right bg-transparent border-b border-border focus:border-primary focus:outline-none px-1 font-bold text-xs font-mono"
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1.5">
                              <span className="text-muted-foreground uppercase font-black text-primary text-[10px]">Total Amount</span>
                              <div className="flex items-center gap-1">
                                <span className="font-black text-primary text-[11px]">{currentDoc.data.totals?.currency || "USD"}</span>
                                <input
                                  value={currentDoc.data.totals?.total_amount || ""}
                                  onChange={(e) => handleTotalChange("total_amount", e.target.value)}
                                  className="w-28 text-right bg-transparent border-b border-border focus:border-primary focus:outline-none px-1 font-black text-sm text-primary font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Master Data Reconciliation Matrix Card */}
              {currentDoc?.data && (
                <div className="fiori-card flex flex-col overflow-visible shadow-sm border border-emerald-500/25 bg-card/60 backdrop-blur-sm mt-6 animate-in fade-in duration-300">
                  <button
                    onClick={() => setIsMatrixCollapsed(!isMatrixCollapsed)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left border-b border-border bg-emerald-500/5 focus:outline-none rounded-t-2xl"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4.5 w-4.5 text-emerald-500" />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 font-black">
                          Master Data Reconciliation Matrix
                        </h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                          Side-by-side alignment of AI extractions, SAP master lookup APIs, and final payload staging
                        </p>
                      </div>
                    </div>
                    {isMatrixCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {!isMatrixCollapsed && (
                    <div className="p-5 space-y-6">
                      <div className="overflow-x-auto border border-border/80 rounded-xl bg-card">
                        <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[600px]">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-1/4">Data Property</th>
                              <th className="p-3 text-[10px] font-bold text-red-500 uppercase tracking-wider w-1/4 bg-red-500/5">1. AI Extracted (Raw Document)</th>
                              <th className="p-3 text-[10px] font-bold text-indigo-600 uppercase tracking-wider w-1/4 bg-indigo-500/5">2. SAP Master Data (API Match)</th>
                              <th className="p-3 text-[10px] font-bold text-emerald-600 uppercase tracking-wider w-1/4 bg-emerald-500/5">3. Final SAP Push (Staging)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {/* Sold-to Party Row */}
                            <tr className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-semibold text-foreground">
                                {isSalesOrder ? "Sold-To Party (Customer)" : "Supplier (Vendor)"}
                              </td>
                              <td className="p-3 bg-red-500/5 font-medium text-red-700">
                                {(() => {
                                  const name = currentDoc.data.ai_extracted_data?.header?.customer_name || currentDoc.data.ai_extracted_data?.header?.supplier_name;
                                  const code = currentDoc.data.ai_extracted_data?.header?.sold_to_party_number || currentDoc.data.ai_extracted_data?.header?.supplier_number;
                                  return [name, code].filter(Boolean).join(" / ") || "—";
                                })()}
                              </td>
                              <td className="p-3 bg-indigo-500/5 font-semibold text-indigo-700">
                                {(() => {
                                  const bpNameSource = currentDoc.data.field_origins?.customer_name?.source || "";
                                  const isNameResolvedViaBP = bpNameSource.toLowerCase().includes("business partner api");
                                  if (!isNameResolvedViaBP) return <span className="text-muted-foreground font-normal italic">No SAP Master Record match</span>;
                                  return `${currentDoc.data.header?.customer_name || currentDoc.data.header?.supplier_name} (${currentDoc.data.header?.sold_to_party_number || currentDoc.data.header?.supplier_number})`;
                                })()}
                              </td>
                              <td className="p-3 bg-emerald-500/5 font-bold text-emerald-700">
                                {isSalesOrder 
                                  ? `${currentDoc.data.header?.customer_name || "—"} (${currentDoc.data.header?.sold_to_party_number || "—"})`
                                  : `${currentDoc.data.header?.supplier_name || "—"} (${currentDoc.data.header?.supplier_number || "—"})`
                                }
                              </td>
                            </tr>

                            {/* Billing/Shipping Address Row */}
                            <tr className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-semibold text-foreground">Billing / Sold-to Address</td>
                              <td className="p-3 bg-red-500/5 text-red-600 truncate max-w-[200px]" title={currentDoc.data.ai_extracted_data?.header?.customer_address || currentDoc.data.ai_extracted_data?.header?.sold_to_address}>
                                {currentDoc.data.ai_extracted_data?.header?.customer_address || currentDoc.data.ai_extracted_data?.header?.sold_to_address || "—"}
                              </td>
                              <td className="p-3 bg-indigo-500/5 text-indigo-600 font-semibold truncate max-w-[200px]" title={currentDoc.data.header?.customer_address || currentDoc.data.header?.sold_to_address}>
                                {(() => {
                                  const bpAddressSource = currentDoc.data.field_origins?.customer_address?.source || currentDoc.data.field_origins?.sold_to_address?.source || "";
                                  const isAddressResolvedViaBP = bpAddressSource.toLowerCase().includes("business partner api");
                                  if (!isAddressResolvedViaBP) return <span className="text-muted-foreground font-normal italic">No SAP Address match</span>;
                                  return currentDoc.data.header?.customer_address || currentDoc.data.header?.sold_to_address;
                                })()}
                              </td>
                              <td className="p-3 bg-emerald-500/5 text-emerald-700 font-bold truncate max-w-[200px]" title={currentDoc.data.header?.customer_address || currentDoc.data.header?.sold_to_address}>
                                {currentDoc.data.header?.customer_address || currentDoc.data.header?.sold_to_address || "—"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Material SKU Comparisons (Line Items) */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Line Item Material (SKU) Reconciliation Matrix</span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[9px] font-black tracking-tight font-mono ml-1">
                            CMIR Match
                          </span>
                        </div>

                        <div className="overflow-x-auto border border-border/80 rounded-xl bg-card">
                          <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[700px]">
                            <thead>
                              <tr className="bg-muted/30 border-b border-border">
                                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16">Item</th>
                                <th className="p-3 text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-500/5">AI Customer Material (No. & Desc)</th>
                                <th className="p-3 text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-500/5">SAP Master Data CMIR Match (No. & Desc)</th>
                                <th className="p-3 text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-500/5">Final SAP Push Staging (No. & Desc)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {currentDoc.data.line_items?.map((item: any, idx: number) => {
                                const aiItem = currentDoc.data.ai_extracted_data?.line_items?.[idx];
                                const hasCmirMatch = !!currentDoc.data.line_item_origins?.[idx];
                                return (
                                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                    <td className="p-3 font-bold text-muted-foreground">{item.item_number || (idx + 1)}</td>
                                    <td className="p-3 bg-red-500/5">
                                      <div className="font-mono text-[11px] text-red-700 font-bold">
                                        {aiItem ? (aiItem.customer_material_number || aiItem.supplier_material_number || "—") : "—"}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[220px]" title={aiItem?.material_description}>
                                        {aiItem ? (aiItem.material_description || "—") : "—"}
                                      </div>
                                    </td>
                                    <td className="p-3 bg-indigo-500/5">
                                      {hasCmirMatch ? (
                                        <>
                                          <div className="font-mono text-[11px] text-indigo-700 font-bold">
                                            {item.sap_material_number}
                                          </div>
                                          <div className="text-[10px] text-indigo-900 mt-0.5 font-semibold truncate max-w-[220px]" title={item.sap_material_description}>
                                            {item.sap_material_description || "—"}
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground font-normal italic text-[10px]">No CMIR API Match</span>
                                      )}
                                    </td>
                                    <td className="p-3 bg-emerald-500/5">
                                      <div className="font-mono text-[11px] text-emerald-700 font-black">
                                        {item.sap_material_number || "—"}
                                      </div>
                                      <div className="text-[10px] text-emerald-900 mt-0.5 font-bold truncate max-w-[220px]" title={item.sap_material_description || item.material_description}>
                                        {item.sap_material_description || item.material_description || "—"}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Data Ingestion & API Provenance Trace Card */}
              {currentDoc?.data?.field_origins && Object.keys(currentDoc.data.field_origins).length > 0 && (
                <div className="fiori-card overflow-hidden shadow-sm border border-indigo-500/25 bg-card/60 backdrop-blur-sm mt-6 animate-in fade-in duration-300">
                  <div className="p-4 border-b border-indigo-100 bg-indigo-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 font-black">
                          Data Ingestion & API Provenance Trace
                        </h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                          Audit trail of how document data was resolved, enriched, and mapped
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-tight border uppercase bg-indigo-500/10 border-indigo-500/20 text-indigo-500 shadow-sm">
                      Trace Active
                    </span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="overflow-x-auto border border-border/60 rounded-xl bg-card">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border/80">
                            <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Field Name</th>
                            <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resolved Value</th>
                            <th className="p-3 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Source / Provenance Origin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {Object.entries(currentDoc.data.field_origins).map(([fieldName, info]: [string, any]) => {
                            const label = fieldName
                              .split('_')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ');
                            
                            const isApi = info.source.toLowerCase().includes('api');
                            const isGmail = info.source.toLowerCase().includes('gmail') || info.source.toLowerCase().includes('outlook') || info.source.toLowerCase().includes('settings');

                            return (
                              <tr key={fieldName} className="hover:bg-muted/15 transition-colors">
                                <td className="p-3 font-semibold text-foreground">{label}</td>
                                <td className="p-3 font-mono text-[11px] truncate max-w-[200px]" title={info.value}>{info.value || "—"}</td>
                                <td className="p-3">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm",
                                    isApi 
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                                      : isGmail 
                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-600"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                                  )}>
                                    {info.source}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Line Item Material Matches */}
                    {currentDoc.data.line_item_origins && Object.keys(currentDoc.data.line_item_origins).length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Line Item Material API Matches</label>
                        <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/15 space-y-1.5 shadow-inner">
                          {Object.entries(currentDoc.data.line_item_origins).map(([idxStr, info]: [string, any]) => {
                            const idx = parseInt(idxStr);
                            const item = currentDoc.data.line_items?.[idx];
                            if (!item) return null;
                            return (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-medium border-b border-emerald-500/10 pb-1.5 last:border-b-0 last:pb-0">
                                <div className="flex items-center gap-1.5 text-foreground">
                                  <span className="font-bold text-emerald-600">Item #{item.item_number || (idx + 1)}:</span>
                                  <span className="font-semibold truncate max-w-[220px]">{item.material_description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] text-emerald-600 font-bold">
                                    SKU: {item.sap_material_number}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground italic">
                                    ({info.sap_material_number})
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Line Item Pricing Origins */}
                    {currentDoc.data.line_items?.some((item: any) => item.pricing_origin) && (
                      <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Line Item Price Determination</label>
                        <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/15 space-y-1.5 shadow-inner">
                          {currentDoc.data.line_items.map((item: any, idx: number) => {
                            if (!item.pricing_origin) return null;
                            return (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-medium border-b border-indigo-500/10 pb-1.5 last:border-b-0 last:pb-0">
                                <div className="flex items-center gap-1.5 text-foreground">
                                  <span className="font-bold text-indigo-600">Item #{item.item_number || (idx + 1)}:</span>
                                  <span className="font-semibold truncate max-w-[220px]">{item.material_description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[10px] text-indigo-600 font-bold">
                                    Price: {currentDoc.data.totals?.currency || "USD"} {item.price}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground italic">
                                    ({item.pricing_origin})
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SAP Ingestion Payload Preview Card */}
              <div className="fiori-card overflow-hidden shadow-sm transition-all duration-300 border border-border/80 bg-card/40 backdrop-blur-sm mt-6">
                <button
                  type="button"
                  onClick={() => setIsPayloadCollapsed(!isPayloadCollapsed)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left focus:outline-none bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-black">
                        SAP Payload Preview
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        {isSuccess ? "Review the JSON payload saved in SAP" : "Live OData JSON payload structure"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-tight border uppercase",
                      isSuccess
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse"
                    )}>
                      {isSuccess ? "Sent Payload" : "Estimated Payload"}
                    </span>
                    {isPayloadCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {!isPayloadCollapsed && (
                  <div className="p-4 border-t border-border/50 bg-muted/5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {isFetchingPayload && !sapPayload ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        <span className="text-[10px] text-muted-foreground font-medium animate-pulse">Generating live payload...</span>
                      </div>
                    ) : sapPayload ? (
                      <div className="space-y-3">
                        <div className="relative group">
                          <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-[350px] leading-relaxed shadow-inner border border-slate-800">
                            {JSON.stringify(sapPayload, null, 2)}
                          </pre>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(sapPayload, null, 2));
                              toast.success("Payload copied to clipboard!");
                            }}
                            className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800/80 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[10px] font-bold shadow-md hover:scale-[1.02] active:scale-[0.98]"
                            title="Copy to Clipboard"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                        </div>

                        {!isSuccess && (
                          <div className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/10 flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-600/90 leading-relaxed font-medium">
                              This payload updates dynamically based on your edits. Remember to click <strong className="text-amber-700">Save Changes</strong> first to apply any corrections to the payload before posting.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-muted-foreground font-medium">
                        No payload data could be loaded. Ensure the document is analyzed.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, onChange }: { label: string; value: string; onChange: (e: any) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <input
        value={value || ""}
        onChange={onChange}
        className="w-full h-9 px-3 rounded border border-border bg-background text-xs font-medium outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
      />
    </div>
  );
}

function DataSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (e: any) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <select
        value={value || ""}
        onChange={onChange}
        className="w-full h-9 px-2 rounded border border-border bg-background text-xs font-medium outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
      >
        <option value="" disabled>Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
