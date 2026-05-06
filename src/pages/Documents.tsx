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
} from "lucide-react";

import { API_BASE } from "@/config";


export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSource, setSyncSource] = useState<"Gmail" | "Outlook">("Outlook");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    
    // Auto-refresh every 10 seconds to show background processed documents
    const pollInterval = setInterval(() => {
      fetchDocs();
    }, 10000);
    
    return () => clearInterval(pollInterval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info(`Ingesting emails from ${syncSource}...`);
    try {
      // Step 1: Ingest (from selected Source to Local Folders)
      const ingestRes = await fetch(`${API_BASE}/sync/ingest?source=${syncSource}`, { method: "POST" });
      const ingestData = await ingestRes.json();
      toast.info(ingestData.message);
      
      // Refresh list immediately so user sees "Pending" docs
      await fetchDocs();
      
      // Step 2: Analyze (Local Folders to AI Extraction)
      toast.info("AI Analysis started in background...");
      const analyzeRes = await fetch(`${API_BASE}/sync/analyze`, { method: "POST" });
      const analyzeData = await analyzeRes.json();
      toast.success(analyzeData.message);
      
      // Final refresh
      fetchDocs();
    } catch (err) {
      toast.error("Sync process failed");
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
      prev.length === documents.length ? [] : documents.map((d) => d.id)
    );
  };

  const handleRowClick = (id: string) => {
    navigate(`/documents/${id}`);
  };

  return (
    <div className="fiori-page">
      <div className="flex items-center justify-between">
        <h1 className="fiori-page-title">Documents</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDocs}
            title="Refresh List"
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center">
            <select
              value={syncSource}
              onChange={(e) => setSyncSource(e.target.value as any)}
              className="h-[31px] px-2 text-xs border border-border border-r-0 rounded-l-sm bg-card hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary/20"
              disabled={isSyncing}
            >
              <option value="Gmail">Gmail</option>
              <option value="Outlook">Outlook</option>
            </select>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-r-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className={`h-3.5 w-3.5 ${isSyncing ? 'animate-bounce' : ''}`} /> 
              {isSyncing ? "Fetching..." : "Fetch Documents"}
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-border rounded hover:bg-muted transition-colors">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="fiori-card overflow-hidden">
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
                      checked={selectedRows.length === documents.length && documents.length > 0}
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th>Document ID</th>
                  <th>Context</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="group cursor-pointer hover:bg-muted/30 transition-colors"
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
                    <td className="font-medium text-primary font-mono group-hover:underline">
                      {doc.id}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-secondary text-secondary-foreground border border-border">
                        {doc.data.header?.context || "Invoice"}
                      </span>
                    </td>
                    <td>
                      {doc.data.header?.supplier_name || "Unknown"}
                    </td>
                    <td className="font-medium text-foreground">
                      {doc.data.totals?.currency} {doc.data.totals?.total_amount}
                    </td>
                    <td className="text-muted-foreground">
                      {doc.data.header?.invoice_date || doc.data.header?.po_date || "—"}
                    </td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Mail className="h-8 w-8 opacity-20" />
                        <p>No documents found. Fetch documents to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
          <span className="text-xs text-muted-foreground">Showing {documents.length} documents</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">Previous</button>
            <button className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground font-bold">1</button>
            <button className="px-2.5 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
