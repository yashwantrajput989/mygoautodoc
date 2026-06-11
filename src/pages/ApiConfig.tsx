import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Globe,
  Shield,
  Activity,
  Search,
  Edit3,
  CheckCircle,
  AlertTriangle,
  X,
  Key,
  Lock,
  User as UserIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Save,
  ArrowLeftRight,
  Shuffle,
  Link,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/config";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

interface ApiConfigItem {
  id: number;
  name: string;
  endpoint: string;
  auth_type: string;
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
  key_name?: string;
  key_value?: string;
  oauth_token_url?: string;
  status: string;
  created_at: string;
}

const DEFAULT_SALES_ORDER_MAPPINGS = [
  { sourceField: "sold_to_party_number", targetField: "SoldToParty" },
  { sourceField: "customer_name", targetField: "CustomerName" },
  { sourceField: "ship_to_party_number", targetField: "ShipToParty" },
  { sourceField: "requested_date", targetField: "RequestedDeliveryDate" },
  { sourceField: "order_received_date", targetField: "SalesOrderDate" },
  { sourceField: "customer_po_number", targetField: "PurchaseOrderByCustomer" },
  { sourceField: "material_description", targetField: "SalesOrderItemText" },
  { sourceField: "quantity", targetField: "RequestedQuantity" },
  { sourceField: "price", targetField: "NetUnitPrice" },
  { sourceField: "total_amount", targetField: "TotalNetAmount" },
];

const DEFAULT_VENDOR_INVOICE_MAPPINGS = [
  { sourceField: "supplier_number", targetField: "Supplier" },
  { sourceField: "supplier_name", targetField: "SupplierName" },
  { sourceField: "invoice_date", targetField: "DocumentDate" },
  { sourceField: "invoice_reference", targetField: "SupplierInvoiceIDByInvcgParty" },
  { sourceField: "po_number", targetField: "PurchaseOrder" },
  { sourceField: "total_amount", targetField: "GrossAmount" },
];

