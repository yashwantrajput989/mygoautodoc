import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  X,
  Mail,
  Clock,
  User,
  Paperclip,
  Trash2,
  RotateCcw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE } from "@/config";

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <span className="text-muted-foreground/30 text-[9px] ml-1">▲▼</span>;
  return direction === "asc" ? <span className="text-primary text-[10px] ml-1">▲</span> : <span className="text-primary text-[10px] ml-1">▼</span>;
}

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sapErrorDoc, setSapErrorDoc] = useState<any>(null);

  const getContextLabel = (doc: any) => {
    const rawContext = doc.data?.email_metadata?.expected_doc_type || doc.data?.header?.context || "Vendor Invoice";
    if (rawContext === "Invoice" || rawContext === "Supplier Invoice" || rawContext === "Vendor Invoice") {
      return "Vendor Invoice";
    }
    if (rawContext === "Sales Order") {
      return "Sales Order";
    }
    return rawContext;
  };

  const getDisplayDate = (doc: any) => {
    if (showDeleted) {
      const delDate = doc.deleted_at || doc.data?.deleted_at;
      if (delDate) {
        try {
          const d = new Date(delDate);
          if (!isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10) + " " + d.toTimeString().slice(0, 5);
          }
        } catch {}
        return delDate;
      }
    }
    const emailDate = doc.data?.email_metadata?.received_at || doc.data?.email_metadata?.date;
    if (emailDate) {
      try {
        const d = new Date(emailDate);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
      } catch (e) {
        // ignore
      }
      return emailDate;
    }
    return doc.data?.header?.invoice_date || doc.data?.header?.po_date || "—";
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSortBySelect = (val: string) => {
    if (val === "newest") {
      setSortColumn("date");
      setSortDirection("desc");
    } else if (val === "oldest") {
      setSortColumn("date");
      setSortDirection("asc");
    } else if (val === "atoz_supplier") {
      setSortColumn("supplier");
      setSortDirection("asc");
    } else if (val === "atoz_id") {
      setSortColumn("id");
      setSortDirection("asc");
    }
  };

  const getSortByValue = () => {
    if (sortColumn === "date" && sortDirection === "desc") return "newest";
    if (sortColumn === "date" && sortDirection === "asc") return "oldest";
    if (sortColumn === "supplier" && sortDirection === "asc") return "atoz_supplier";
    if (sortColumn === "id" && sortDirection === "asc") return "atoz_id";
    return "custom";
  };

  const fetchDocs = async (isDeletedMode = showDeleted) => {
    try {
      const url = isDeletedMode ? `${API_BASE}/documents/deleted` : `${API_BASE}/documents`;
      const res = await fetch(url);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs(showDeleted);
    
    const pollInterval = setInterval(() => {
      fetchDocs(showDeleted);
    }, 10000);
    
    return () => clearInterval(pollInterval);
  }, [showDeleted]);

  const handleToggleDeleted = () => {
    const nextMode = !showDeleted;
    setShowDeleted(nextMode);
    setSelectedRows([]);
    setIsLoading(true);
    fetchDocs(nextMode);
  };

  const handleSync = async () => {
    if (showDeleted) return; // Disable sync in recycle bin
    setIsSyncing(true);
    toast.loading("Syncing and analyzing documents from configured sources...", { id: "sync-doc" });
    try {
      const res = await fetch(`${API_BASE}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Sync and Ingestion complete!", { id: "sync-doc" });
        fetchDocs(false);
      } else {
        toast.error(data.detail || "Sync process failed", { id: "sync-doc" });
      }
    } catch (err) {
      toast.error("Sync process failed", { id: "sync-doc" });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedRows((prev) =>
      prev.length === sortedAndFilteredDocs.length ? [] : sortedAndFilteredDocs.map((d) => d.id)
    );
  };

  const handleRowClick = (id: string) => {
    if (showDeleted) return; // Disable detail view in recycle bin
    navigate(`/documents/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to move document ${id} to Recycle Bin?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || `Document ${id} moved to Recycle Bin`);
        setSelectedRows((prev) => prev.filter((r) => r !== id));
        fetchDocs();
      } else {
        toast.error(data.error || "Failed to delete document");
      }
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}/restore`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Document ${id} successfully restored.`);
        setSelectedRows((prev) => prev.filter((r) => r !== id));
        fetchDocs();
      } else {
        toast.error(data.error || "Failed to restore document");
      }
    } catch (err) {
      toast.error("Failed to restore document");
    }
  };

  const handleReparse = async (id: string) => {
    toast.loading(`Re-parsing document ${id}...`, { id: `reparse-${id}` });
    try {
      const res = await fetch(`${API_BASE}/documents/${id}/reparse`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Document re-parsed successfully!", { id: `reparse-${id}` });
        fetchDocs();
      } else {
        toast.error(data.message || data.error || "Failed to re-parse document", { id: `reparse-${id}` });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to backend", { id: `reparse-${id}` });
    }
  };

  const handleDeletePermanently = async (id: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete document ${id}? This action CANNOT be undone.`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/documents/${id}?force=true`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Document ${id} permanently deleted.`);
        setSelectedRows((prev) => prev.filter((r) => r !== id));
        fetchDocs();
      } else {
        toast.error(data.error || "Failed to permanently delete document");
      }
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to move the ${selectedRows.length} selected documents to Recycle Bin?`)) return;
    
    toast.loading(`Moving ${selectedRows.length} documents to Recycle Bin...`, { id: "bulk-delete" });
    try {
      let successCount = 0;
      for (const id of selectedRows) {
        const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      
      toast.success(`Successfully moved ${successCount} documents to Recycle Bin`, { id: "bulk-delete" });
      setSelectedRows([]);
      fetchDocs();
    } catch (err) {
      toast.error("Bulk delete process failed", { id: "bulk-delete" });
    }
  };

  const handleBulkRestore = async () => {
    if (!confirm(`Restore the ${selectedRows.length} selected documents?`)) return;
    
    toast.loading(`Restoring ${selectedRows.length} documents...`, { id: "bulk-restore" });
    try {
      let successCount = 0;
      for (const id of selectedRows) {
        const res = await fetch(`${API_BASE}/documents/${id}/restore`, { method: "POST" });
        if (res.ok) successCount++;
      }
      toast.success(`Successfully restored ${successCount} documents`, { id: "bulk-restore" });
      setSelectedRows([]);
      fetchDocs();
    } catch (err) {
      toast.error("Bulk restore process failed", { id: "bulk-restore" });
    }
  };

  const handleBulkDeletePermanently = async () => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete the ${selectedRows.length} selected documents? This cannot be undone.`)) return;
    
    toast.loading(`Permanently deleting ${selectedRows.length} documents...`, { id: "bulk-delete-perm" });
    try {
      let successCount = 0;
      for (const id of selectedRows) {
        const res = await fetch(`${API_BASE}/documents/${id}?force=true`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      toast.success(`Successfully permanently deleted ${successCount} documents`, { id: "bulk-delete-perm" });
      setSelectedRows([]);
      fetchDocs();
    } catch (err) {
      toast.error("Bulk permanent delete process failed", { id: "bulk-delete-perm" });
    }
  };

  const getAmountValue = (doc: any) => {
    return parseFloat(doc.data?.totals?.total_amount) || 0;
  };

  const getDocDate = (doc: any) => {
    if (showDeleted) {
      const delDate = doc.deleted_at || doc.data?.deleted_at;
      if (delDate) {
        const parsed = Date.parse(delDate);
        if (!isNaN(parsed)) return parsed;
      }
    }
    const emailDate = doc.data?.email_metadata?.received_at || doc.data?.email_metadata?.date;
    if (emailDate) {
      const parsed = Date.parse(emailDate);
      if (!isNaN(parsed)) return parsed;
    }
    const dateStr = doc.data?.header?.invoice_date || doc.data?.header?.po_date || "";
    if (!dateStr) return 0;
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    const idMatch = doc.id.toLowerCase().includes(query);
    const hrIdMatch = (doc.data?.human_readable_id || "").toLowerCase().includes(query);
    const supplierMatch = (doc.data?.header?.supplier_name || "").toLowerCase().includes(query);
    const contextMatch = (doc.data?.header?.context || "").toLowerCase().includes(query);
    const subjectMatch = (doc.data?.email_metadata?.subject || "").toLowerCase().includes(query);
    return idMatch || hrIdMatch || supplierMatch || contextMatch || subjectMatch;
  });

  const sortedAndFilteredDocs = [...filteredDocs].sort((a, b) => {
    let comparison = 0;
    if (sortColumn === "id") {
      comparison = a.id.localeCompare(b.id);
    } else if (sortColumn === "context") {
      comparison = getContextLabel(a).localeCompare(getContextLabel(b));
    } else if (sortColumn === "supplier") {
      comparison = (a.data?.header?.supplier_name || "").localeCompare(b.data?.header?.supplier_name || "");
    } else if (sortColumn === "amount") {
      comparison = getAmountValue(a) - getAmountValue(b);
    } else if (sortColumn === "date") {
      comparison = getDocDate(a) - getDocDate(b);
    } else if (sortColumn === "sap_doc") {
      const aVal = a.data?.sap_document_number || a.sap_document_number || "";
      const bVal = b.data?.sap_document_number || b.sap_document_number || "";
      comparison = aVal.localeCompare(bVal);
    } else if (sortColumn === "status") {
      comparison = (a.status || "").localeCompare(b.status || "");
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="fiori-page">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="fiori-page-title">{showDeleted ? "Recycle Bin" : "Documents"}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!showDeleted && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              title="Refresh and Sync Documents"
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-all flex items-center justify-center bg-card border border-border shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </button>
          )}
          
          <button 
            onClick={handleToggleDeleted}
            title={showDeleted ? "Show Active Documents" : "Show Recycle Bin"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border rounded-lg transition-all active:scale-95 shadow-sm",
              showDeleted 
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/95"
                : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 hover:text-destructive-foreground hover:border-destructive"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {showDeleted ? "Active Documents" : "Deleted Documents"}
          </button>

          {selectedRows.length > 0 && (
            showDeleted ? (
              <div className="flex gap-2">
                <button
                  onClick={handleBulkRestore}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all active:scale-95 shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore ({selectedRows.length})
                </button>
                <button
                  onClick={handleBulkDeletePermanently}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-destructive text-destructive-foreground rounded hover:shadow-md transition-all active:scale-95 shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Permanently ({selectedRows.length})
                </button>
              </div>
            ) : (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-destructive text-destructive-foreground rounded hover:shadow-md transition-all active:scale-95 shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedRows.length})
              </button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <div className="fiori-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, supplier, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort By:</span>
            <select
              value={getSortByValue()}
              onChange={(e) => handleSortBySelect(e.target.value)}
              className="h-[31px] px-2 text-xs border border-border rounded bg-card hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="newest">Newest to Oldest</option>
              <option value="oldest">Oldest to Newest</option>
              <option value="atoz_supplier">A to Z (Supplier)</option>
              <option value="atoz_id">A to Z (Doc ID)</option>
              <option value="custom" disabled>Custom Sort</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading documents...</div>
          ) : (
            <table className="fiori-smart-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === sortedAndFilteredDocs.length && sortedAndFilteredDocs.length > 0}
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th onClick={() => handleSort("id")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>Document ID</span>
                      <SortIcon active={sortColumn === "id"} direction={sortDirection} />
                    </div>
                  </th>
                  <th onClick={() => handleSort("context")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>Context</span>
                      <SortIcon active={sortColumn === "context"} direction={sortDirection} />
                    </div>
                  </th>
                  <th onClick={() => handleSort("supplier")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>Supplier</span>
                      <SortIcon active={sortColumn === "supplier"} direction={sortDirection} />
                    </div>
                  </th>
                  <th onClick={() => handleSort("amount")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <SortIcon active={sortColumn === "amount"} direction={sortDirection} />
                    </div>
                  </th>
                  <th onClick={() => handleSort("date")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>{showDeleted ? "Deleted On" : "Date"}</span>
                      <SortIcon active={sortColumn === "date"} direction={sortDirection} />
                    </div>
                  </th>
                  <th onClick={() => handleSort("sap_doc")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>SAP Doc #</span>
                      <SortIcon active={sortColumn === "sap_doc"} direction={sortDirection} />
                    </div>
                  </th>
                  <th onClick={() => handleSort("status")} className="cursor-pointer select-none hover:bg-muted/50 p-3">
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                    </div>
                  </th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      "group transition-colors",
                      showDeleted ? "cursor-default" : "cursor-pointer hover:bg-muted/30"
                    )}
                    onClick={() => handleRowClick(doc.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(doc.id)}
                        onChange={() => toggleRow(doc.id)}
                        className="rounded border-border cursor-pointer"
                      />
                    </td>
                    <td className={cn("font-medium font-mono", showDeleted ? "text-foreground" : "text-primary group-hover:underline")}>
                      {doc.data?.human_readable_id || doc.id}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-secondary text-secondary-foreground border border-border">
                        {getContextLabel(doc)}
                      </span>
                    </td>
                    <td>
                      {doc.data.header?.supplier_name || "Unknown"}
                    </td>
                    <td className="font-medium text-foreground">
                      {doc.data.totals?.currency} {doc.data.totals?.total_amount}
                    </td>
                    <td className="text-muted-foreground">
                      {getDisplayDate(doc)}
                    </td>
                    <td className="font-mono text-xs font-semibold text-foreground">
                      {doc.data?.sap_document_number || doc.sap_document_number || "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={doc.status} />
                        {(doc.status === 'failed' || doc.status === 'error') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSapErrorDoc(doc);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all active:scale-[0.9] inline-flex items-center justify-center animate-in fade-in zoom-in duration-200"
                            title="Show SAP failure details"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      {showDeleted ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRestore(doc.id)}
                            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-primary/10 transition-colors"
                            title="Restore Document"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePermanently(doc.id)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {doc.status === 'failed_parsing' && (
                            <button
                              onClick={() => handleReparse(doc.id)}
                              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded border border-amber-500/20 transition-all active:scale-95 shadow-sm"
                              title="Retry AI Parse"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Reparse</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedAndFilteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Mail className="h-8 w-8 opacity-20" />
                        <p>
                          {showDeleted 
                            ? "Recycle Bin is empty." 
                            : documents.length === 0 
                              ? "No documents found. Refresh to get started." 
                              : "No documents match your search criteria."
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
          <span className="text-xs text-muted-foreground">Showing {sortedAndFilteredDocs.length} of {documents.length} documents</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">Previous</button>
            <button className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground font-bold">1</button>
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      </div>

      {sapErrorDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSapErrorDoc(null)}>
          <div 
            className="bg-card rounded-lg border border-border shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border bg-destructive/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-destructive" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-destructive">
                  SAP Posting Failure Details
                </h2>
              </div>
              <button
                onClick={() => setSapErrorDoc(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">Document ID:</span>
                <span className="col-span-2 font-mono font-medium text-foreground">
                  {sapErrorDoc.data?.human_readable_id || sapErrorDoc.id}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">Supplier:</span>
                <span className="col-span-2 font-medium text-foreground">
                  {sapErrorDoc.data?.header?.supplier_name || sapErrorDoc.data?.header?.customer_name || "Unknown"}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="font-semibold text-muted-foreground block">Error Message:</span>
                <div className="bg-destructive/5 border border-destructive/20 text-destructive p-4 rounded-md font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                  {sapErrorDoc.data?.sap_error || sapErrorDoc.data?.error || sapErrorDoc.data?.exceptions || "An unknown error occurred during SAP posting."}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end">
              <button
                onClick={() => setSapErrorDoc(null)}
                className="px-4 py-2 text-xs font-bold bg-card border border-border rounded hover:bg-muted transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
