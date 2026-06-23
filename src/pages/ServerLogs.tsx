import { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, ShieldAlert, AlertTriangle, Info, Play, Pause, Trash2, Search, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config";

export default function ServerLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isLive) {
      const es = new EventSource(`${API_BASE}/logs/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const newLog = JSON.parse(event.data);
          setLogs((prev) => [...prev, newLog]);
        } catch (err) {
          console.error("Error parsing log event:", err);
        }
      };

      es.onerror = () => {
        console.error("SSE connection error. Reconnecting...");
      };

      return () => {
        es.close();
      };
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  }, [isLive]);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    const text = `${log.timestamp} ${log.level} ${log.message}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const getLogLevelIcon = (level: string) => {
    switch (level?.toUpperCase()) {
      case "ERROR":
        return <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0" />;
      case "WARNING":
        return <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
      default:
        return <Info className="h-4.5 w-4.5 text-blue-400 shrink-0" />;
    }
  };

  const infoCount = logs.filter(l => l.level?.toUpperCase() === "INFO").length;
  const warningCount = logs.filter(l => l.level?.toUpperCase() === "WARNING" || l.level?.toUpperCase() === "WARN").length;
  const errorCount = logs.filter(l => l.level?.toUpperCase() === "ERROR").length;

  return (
    <div className="fiori-page flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <TerminalIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Live Server Logs</h1>
            <p className="text-xs text-slate-400 mt-0.5">Real-time system events stream from EC2 application logs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Play Streaming */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm border",
              isLive 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            {isLive ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause Streaming
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Resume Streaming
              </>
            )}
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Console
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/50 shrink-0 text-center py-2.5">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">System Events</span>
          <div className="text-sm font-mono font-bold text-blue-400 mt-0.5">{infoCount}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Warnings</span>
          <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">{warningCount}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Errors</span>
          <div className="text-sm font-mono font-bold text-red-500 mt-0.5">{errorCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0 gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter logs by level or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-800 rounded bg-slate-950 text-slate-200 outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
          />
        </div>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded border transition-all active:scale-95",
            autoScroll
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300"
          )}
        >
          <ArrowDown className={cn("h-3.5 w-3.5", autoScroll && "animate-bounce")} /> Auto-Scroll
        </button>
      </div>

      {/* Terminal Display */}
      <div className="flex-1 p-5 overflow-y-auto font-mono text-xs leading-relaxed bg-slate-950 select-text space-y-2">
        {filteredLogs.map((log, index) => (
          <div 
            key={index} 
            className={cn(
              "flex items-start gap-3 p-1.5 rounded transition-all hover:bg-slate-900/40",
              log.level?.toUpperCase() === "ERROR" && "bg-red-500/5 border-l-2 border-red-500",
              log.level?.toUpperCase() === "WARNING" && "bg-amber-500/5 border-l-2 border-amber-500",
              (log.level?.toUpperCase() === "INFO" || !log.level) && "border-l-2 border-transparent"
            )}
          >
            {getLogLevelIcon(log.level)}
            <span className="text-[10px] text-slate-500 select-none shrink-0 mt-0.5">{log.timestamp || "—"}</span>
            <span 
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 uppercase tracking-tight leading-none mt-0.5",
                log.level?.toUpperCase() === "ERROR" && "bg-red-500/20 text-red-400 border border-red-500/30",
                log.level?.toUpperCase() === "WARNING" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                (log.level?.toUpperCase() === "INFO" || !log.level) && "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              )}
            >
              {log.level || "INFO"}
            </span>
            <span 
              className={cn(
                "flex-1 break-all whitespace-pre-wrap mt-0.5",
                log.level?.toUpperCase() === "ERROR" && "text-red-300",
                log.level?.toUpperCase() === "WARNING" && "text-amber-200/90",
                (log.level?.toUpperCase() === "INFO" || !log.level) && "text-slate-300"
              )}
            >
              {log.message}
            </span>
          </div>
        ))}
        
        {filteredLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center space-y-2">
            <TerminalIcon className="h-8 w-8 opacity-25" />
            <p className="text-xs">No logs matches the search filter.</p>
          </div>
        )}

        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