export default function ApiConfig() {
  const [apis, setApis] = useState<ApiConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  // Live BTP Explorer State
  const [btpData, setBtpData] = useState<any[]>([]);
  const [isFetchingBtp, setIsFetchingBtp] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeConfigName, setActiveConfigName] = useState("");
  const [activeEndpoint, setActiveEndpoint] = useState("");

  // Per-connection Schema Mapping State (collapsed inside adding page)
  const [formContext, setFormContext] = useState<"SalesOrder" | "VendorInvoice">("SalesOrder");
  const [formMappings, setFormMappings] = useState<{ sourceField: string; targetField: string }[]>([]);
  const [isMappingExpanded, setIsMappingExpanded] = useState(false);
  const [fetchedTargetFields, setFetchedTargetFields] = useState<any[] | null>(null);
  const [isFetchingSchema, setIsFetchingSchema] = useState(false);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; id: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "explorer">("catalog");

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formAuthType, setFormAuthType] = useState("None");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formKeyValue, setFormKeyValue] = useState("");
  const [formOauthTokenUrl, setFormOauthTokenUrl] = useState("");

  const fetchApis = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api-configs`);
      if (!res.ok) throw new Error("Failed to fetch API catalog");
      const data = await res.json();
      setApis(data);
    } catch (err) {
      toast.error("Failed to load API catalog");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveSalesOrders = async () => {
    setIsFetchingBtp(true);
    const toastId = toast.loading("Connecting to SAP BTP and fetching live Sales Orders...");
    try {
      const res = await fetch(`${API_BASE}/sap-btp/sales-orders`);
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Successfully fetched Sales Orders from SAP BTP!", { id: toastId });
        setBtpData(data.data?.value || data.data || []);
        setActiveConfigName(data.configName || "");
        setActiveEndpoint(data.endpoint || "");
      } else {
        toast.error(data.error || "Failed to fetch live Sales Orders", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Error connecting to server to fetch BTP Sales Orders", { id: toastId });
    } finally {
      setIsFetchingBtp(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormEndpoint("");
    setFormAuthType("None");
    setFormClientId("");
    setFormClientSecret("");
    setFormUsername("");
    setFormPassword("");
    setFormKeyName("");
    setFormKeyValue("");
    setFormOauthTokenUrl("");
    setFormContext("SalesOrder");
    setFormMappings(DEFAULT_SALES_ORDER_MAPPINGS);
    setIsMappingExpanded(false);
    setFetchedTargetFields(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (api: ApiConfigItem) => {
    setEditingId(api.id);
    setFormName(api.name);
    setFormEndpoint(api.endpoint);
    setFormAuthType(api.auth_type);
    setFormClientId(api.client_id || "");
    setFormClientSecret(api.client_secret || "");
    setFormUsername(api.username || "");
    setFormPassword(api.password || "");
    setFormKeyName(api.key_name || "");
    setFormKeyValue(api.key_value || "");
    setFormOauthTokenUrl(api.oauth_token_url || "");
    
    const contextVal = (api.context || "SalesOrder") as "SalesOrder" | "VendorInvoice";
    setFormContext(contextVal);
    setFormMappings(api.mappings || (contextVal === "VendorInvoice" ? DEFAULT_VENDOR_INVOICE_MAPPINGS : DEFAULT_SALES_ORDER_MAPPINGS));
    setIsMappingExpanded(false);
    setFetchedTargetFields(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this API configuration?")) return;
    try {
      const res = await fetch(`${API_BASE}/api-configs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("API deleted successfully");
        fetchApis();
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      toast.error("Failed to delete API");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEndpoint.trim()) {
      toast.error("Name and Endpoint URL are required");
      return;
    }

    if (!formMappings || formMappings.length === 0) {
      toast.error("Field mappings are mandatory to save the API connection. Please expand the 'Field Mappings' section and configure them.");
      return;
    }

    const payload = {
      name: formName,
      endpoint: formEndpoint,
      auth_type: formAuthType,
      client_id: formClientId,
      client_secret: formClientSecret,
      username: formUsername,
      password: formPassword,
      key_name: formKeyName,
      key_value: formKeyValue,
      oauth_token_url: formOauthTokenUrl,
      context: formContext,
      mappings: formMappings
    };

    try {
      const url = editingId 
        ? `${API_BASE}/api-configs/${editingId}`
        : `${API_BASE}/api-configs`;
      
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingId ? "API updated successfully" : "API added successfully");
        setIsModalOpen(false);
        fetchApis();
      } else {
        throw new Error("Save failed");
      }
    } catch (err) {
      toast.error("Failed to save API configuration");
    }
  };

  const handleTestConnection = async (api: ApiConfigItem) => {
    setIsTesting(api.id);
    try {
      const res = await fetch(`${API_BASE}/api-configs/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: api.id,
          endpoint: api.endpoint,
          auth_type: api.auth_type,
          oauth_token_url: api.oauth_token_url,
          client_id: api.client_id,
          client_secret: api.client_secret,
          username: api.username,
          password: api.password,
          key_name: api.key_name,
          key_value: api.key_value
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Connection successful! URL returned status ${data.statusCode}`);
      } else {
        toast.error(`Connection failed: ${data.message}`);
      }
    } catch (err) {
      toast.error("Failed to test connection");
    } finally {
      setIsTesting(null);
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredApis = apis.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mappings visual updates
  const calculateLines = () => {
    if (!containerRef.current || !isModalOpen || !isMappingExpanded) {
      setLines([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const activeMappings = formMappings || [];
    const newLines: any[] = [];

    activeMappings.forEach((m) => {
      const srcEl = document.getElementById(`dot-src-${m.sourceField}`);
      const tgtEl = document.getElementById(`dot-tgt-${m.targetField}`);
      if (srcEl && tgtEl) {
        const srcRect = srcEl.getBoundingClientRect();
        const tgtRect = tgtEl.getBoundingClientRect();

        newLines.push({
          x1: srcRect.left - containerRect.left + srcRect.width / 2,
          y1: srcRect.top - containerRect.top + srcRect.height / 2,
          x2: tgtRect.left - containerRect.left + tgtRect.width / 2,
          y2: tgtRect.top - containerRect.top + tgtRect.height / 2,
          id: `${m.sourceField}-${m.targetField}`
        });
      }
    });
    setLines(newLines);
  };

  useEffect(() => {
    calculateLines();
    window.addEventListener("resize", calculateLines);
    
    // A small timeout helps render coordinates correctly after DOM adjustments
    const t = setTimeout(calculateLines, 200);

    return () => {
      window.removeEventListener("resize", calculateLines);
      clearTimeout(t);
    };
  }, [formMappings, formContext, isMappingExpanded, isModalOpen]);

  const handleSourceClick = (srcId: string) => {
    if (selectedSource === srcId) {
      setSelectedSource(null);
    } else {
      setSelectedSource(srcId);
      toast.info(`Selected source "${srcId}". Select target field next.`);
    }
  };

  const handleTargetClick = (tgtId: string) => {
    if (!selectedSource) {
      toast.warning("Select an Extracted Field first before mapping.");
      return;
    }

    const currentTypeMappings = formMappings || [];
    // Remove any existing mappings for this target or source to prevent multi-mappings
    const filtered = currentTypeMappings.filter(
      (m) => m.targetField !== tgtId && m.sourceField !== selectedSource
    );

    const updated = [...filtered, { sourceField: selectedSource, targetField: tgtId }];
    setFormMappings(updated);
    setSelectedSource(null);
    toast.success(`Mapped "${selectedSource}" to "${tgtId}"`);
  };

  const handleDisconnect = (srcId: string, tgtId: string) => {
    const currentTypeMappings = formMappings || [];
    const updated = currentTypeMappings.filter(
      (m) => !(m.sourceField === srcId && m.targetField === tgtId)
    );
    setFormMappings(updated);
    toast.success(`Disconnected mapping`);
  };

  const handleResetDefaults = () => {
    setFormMappings(formContext === "SalesOrder" ? DEFAULT_SALES_ORDER_MAPPINGS : DEFAULT_VENDOR_INVOICE_MAPPINGS);
    setSelectedSource(null);
    toast.success(`Mappings reset to defaults`);
  };

  const handleClearAll = () => {
    setFormMappings([]);
    setSelectedSource(null);
    toast.success(`All active mappings cleared`);
  };

  const handleFetchSchema = async () => {
    if (!formEndpoint.trim()) {
      toast.error("Endpoint URL is required to fetch schema");
      return;
    }
    setIsFetchingSchema(true);
    const toastId = toast.loading("Connecting to API endpoint and fetching schema fields...");
    try {
      const res = await fetch(`${API_BASE}/api-configs/fetch-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: formEndpoint,
          auth_type: formAuthType,
          oauth_token_url: formOauthTokenUrl,
          client_id: formClientId,
          client_secret: formClientSecret,
          username: formUsername,
          password: formPassword,
          key_name: formKeyName,
          key_value: formKeyValue
        })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(`Successfully fetched ${data.fields.length} fields from endpoint!`, { id: toastId });
        setFetchedTargetFields(data.fields);
      } else {
        toast.error(data.message || "Failed to fetch schema fields. Falling back to default schema.", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Error connecting to server to fetch schema. Falling back to default schema.", { id: toastId });
    } finally {
      setIsFetchingSchema(false);
      setTimeout(calculateLines, 100);
    }
  };

  // Metadata arrays matching sheet columns
  const SALES_ORDER_SOURCE = {
    Header: [
      { id: "sold_to_party_number", label: "Sold to Party Number", desc: "Customer ID number" },
      { id: "customer_name", label: "Customer Name", desc: "Name of customer organization" },
      { id: "ship_to_party_number", label: "Ship to Party number", desc: "Shipment delivery target" },
      { id: "requested_date", label: "Requested Date", desc: "PO Requested delivery date" },
      { id: "order_received_date", label: "Order received date", desc: "Date email order received" },
      { id: "payment_terms", label: "Payment terms", desc: "Invoice payment terms" },
      { id: "inco_terms", label: "Inco terms", desc: "Shipping delivery incoterms" },
      { id: "customer_po_number", label: "Customer PO number", desc: "PO reference key" }
    ],
    Item: [
      { id: "item_number", label: "Item number", desc: "Order line item index" },
      { id: "customer_material_number", label: "Customer Material Number", desc: "Buyer specific SKU" },
      { id: "material_description", label: "Material Description", desc: "Extracted line text" },
      { id: "sap_material_number", label: "SAP Material number", desc: "Mapped SAP SKU" },
      { id: "quantity", label: "Quantity", desc: "Line item quantity" },
      { id: "unit_of_measure", label: "Unit of measure", desc: "UoM e.g. EA, PC" },
      { id: "price", label: "Price", desc: "Unit item price" },
      { id: "amount", label: "Amount", desc: "Line total net amount" },
      { id: "tax", label: "Tax", desc: "Line tax amount" }
    ],
    Footer: [
      { id: "total_amount", label: "Total Amount", desc: "Header gross total" },
      { id: "total_taxes", label: "Total Taxes", desc: "Summed tax values" }
    ],
    Exceptions: [
      { id: "exceptions", label: "Exceptions", desc: "Extraction exception log" }
    ]
  };

  const SALES_ORDER_TARGET = {
    Header: [
      { id: "SoldToParty", label: "SoldToParty (ID)", desc: "SAP Partner Function Sold-To" },
      { id: "CustomerName", label: "CustomerName (Text)", desc: "SAP customer description" },
      { id: "ShipToParty", label: "ShipToParty (ID)", desc: "SAP Partner Function Ship-To" },
      { id: "RequestedDeliveryDate", label: "RequestedDeliveryDate (Date)", desc: "Required shipment date" },
      { id: "SalesOrderDate", label: "SalesOrderDate (Date)", desc: "Sales order create date" },
      { id: "PaymentTerms", label: "PaymentTerms (Code)", desc: "SAP terms of payment" },
      { id: "Incoterms", label: "Incoterms (Code)", desc: "SAP delivery incoterms" },
      { id: "PurchaseOrderByCustomer", label: "PurchaseOrderByCustomer (Ref)", desc: "Customer reference PO number" }
    ],
    Item: [
      { id: "SalesOrderItem", label: "SalesOrderItem (Item)", desc: "Sales order line item" },
      { id: "Material", label: "Material (ID)", desc: "SAP Material master identifier" },
      { id: "MaterialByCustomer", label: "MaterialByCustomer (Text)", desc: "Buyer internal SKU reference" },
      { id: "SalesOrderItemText", label: "SalesOrderItemText (Text)", desc: "Line item text description" },
      { id: "RequestedQuantity", label: "RequestedQuantity (Qty)", desc: "Target sales order quantity" },
      { id: "RequestedQuantityUnit", label: "RequestedQuantityUnit (UoM)", desc: "SAP UoM code key" },
      { id: "NetUnitPrice", label: "NetUnitPrice (Price)", desc: "Net single unit price" },
      { id: "NetAmount", label: "NetAmount (Amt)", desc: "SAP item net value" },
      { id: "TaxAmount", label: "TaxAmount (Amt)", desc: "SAP item tax value" }
    ],
    Footer: [
      { id: "TotalNetAmount", label: "TotalNetAmount (Amt)", desc: "Header aggregate net total" },
      { id: "TotalTaxAmount", label: "TotalTaxAmount (Amt)", desc: "Header aggregate tax total" }
    ],
    Exceptions: [
      { id: "ExceptionStatus", label: "ExceptionStatus (Code)", desc: "API validation state flags" }
    ]
  };

  const VENDOR_INVOICE_SOURCE = {
    Header: [
      { id: "supplier_number", label: "Supplier Number", desc: "SAP Supplier account key" },
      { id: "supplier_name", label: "Supplier Name", desc: "Invoiced supplier organization" },
      { id: "invoice_date", label: "Invoice Date", desc: "Issue date on document" },
      { id: "invoice_reference", label: "Invoice Reference", desc: "Document invoice number" },
      { id: "po_number", label: "PO Number", desc: "Purchase order matches key" },
      { id: "po_type", label: "PO Type PO/Non-PO", desc: "Invoice categorizations flag" }
    ],
    Item: [
      { id: "item_number", label: "Item number", desc: "Invoice line item index" },
      { id: "supplier_material_number", label: "Supplier Material Number", desc: "Vendor specific SKU" },
      { id: "material_description", label: "Material Description", desc: "Extracted line text" },
      { id: "sap_material_number", label: "SAP Material number", desc: "Mapped SAP SKU" },
      { id: "quantity", label: "Quantity", desc: "Line item quantity" },
      { id: "unit_of_measure", label: "Unit of measure", desc: "UoM e.g. EA, PC" },
      { id: "price", label: "Price", desc: "Unit item price" },
      { id: "amount", label: "Amount", desc: "Line total net amount" },
      { id: "tax", label: "Tax", desc: "Line tax amount" }
    ],
    Footer: [
      { id: "total_amount", label: "Total Amount", desc: "Header gross total" },
      { id: "total_taxes", label: "Total Taxes", desc: "Summed tax values" }
    ],
    Exceptions: [
      { id: "exceptions", label: "Exceptions", desc: "Extraction exception log" }
    ]
  };

  const VENDOR_INVOICE_TARGET = {
    Header: [
      { id: "Supplier", label: "Supplier (ID)", desc: "SAP Creditor account number" },
      { id: "SupplierName", label: "SupplierName (Text)", desc: "SAP Supplier name text" },
      { id: "DocumentDate", label: "DocumentDate (Date)", desc: "Supplier invoice issue date" },
      { id: "SupplierInvoiceIDByInvcgParty", label: "SupplierInvoiceIDByInvcgParty (Ref)", desc: "Reference invoice number" },
      { id: "PurchaseOrder", label: "PurchaseOrder (Ref)", desc: "Matching SAP purchase order key" },
      { id: "InvoiceType", label: "InvoiceType (Code)", desc: "Invoice/Credit memo categories" }
    ],
    Item: [
      { id: "SupplierInvoiceItem", label: "SupplierInvoiceItem (Item)", desc: "Invoice item line sequence" },
      { id: "PurchaseOrderItem", label: "PurchaseOrderItem (Item)", desc: "Related purchase order line item" },
      { id: "Material", label: "Material (ID)", desc: "SAP Material master identifier" },
      { id: "DocumentItemText", label: "DocumentItemText (Text)", desc: "Invoice item text description" },
      { id: "Quantity", label: "Quantity (Qty)", desc: "Billed invoice item quantity" },
      { id: "UnitOfMeasure", label: "UnitOfMeasure (UoM)", desc: "SAP UoM code key" },
      { id: "UnitPrice", label: "UnitPrice (Price)", desc: "Billed single unit price" },
      { id: "TaxCode", label: "TaxCode (Code)", desc: "SAP invoice tax jurisdiction code" },
      { id: "TaxAmount", label: "TaxAmount (Amt)", desc: "SAP item tax value" }
    ],
    Footer: [
      { id: "GrossAmount", label: "GrossAmount (Amt)", desc: "Header aggregate gross invoice value" },
      { id: "TaxAmount", label: "TaxAmount (Amt)", desc: "Header aggregate tax invoice value" }
    ],
    Exceptions: [
      { id: "PostingStatus", label: "PostingStatus (Code)", desc: "API posting validation flags" }
    ]
  };

  const getSourceCategories = () => (formContext === "SalesOrder" ? SALES_ORDER_SOURCE : VENDOR_INVOICE_SOURCE);
  const getTargetCategories = () => {
    if (fetchedTargetFields && fetchedTargetFields.length > 0) {
      return { "Fetched API Fields": fetchedTargetFields };
    }
    return formContext === "SalesOrder" ? SALES_ORDER_TARGET : VENDOR_INVOICE_TARGET;
  };

  return (
    <div className="fiori-page animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <h1 className="fiori-page-title">Integration Hub</h1>
        <div className="flex items-center gap-3">
          {activeTab === "catalog" && (
            <>
              <div className="relative animate-in slide-in-from-right-2 duration-300">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search APIs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-card border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none w-[200px] md:w-[260px] transition-all"
                />
              </div>
              <button
                onClick={fetchApis}
                title="Refresh List"
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors border border-border bg-card shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all active:scale-95 shadow-sm animate-in zoom-in-95 duration-200"
              >
                <Plus className="h-3.5 w-3.5" /> Add Connection
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subpage / Segment Tab Selector */}
      <div className="flex border-b border-border mb-6 gap-2 bg-muted/15 p-1 rounded-lg border border-border/40 w-max">
        <button
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-md",
            activeTab === "catalog"
              ? "bg-card text-primary shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          <Globe className="h-4 w-4" />
          API Connections
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-md",
            activeTab === "explorer"
              ? "bg-card text-primary shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          <Activity className="h-4 w-4" />
          Live BTP Explorer
        </button>
      </div>

      {/* Conditionally Render Subpages */}
      {activeTab === "catalog" && (
        <div className="fiori-card overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p>Fetching API catalog...</p>
              </div>
            ) : (
              <table className="fiori-smart-table">
                <thead>
                  <tr>
                    <th>API Connection</th>
                    <th>Protocol / Auth</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApis.map((api) => (
                    <tr key={api.id} className="hover:bg-muted/20 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Globe className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{api.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[280px] mt-0.5" title={api.endpoint}>
                              API: {api.endpoint}
                            </p>
                            {api.auth_type === "OAuth2" && api.oauth_token_url && (
                              <p className="text-[9px] font-mono text-primary truncate max-w-[280px] mt-0.5" title={api.oauth_token_url}>
                                Auth: {api.oauth_token_url}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                          <Shield className="h-3.5 w-3.5 text-blue-500" />
                          <span>{api.auth_type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">Active</span>
                        </div>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(api.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleTestConnection(api)}
                            disabled={isTesting === api.id}
                            className="px-2 py-1 text-[10px] font-bold text-primary border border-primary/30 rounded hover:bg-primary/5 disabled:opacity-50 transition-colors"
                            title="Test Connectivity"
                          >
                            {isTesting === api.id ? "Testing..." : "Test Conn"}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(api)}
                            className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(api.id)}
                            className="w-7 h-7 rounded border border-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApis.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Globe className="h-8 w-8 opacity-25" />
                          <p>No API connections configured yet. Add your first connection to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "explorer" && (
        <div className="fiori-card p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                      Live SAP BTP OData Explorer
                    </h3>
                    {btpData.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full border border-primary/20 animate-in zoom-in-95 duration-200">
                        {btpData.length} record{btpData.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verify end-to-end connectivity and view live OData entities retrieved directly from your public SAP BTP Cloud endpoint.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {btpData.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded hover:bg-muted transition-all"
                >
                  {showRawJson ? "Show Table" : "Show Raw JSON"}
                </button>
              )}
              <button
                onClick={fetchLiveSalesOrders}
                disabled={isFetchingBtp}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow-md transition-all disabled:opacity-50 active:scale-95 shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetchingBtp ? 'animate-spin' : ''}`} />
                {isFetchingBtp ? "Fetching Cloud..." : "Fetch Live Sales Orders"}
              </button>
            </div>
          </div>

          {/* Configuration Details Panel */}
          {activeEndpoint && (
            <div className="bg-muted/30 border border-border rounded p-3 text-[11px] font-mono grid grid-cols-1 md:grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
              <div>
                <span className="font-bold text-muted-foreground uppercase">Connected Endpoint:</span>{" "}
                <span className="text-primary truncate block md:inline" title={activeEndpoint}>{activeEndpoint}</span>
              </div>
              <div>
                <span className="font-bold text-muted-foreground uppercase">Active BTP Profile:</span>{" "}
                <span className="text-foreground">{activeConfigName || "Dynamic OAuth2"}</span>
              </div>
            </div>
          )}

          {/* Live Data Results */}
          {btpData.length > 0 ? (
            showRawJson ? (
              <div className="bg-muted/50 rounded border border-border p-4 max-h-[300px] overflow-y-auto font-mono text-xs">
                <pre>{JSON.stringify(btpData, null, 2)}</pre>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded">
                <table className="fiori-smart-table">
                  <thead>
                    <tr className="bg-muted/20">
                      <th>Sales Order ID</th>
                      <th>Order Type</th>
                      <th>Sales Org</th>
                      <th>Distribution Chan</th>
                      <th>Sold-to Party</th>
                      <th>Date</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {btpData.map((order: any, idx: number) => {
                      const salesOrderId = order.SalesOrder || order.salesOrderId || order.SalesOrderId || order.Doc_num || `Order_${idx}`;
                      const orderType = order.SalesOrderType || order.salesOrderType || order.Doc_typ || "OR1";
                      const salesOrg = order.SalesOrganization || order.salesOrganization || order.Sales_org || "1010";
                      const distChannel = order.DistributionChannel || order.distributionChannel || order.Distr_chan || "01";
                      const soldToParty = order.SoldToParty || order.soldToParty || order.Sold_to_party || "BP-CUST";
                      const createdBy = order.CreatedByUser || order.createdByUser || order.Created_by || "XSUAA";
                      const rawDate = order.SalesOrderDate || order.CreationDate || order.salesOrderDate || order.creationDate || "";
                      const dateDisplay = rawDate ? String(rawDate).slice(0, 10) : "—";

                      return (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="font-bold text-primary text-xs">{salesOrderId}</td>
                          <td className="text-xs font-semibold">{orderType}</td>
                          <td className="text-xs font-mono">{salesOrg}</td>
                          <td className="text-xs font-mono">{distChannel}</td>
                          <td className="text-xs font-semibold">{soldToParty}</td>
                          <td className="text-xs font-mono text-muted-foreground">{dateDisplay}</td>
                          <td className="text-xs text-muted-foreground">{createdBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/10 rounded border border-dashed border-border/80">
              <Globe className="h-8 w-8 opacity-25" />
              <p className="text-xs">No live Sales Orders fetched yet. Press "Fetch Live Sales Orders" to authenticate via XSUAA OAuth and query your SAP BTP service.</p>
            </div>
          )}
        </div>
      )}

      {/* API Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("bg-card w-full rounded-lg border border-border shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col transition-all duration-300", isMappingExpanded ? "max-w-5xl" : "max-w-lg")}>
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                  {editingId ? "Edit API Connection" : "Add API Connection"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Context Name */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">API Name</label>
                <input
                  type="text"
                  placeholder="e.g. SAP Gateway ERP, HubSpot Hub"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/v1"
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>

              {/* Context Type Selector */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">Context Type</label>
                <select
                  value={formContext}
                  onChange={(e) => {
                    const newContext = e.target.value as "SalesOrder" | "VendorInvoice";
                    setFormContext(newContext);
                    setFormMappings(newContext === "SalesOrder" ? DEFAULT_SALES_ORDER_MAPPINGS : DEFAULT_VENDOR_INVOICE_MAPPINGS);
                    setFetchedTargetFields(null);
                  }}
                  className="w-full h-9 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="SalesOrder">Sales Order</option>
                  <option value="VendorInvoice">Vendor Invoice</option>
                </select>
              </div>

              {/* Authentication Type */}
              <div>
                <label className="fiori-label text-[10px] block mb-1">Authorization Protocol</label>
                <select
                  value={formAuthType}
                  onChange={(e) => setFormAuthType(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="None">None (Public Access)</option>
                  <option value="API Key">API Key (Header / Query)</option>
                  <option value="Basic Auth">Basic Authentication (Username/Pass)</option>
                  <option value="OAuth2">OAuth 2.0 (Client Credentials)</option>
                </select>
              </div>

              {/* API Key Form Fields */}
              {formAuthType === "API Key" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 border border-border/60 rounded animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Key Field Name</label>
                    <div className="relative">
                      <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="X-API-Key / Authorization"
                        value={formKeyName}
                        onChange={(e) => setFormKeyName(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Key Secret Value</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type={showSecret["key"] ? "text" : "password"}
                        placeholder="Enter key secret..."
                        value={formKeyValue}
                        onChange={(e) => setFormKeyValue(e.target.value)}
                        className="w-full h-8 pl-8 pr-8 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowSecret("key")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret["key"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Auth Form Fields */}
              {formAuthType === "Basic Auth" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 border border-border/60 rounded animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Username</label>
                    <div className="relative">
                      <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Admin"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="fiori-label text-[10px] block mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type={showSecret["pass"] ? "text" : "password"}
                        placeholder="Enter password..."
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full h-8 pl-8 pr-8 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowSecret("pass")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret["pass"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OAuth2 Form Fields */}
              {formAuthType === "OAuth2" && (
                <div className="p-4 bg-muted/10 border border-border/60 rounded space-y-3 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="fiori-label text-[10px] block mb-1">Client ID</label>
                      <input
                        type="text"
                        placeholder="Enter client ID"
                        value={formClientId}
                        onChange={(e) => setFormClientId(e.target.value)}
                        className="w-full h-8 px-3 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="fiori-label text-[10px] block mb-1">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showSecret["oauth"] ? "text" : "password"}
                          placeholder="Enter client secret"
                          value={formClientSecret}
                          onChange={(e) => setFormClientSecret(e.target.value)}
                          className="w-full h-8 pl-3 pr-8 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowSecret("oauth")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecret["oauth"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                     <label className="fiori-label text-[10px] block mb-1">OAuth Token Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://login.microsoftonline.com/common/oauth2/v2.0/token"
                      value={formOauthTokenUrl}
                      onChange={(e) => setFormOauthTokenUrl(e.target.value)}
                      className="w-full h-8 px-3 text-xs font-mono border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                      required={formAuthType === "OAuth2"}
                    />
                  </div>
                </div>
              )}

              {/* Collapsible Mapping Workspace */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setIsMappingExpanded(!isMappingExpanded);
                    setTimeout(calculateLines, 100);
                  }}
                  className="w-full px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors flex items-center justify-between border-b border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Field Mappings (Required)</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-primary/10 text-primary rounded-full border border-primary/20">
                      {formMappings.length} mapped
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-bold">
                    {isMappingExpanded ? "Collapse ▲" : "Expand Mappings (Click to edit) ▼"}
                  </span>
                </button>
                
                {isMappingExpanded && (
                  <div className="p-4 bg-card space-y-4 max-h-[500px] overflow-y-auto animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFetchSchema}
                          disabled={isFetchingSchema}
                          className="px-2.5 py-1 text-[10px] font-bold bg-primary text-primary-foreground rounded hover:shadow transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw className={cn("h-3 w-3", isFetchingSchema && "animate-spin")} />
                          {isFetchingSchema ? "Fetching..." : "Fetch Fields from API"}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetDefaults}
                          className="px-2.5 py-1 text-[10px] font-semibold border border-border rounded hover:bg-muted transition-colors"
                        >
                          Reset Defaults
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="px-2.5 py-1 text-[10px] font-semibold text-destructive border border-destructive/20 rounded hover:bg-destructive/5 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Select a left field then right target to connect.
                      </span>
                    </div>

                    {/* SVG canvas and side-by-side lists */}
                    <div ref={containerRef} className="relative grid grid-cols-1 md:grid-cols-2 gap-12 p-4 bg-muted/5 rounded-lg border border-border overflow-hidden">
                      <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
                        {lines.map((line) => {
                          const dx = Math.abs(line.x2 - line.x1) * 0.45;
                          const pathD = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;
                          return (
                            <g key={line.id}>
                              <path
                                d={pathD}
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="3.5"
                                className="opacity-15 stroke-primary"
                              />
                              <path
                                d={pathD}
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="1.8"
                                className="opacity-75 stroke-primary animate-pulse"
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Left Column - Extracted Schema */}
                      <div className="space-y-4 z-20">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">
                          Extracted Fields (AI Output)
                        </span>
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {Object.entries(getSourceCategories()).map(([category, fields]) => (
                            <div key={category} className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block px-1 py-0.5 bg-muted/40 rounded">
                                {category} Fields
                              </span>
                              {fields.map((field) => {
                                const isSelected = selectedSource === field.id;
                                const isMapped = formMappings.some(m => m.sourceField === field.id);
                                const mappingPartner = formMappings.find(m => m.sourceField === field.id)?.targetField;
                                
                                return (
                                  <div
                                    key={field.id}
                                    onClick={() => handleSourceClick(field.id)}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded border text-left cursor-pointer transition-all hover:bg-muted/10 relative",
                                      isSelected 
                                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                        : isMapped 
                                          ? "border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02)]" 
                                          : "border-border/60 bg-muted/5 opacity-80"
                                    )}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-foreground text-[11px] truncate">{field.label}</p>
                                      <p className="text-[9px] text-muted-foreground truncate font-mono mt-0.5">({field.id})</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                      {isMapped && (
                                        <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-1 py-0.5 rounded font-mono border border-indigo-500/15 max-w-[80px] truncate" title={mappingPartner}>
                                          → {mappingPartner}
                                        </span>
                                      )}
                                      <div
                                        id={`dot-src-${field.id}`}
                                        className={cn(
                                          "w-2.5 h-2.5 rounded-full border-2 transition-all flex items-center justify-center relative z-30 cursor-pointer shadow-sm",
                                          isSelected 
                                            ? "border-primary bg-primary animate-pulse"
                                            : isMapped 
                                              ? "border-primary bg-primary" 
                                              : "border-muted-foreground/30 bg-background hover:border-primary"
                                        )}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Column - Target Schema */}
                      <div className="space-y-4 z-20">
                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block mb-1">
                          API Destination Fields
                        </span>
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {Object.entries(getTargetCategories()).map(([category, fields]) => (
                            <div key={category} className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block px-1 py-0.5 bg-muted/40 rounded">
                                {category} Fields
                              </span>
                              {fields.map((field) => {
                                const isMapped = formMappings.some(m => m.targetField === field.id);
                                const mappingPartner = formMappings.find(m => m.targetField === field.id)?.sourceField;
                                
                                return (
                                  <div
                                    key={field.id}
                                    onClick={() => handleTargetClick(field.id)}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded border text-left cursor-pointer transition-all hover:bg-muted/10 relative",
                                      isMapped 
                                        ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]" 
                                        : "border-border/60 bg-muted/5 opacity-80"
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <div
                                        id={`dot-tgt-${field.id}`}
                                        className={cn(
                                          "w-2.5 h-2.5 rounded-full border-2 transition-all flex items-center justify-center relative z-30 cursor-pointer shadow-sm shrink-0",
                                          isMapped 
                                            ? "border-emerald-500 bg-emerald-500" 
                                            : "border-muted-foreground/30 bg-background hover:border-primary"
                                        )}
                                      />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-foreground text-[11px] truncate">{field.label}</p>
                                        <p className="text-[9px] text-muted-foreground truncate font-mono mt-0.5">({field.id})</p>
                                      </div>
                                    </div>

                                    {isMapped && (
                                      <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded font-mono border border-emerald-500/15 max-w-[80px] truncate" title={mappingPartner}>
                                          ← {mappingPartner}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDisconnect(mappingPartner!, field.id);
                                          }}
                                          className="p-0.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors text-muted-foreground"
                                          title="Delete Connection"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold border border-border rounded hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:shadow transition-all active:scale-95"
                >
                  {editingId ? "Save Changes" : "Save Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
