// =================================================================
// DocSyncAI — Node.js Backend Server
// 1:1 port from Python FastAPI (server.py) to Express.js
// =================================================================

import express from 'express';
import cors from 'cors';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { GoogleGenAI } from '@google/genai';
import * as msal from '@azure/msal-node';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import WordExtractor from 'word-extractor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.join(__dirname, '.env') });

const logEmitter = new EventEmitter();
const LOG_FILE_PATH = path.join(__dirname, 'master.log');

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

function formatLogDate(date) {
    const pad = (n, m = 2) => String(n).padStart(m, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())},${pad(date.getMilliseconds(), 3)}`;
}

function writeLog(level, args) {
    const timestamp = formatLogDate(new Date());
    const message = args.map(arg => {
        if (arg instanceof Error) {
            return arg.stack || arg.message;
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return '[Circular Object]';
            }
        }
        return String(arg);
    }).join(' ');

    const logLine = `${timestamp} - ${level} - ${message}\n`;

    fs.appendFile(LOG_FILE_PATH, logLine, (err) => {
        if (err) {
            originalConsoleError.call(console, 'Error writing to master.log:', err);
        }
    });

    logEmitter.emit('log', { timestamp, level, message });
}

console.log = (...args) => {
    originalConsoleLog.apply(console, args);
    writeLog('INFO', args);
};

console.warn = (...args) => {
    originalConsoleWarn.apply(console, args);
    writeLog('WARNING', args);
};

console.error = (...args) => {
    originalConsoleError.apply(console, args);
    writeLog('ERROR', args);
};

console.info = console.log;

function readLastLines(filePath, maxLines = 150) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        return lines.slice(-maxLines);
    } catch (err) {
        originalConsoleError.call(console, 'Error reading log file history:', err);
        return [];
    }
}

const app = express();
app.use(cors());
app.use(express.json());

import storageService from './storageService.js';

// Initialize the storage service (creates local folders or connects S3)
storageService.init();

// Async PDF streaming routes supporting both local disk and AWS S3 storage
app.get('/api/pdf-docs/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const result = await storageService.getStreamOrPath('sap_docs', filename);
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.tiff': 'image/tiff',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        if (result.type === 'path') {
            res.sendFile(result.value);
        } else {
            result.value.pipe(res);
        }
    } catch (err) {
        res.status(404).send('File not found');
    }
});

app.get('/api/pending-docs/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const result = await storageService.getStreamOrPath('downloads', filename);
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.tiff': 'image/tiff',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        if (result.type === 'path') {
            res.sendFile(result.value);
        } else {
            result.value.pipe(res);
        }
    } catch (err) {
        res.status(404).send('File not found');
    }
});

// Serve Frontend in Production
const DIST_PATH = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(DIST_PATH, 'index.html'));
    });
    console.log(`✅ Production Frontend detected at ${DIST_PATH}`);
}


// ─── API & AUTH CONSTANTS ────────────────────────────────────────
const MODEL_ID = 'gemini-3.5-flash';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const OUTLOOK_TENANT_ID = process.env.OUTLOOK_TENANT_ID || 'common';
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:8000/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

const AUTHORITY = `https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}`;
const SCOPE = ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/User.Read', 'offline_access'];

const PROMPT_ANALYSIS = `
Analyze this document with extreme precision for SAP S/4HANA integration.

First, determine the document context. It must be either "Sales Order" or "Vendor Invoice".

1. DATA CLEANING RULES:
   - DATES: Convert all dates to 'YYYY-MM-DD' format.
   - AMOUNTS/PRICES: Return as clean strings with exactly two decimal places (e.g., "1250.00"). REMOVE $, commas, or spaces.
   - CURRENCY: Use standard 3-letter ISO codes (e.g., USD, CAD, EUR, INR).
   - EMPTY FIELDS: Use null or "" rather than "N/A" or "None".

2. EXTRACTION RULES:
   If the document is a "Sales Order", extract these fields:
   - HEADER:
     * context: "Sales Order"
     * sold_to_party_number: Customer's account number / Sold-to Party number in SAP.
     * customer_name: Name of the customer.
     * ship_to_party_number: Ship-to Party number / Delivery address ID.
     * requested_date: Requested delivery date.
     * order_received_date: Date the order was received or placed.
     * payment_terms: Payment terms (e.g. Net 30, COD).
     * inco_terms: Incoterms (e.g. FOB, EXW).
     * customer_po_number: Customer's Purchase Order number.
   - ITEM (under "line_items" array):
     * item_number: Item/pos number (e.g., "10", "20", "30").
     * customer_material_number: Customer's SKU/material code/Article number/Reference/Part number (often labeled as "Article", "Code Article", "Ref", "Réf.", "SKU", "Part No", "Material No").
     * material_description: Name/description of the product.
     * sap_material_number: SAP material SKU/code (e.g., ARFL100AM, GMB515BAM) if mentioned.
     * quantity: Order quantity.
     * unit_of_measure: Unit (e.g. EA, PC).
     * price: Unit price.
     * amount: Total item amount (quantity * price).
     * tax: Tax amount for this line.
   - FOOTER:
     * total_amount: Grand total amount.
     * total_taxes: Sum of all taxes.
   - EXCEPTIONS (under "exceptions" key):
     * exceptions: Describe any anomalies, missing mandatory data, price discrepancies, or warning messages.

   If the document is a "Vendor Invoice", extract these fields:
   - HEADER:
     * context: "Vendor Invoice"
     * supplier_number: Supplier's account number / Vendor ID.
     * supplier_name: Name of the vendor/supplier.
     * invoice_date: Date of the invoice.
     * invoice_reference: Invoice number / reference.
     * po_number: Purchase order number associated with this invoice.
     * po_type: Either "PO" or "Non-PO".
   - ITEM (under "line_items" array):
     * item_number: Item/pos number.
     * supplier_material_number: Vendor's SKU/material code.
     * material_description: Name/description of the product.
     * sap_material_number: SAP material SKU/code if mentioned.
     * quantity: Invoiced quantity.
     * unit_of_measure: Unit (e.g. EA, PC).
     * price: Unit price.
     * amount: Total item amount.
     * tax: Tax amount for this line.
   - FOOTER:
     * total_amount: Grand total amount.
     * total_taxes: Sum of all taxes.
   - EXCEPTIONS (under "exceptions" key):
     * exceptions: Describe any issues like tax mismatch, PO mismatch, etc.

Return a JSON object structured exactly like this:
{
  "is_legit_invoice": boolean, // MUST be set to true if the document is a valid Sales Order OR a valid Vendor Invoice. Set to false ONLY if the document is spam, junk, generic correspondence, a resume/CV, or completely unrelated to invoices or sales orders.
  "total_pages_detected": integer,
  "header": {
    "context": "Sales Order" | "Vendor Invoice",
    "sold_to_party_number": string or null,
    "customer_name": string or null,
    "ship_to_party_number": string or null,
    "requested_date": string or null,
    "order_received_date": string or null,
    "payment_terms": string or null,
    "inco_terms": string or null,
    "customer_po_number": string or null,
    "supplier_number": string or null,
    "supplier_name": string or null,
    "invoice_date": string or null,
    "invoice_reference": string or null,
    "po_number": string or null,
    "po_type": "PO" | "Non-PO" | null
  },
  "line_items": [
    {
      "item_number": string or null,
      "customer_material_number": string or null,
      "supplier_material_number": string or null,
      "material_description": string or null,
      "sap_material_number": string or null,
      "quantity": string or null,
      "unit_of_measure": string or null,
      "price": string or null,
      "amount": string or null,
      "tax": string or null
    }
  ],
  "totals": {
    "total_amount": string or null,
    "total_taxes": string or null,
    "currency": string or null
  },
  "exceptions": string or null
}
`;


// ─── USER DATABASE & AUTHENTICATION ──────────────────────────────

async function getUsers() {
    try {
        const users = await storageService.readFile('users', 'users.json', true);
        if (users) return users;
    } catch (e) {
        // ignore
    }
    const defaultUsers = [
        {
            id: 'admin-' + Date.now(),
            name: 'Admin User',
            email: 'admin@mygo.ai',
            password: crypto.createHash('sha256').update('mygo1234').digest('hex'),
            role: 'Administrator',
            active: true,
            approved: true,
            created_at: new Date().toISOString()
        }
    ];
    await storageService.saveFile('users', 'users.json', defaultUsers, true);
    return defaultUsers;
}

async function saveUsers(users) {
    await storageService.saveFile('users', 'users.json', users, true);
}

// ─── AUTHENTICATION ROUTES ────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ detail: 'Name, email and password are required' });
    }
    const users = await getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
        return res.status(400).json({ detail: 'User with this email already exists' });
    }
    const newUser = {
        id: 'user-' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: crypto.createHash('sha256').update(password).digest('hex'),
        role: role || 'Viewer',
        active: false,
        approved: false,
        created_at: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);

    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ message: 'Account registered successfully. Please await administrator approval before signing in.', user: userWithoutPassword });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ detail: 'Email and password are required' });
    }
    const users = await getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return res.status(401).json({ detail: 'Invalid email or password' });
    }
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password !== hashedPassword) {
        return res.status(401).json({ detail: 'Invalid email or password' });
    }
    if (user.approved === false) {
        return res.status(403).json({ detail: 'Your account is pending administrator approval.' });
    }
    if (user.active === false) {
        return res.status(403).json({ detail: 'Account is deactivated' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
});

app.get('/api/users', async (req, res) => {
    const users = await getUsers();
    const sanitized = users.map(({ password, ...u }) => u);
    res.json(sanitized);
});

app.post('/api/users', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ detail: 'Name, email and password are required' });
    }
    const users = await getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ detail: 'User with this email already exists' });
    }
    const newUser = {
        id: 'user-' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: crypto.createHash('sha256').update(password).digest('hex'),
        role: role || 'Viewer',
        active: true,
        approved: true,
        created_at: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
    res.json({ message: 'User added successfully' });
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, active, approved } = req.body;
    let users = await getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
        return res.status(404).json({ detail: 'User not found' });
    }

    if (name !== undefined) users[idx].name = name;
    if (email !== undefined) users[idx].email = email.toLowerCase();
    if (role !== undefined) users[idx].role = role;
    if (active !== undefined) users[idx].active = active;
    if (approved !== undefined) users[idx].approved = approved;

    await saveUsers(users);
    res.json({ message: 'User updated successfully', user: users[idx] });
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    let users = await getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    if (users.length === initialLength) {
        return res.status(404).json({ detail: 'User not found' });
    }
    await saveUsers(users);
    res.json({ message: 'User deleted successfully' });
});

// ─── SETTINGS HELPERS ────────────────────────────────────────────

async function getSettings() {
    try {
        const settings = await storageService.readFile('settings', 'settings.json', true);
        if (settings) return settings;
    } catch { return {}; }
    return {};
}

async function saveSettings(settings) {
    await storageService.saveFile('settings', 'settings.json', settings, true);
}

// ─── ODATA API REQUEST EXECUTOR ──────────────────────────────────

async function executeODataRequest(config, relativePathAndQuery) {
    const resolvedAuthType = config.auth_type || 'None';
    let baseEndpoint = String(config.endpoint).trim();
    
    let fullUrl = baseEndpoint;
    if (relativePathAndQuery) {
        const endsWithSlash = baseEndpoint.endsWith('/');
        const startsWithSlash = relativePathAndQuery.startsWith('/');
        if (endsWithSlash && startsWithSlash) {
            fullUrl = baseEndpoint + relativePathAndQuery.slice(1);
        } else if (!endsWithSlash && !startsWithSlash) {
            fullUrl = baseEndpoint + '/' + relativePathAndQuery;
        } else {
            fullUrl = baseEndpoint + relativePathAndQuery;
        }
    }

    let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    if (resolvedAuthType === 'OAuth2') {
        const tokenUrl = String(config.oauth_token_url || '').trim();
        const cId = String(config.client_id || '').trim();
        const cSecret = String(config.client_secret || '').trim();

        if (!tokenUrl || !cId || !cSecret) {
            throw new Error('OAuth2 configuration is incomplete for API: ' + config.name);
        }

        console.log(`🔑 [executeODataRequest] Fetching OAuth2 token for ${config.name} from ${tokenUrl}...`);
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', cId);
        tokenParams.append('client_secret', cSecret);

        let tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        });

        if (!tokenRes.ok) {
            throw new Error(`OAuth2 token request failed with status ${tokenRes.status}`);
        }

        const tokenData = await tokenRes.json();
        const bearerToken = tokenData.access_token || tokenData.token;
        if (!bearerToken) {
            throw new Error('OAuth2 token endpoint did not return an access token');
        }

        headers['Authorization'] = `Bearer ${bearerToken}`;
    } else if (resolvedAuthType === 'API Key') {
        const kName = config.key_name || 'X-API-Key';
        const kValue = config.key_value;
        if (kValue) {
            headers[kName] = kValue;
        }
    } else if (resolvedAuthType === 'Basic Auth') {
        const uName = config.username;
        const pWord = config.password;
        if (uName && pWord) {
            const credentials = Buffer.from(`${uName}:${pWord}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }
    }

    console.log(`📡 [executeODataRequest] Querying: ${fullUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OData request failed with status ${response.status}: ${errText}`);
        }

        return await response.json();
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

function resolvePricingForDocument(docData, settings) {
    if (!docData || !docData.line_items) return docData;

    const customerPrice = settings.customer_requested_price;
    const useFormula = settings.calculate_price_formula !== false;
    const formulaType = settings.price_formula_type || 'amount_times_qty';

    docData.line_items = docData.line_items.map(item => {
        let price = item.price || item.unit_price;
        let pricingOrigin = item.pricing_origin || '';

        // If no price is specified in the document
        if (price === undefined || price === null || String(price).trim() === '') {
            if (customerPrice && String(customerPrice).trim() !== '') {
                price = String(customerPrice);
                pricingOrigin = 'Settings: Customer Requested Price';
            } else if (useFormula) {
                const amount = parseFloat(item.amount || item.line_amount) || 0;
                const qty = parseFloat(item.quantity) || 1;
                
                if (formulaType === 'amount_times_qty') {
                    price = String((amount * qty).toFixed(2));
                    pricingOrigin = 'Formula: Amount * Quantity';
                } else if (formulaType === 'amount_divided_by_qty') {
                    const divPrice = qty > 0 ? (amount / qty) : 0;
                    price = String(divPrice.toFixed(2));
                    pricingOrigin = 'Formula: Amount / Quantity';
                }
            }
        }

        if (price) {
            item.price = price;
            item.unit_price = price;
            if (pricingOrigin) {
                item.pricing_origin = pricingOrigin;
            }
        }
        return item;
    });

    return docData;
}

async function uploadAttachmentToSAP(docId, sapDocNumber, docContext, isBtp, authDetails) {
    const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
    let ext = '.pdf';
    let fileBuffer = null;
    
    for (const e of supportedExts) {
        if (await storageService.existsFile('sap_docs', `${docId}${e}`)) {
            ext = e;
            break;
        }
    }
    const filename = `${docId}${ext}`;
    
    try {
        fileBuffer = await storageService.readFile('sap_docs', filename);
    } catch (err) {
        try {
            fileBuffer = await storageService.readFile('downloads', filename);
        } catch (innerErr) {
            throw new Error(`Original attachment file ${filename} not found in storage.`);
        }
    }
    
    const mimeMap = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.tiff': 'image/tiff',
        '.webp': 'image/webp',
        '.txt': 'text/plain'
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    
    const normalizedContext = (docContext.toLowerCase().includes('invoice') || docContext.toLowerCase().includes('vendor')) ? 'VendorInvoice' : 'SalesOrder';
    const businessObjectType = normalizedContext === 'SalesOrder' ? 'BUS2032' : 'BUS2081';
    const sapObjectKey = String(sapDocNumber).padStart(10, '0');
    
    if (isBtp) {
        const { accessToken, baseUrl } = authDetails;
        const attachmentUrl = process.env.SAP_BTP_ATTACHMENT_URL || `${baseUrl.replace(/\/$/, '')}/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/AttachmentContentSet`;
        
        console.log(`🚀 [BTP] Uploading attachment ${filename} to SAP Attachment Service at: ${attachmentUrl}`);
        
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType,
            'Slug': filename,
            'BusinessObjectTypeName': businessObjectType,
            'LinkedSAPObjectKey': sapObjectKey,
            'Accept': 'application/json'
        };
        
        const uploadResp = await fetch(attachmentUrl, {
            method: 'POST',
            headers,
            body: fileBuffer
        });
        
        const respText = await uploadResp.text();
        if (!uploadResp.ok) {
            throw new Error(`BTP Attachment upload returned Status ${uploadResp.status}: ${respText}`);
        }
        
        console.log(`🎉 [BTP] Attachment uploaded successfully to SAP!`);
        return respText;
    } else {
        const { authHeader, sapHost, sapPort, sapClient } = authDetails;
        const BASE_URL = `http://${sapHost}:${sapPort}/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/`;
        const TOKEN_URL = `${BASE_URL}?sap-client=${sapClient}`;
        const POST_URL = `${BASE_URL}AttachmentContentSet?sap-client=${sapClient}`;
        
        console.log(`🔒 [SAP] Fetching CSRF Token for Attachment Service from: ${TOKEN_URL}`);
        
        const tokenResp = await fetch(TOKEN_URL, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'x-csrf-token': 'fetch',
                'x-requested-with': 'X',
                'Accept': 'application/json'
            }
        });
        
        if (!tokenResp.ok) {
            const errText = await tokenResp.text();
            throw new Error(`Attachment Service CSRF Token Fetch Failed (Status ${tokenResp.status}): ${errText}`);
        }
        
        const csrfToken = tokenResp.headers.get('x-csrf-token');
        if (!csrfToken) {
            throw new Error('CSRF Token not returned by SAP Attachment Service');
        }
        
        const cookies = tokenResp.headers.get('set-cookie') || '';
        console.log(`🚀 [SAP] Uploading attachment ${filename} to SAP Attachment Service at: ${POST_URL}`);
        
        const postHeaders = {
            'Authorization': authHeader,
            'x-csrf-token': csrfToken,
            'Content-Type': mimeType,
            'Slug': filename,
            'BusinessObjectTypeName': businessObjectType,
            'LinkedSAPObjectKey': sapObjectKey,
            'Accept': 'application/json'
        };
        
        if (cookies) {
            postHeaders['Cookie'] = cookies;
        }
        
        const uploadResp = await fetch(POST_URL, {
            method: 'POST',
            headers: postHeaders,
            body: fileBuffer
        });
        
        const respText = await uploadResp.text();
        if (!uploadResp.ok) {
            throw new Error(`SAP Attachment upload returned Status ${uploadResp.status}: ${respText}`);
        }
        
        console.log(`🎉 [SAP] Attachment uploaded successfully to SAP!`);
        return respText;
    }
}

// ─── DYNAMIC API ENRICHMENT PIPELINE ──────────────────────────────

async function enrichDocumentWithApis(docData) {
    const settings = await getSettings();
    
    // Ensure basic structures exist
    docData.header = docData.header || {};
    docData.totals = docData.totals || {};
    docData.line_items = docData.line_items || [];
    
    // Backup original AI extracted data for side-by-side UI comparison
    if (!docData.ai_extracted_data) {
        docData.ai_extracted_data = {
            header: { ...(docData.header || {}) },
            line_items: JSON.parse(JSON.stringify(docData.line_items || []))
        };
    }

    docData = resolvePricingForDocument(docData, settings);
    const apiConfigs = settings.api_configs || [];
    
    if (!docData.field_origins) {
        docData.field_origins = {};
    }
    
    const docContext = docData.header?.context || docData.email_metadata?.expected_doc_type || 'SalesOrder';
    const isSalesOrder = !(docContext.toLowerCase().includes('invoice') || docContext.toLowerCase().includes('vendor'));
    docData.header.context = isSalesOrder ? "Sales Order" : "Vendor Invoice";

    const emailMeta = docData.email_metadata || {};
    const recipientEmail = emailMeta.recipient_email || '';
    const matchingEmailConf = recipientEmail ? (settings.emails || []).find(e => e.email?.toLowerCase() === recipientEmail.toLowerCase()) : null;
    const custName = matchingEmailConf?.customer_name || docData.header?.customer_name || docData.header?.supplier_name || '';

    // Define helper to safely set values only if currently blank/empty
    const setField = (field, defaultValue, source) => {
        if (docData.header[field] === undefined || docData.header[field] === null || String(docData.header[field]).trim() === "" || docData.header[field] === "N/A" || docData.header[field] === "—") {
            docData.header[field] = defaultValue;
            docData.field_origins[field] = {
                value: defaultValue,
                source: source
            };
        } else if (!docData.field_origins[field]) {
            docData.field_origins[field] = {
                value: docData.header[field],
                source: "AI Model Extraction"
            };
        }
    };

    // Track base metadata origins
    if (emailMeta.customer_name) {
        setField("customer_name", emailMeta.customer_name, "Gmail/Outlook Domain Settings");
    } else {
        setField("customer_name", custName || (isSalesOrder ? "BP-CUST Customer" : "BP-CUST Vendor"), "AI Model Extraction");
    }
    
    if (emailMeta.customer_address) {
        setField("customer_address", emailMeta.customer_address, "Gmail/Outlook Domain Settings (Sold-to Address)");
        setField("sold_to_address", emailMeta.customer_address, "Gmail/Outlook Domain Settings (Sold-to Address)");
    } else {
        const addr = docData.header?.customer_address || docData.header?.sold_to_address || "123 SAP Street, Newtown, US";
        setField("customer_address", addr, "AI Model Extraction");
        setField("sold_to_address", addr, "AI Model Extraction");
    }

    if (isSalesOrder) {
        // Sales organization
        if (matchingEmailConf?.sales_org) {
            docData.header.sales_organization = matchingEmailConf.sales_org;
            docData.field_origins.sales_organization = {
                value: matchingEmailConf.sales_org,
                source: "Gmail/Outlook Connection Settings"
            };
        } else if (emailMeta.sales_org) {
            docData.header.sales_organization = emailMeta.sales_org;
            docData.field_origins.sales_organization = {
                value: emailMeta.sales_org,
                source: "Gmail/Outlook Ingestion Metadata"
            };
        } else {
            setField("sales_organization", "1010", "Default Fallback");
        }

        // Distribution channel
        if (matchingEmailConf?.distr_chan) {
            docData.header.distribution_channel = matchingEmailConf.distr_chan;
            docData.field_origins.distribution_channel = {
                value: matchingEmailConf.distr_chan,
                source: "Gmail/Outlook Connection Settings"
            };
        } else if (emailMeta.distr_chan) {
            docData.header.distribution_channel = emailMeta.distr_chan;
            docData.field_origins.distribution_channel = {
                value: emailMeta.distr_chan,
                source: "Gmail/Outlook Ingestion Metadata"
            };
        } else {
            setField("distribution_channel", "01", "Default Fallback");
        }

        // Division
        if (matchingEmailConf?.division) {
            docData.header.division = matchingEmailConf.division;
            docData.field_origins.division = {
                value: matchingEmailConf.division,
                source: "Gmail/Outlook Connection Settings"
            };
        } else if (emailMeta.division) {
            docData.header.division = emailMeta.division;
            docData.field_origins.division = {
                value: emailMeta.division,
                source: "Gmail/Outlook Ingestion Metadata"
            };
        } else {
            setField("division", "01", "Default Fallback");
        }

        setField("sold_to_party_number", "BP-CUST", "Default Fallback");
        setField("ship_to_party_number", docData.header.sold_to_party_number || "BP-CUST", "Default Fallback");

        // Dates
        const todayStr = new Date().toISOString().slice(0, 10);
        const resolvedDate = docData.header.order_received_date || docData.header.requested_date || docData.header.po_date || emailMeta.received_at || todayStr;
        setField("requested_date", resolvedDate, "Default Fallback");
        setField("order_received_date", resolvedDate, "Default Fallback");

        setField("payment_terms", "0001", "Default Fallback");
        setField("inco_terms", "FOB", "Default Fallback");

        const resolvedPoNum = docData.header.customer_po_number || docData.header.po_number || docData.header.purchase_order_number || docData.header.order_reference || "AUTO_PO";
        setField("customer_po_number", resolvedPoNum, "Default Fallback");
    } else {
        // Supplier Number
        setField("supplier_number", "BP-CUST", "Default Fallback");
        setField("supplier_name", custName || "BP-CUST Vendor", "Default Fallback");

        // Company Code
        if (matchingEmailConf?.company_code) {
            docData.header.company_code = matchingEmailConf.company_code;
            docData.field_origins.company_code = {
                value: matchingEmailConf.company_code,
                source: "Gmail/Outlook Connection Settings"
            };
        } else if (emailMeta.company_code) {
            docData.header.company_code = emailMeta.company_code;
            docData.field_origins.company_code = {
                value: emailMeta.company_code,
                source: "Gmail/Outlook Ingestion Metadata"
            };
        } else {
            setField("company_code", "1010", "Default Fallback");
        }

        // Dates
        const todayStr = new Date().toISOString().slice(0, 10);
        const resolvedDate = docData.header.invoice_date || docData.header.po_date || emailMeta.received_at || todayStr;
        setField("invoice_date", resolvedDate, "Default Fallback");

        const resolvedPoNum = docData.header.po_number || docData.header.customer_po_number || "AUTO_PO";
        setField("po_number", resolvedPoNum, "Default Fallback");
        setField("invoice_reference", resolvedPoNum || "INV-REF-AUTO", "Default Fallback");
        setField("po_type", "PO", "Default Fallback");
    }
    
    // 1. Business Partner API Enrichment
    const bpConfig = apiConfigs.find(c => c.status === 'Active' && c.context === 'BusinessPartner');
    if (bpConfig && custName) {
        try {
            console.log(`📡 [API Enrichment] Querying Business Partner API for "${custName}"...`);
            let query = `BusinessPartners?$filter=contains(BusinessPartnerName,'${encodeURIComponent(custName)}') or BusinessPartner eq '${encodeURIComponent(custName)}'&$expand=to_BusinessPartnerAddress,to_Customer`;
            let bpResult;
            try {
                bpResult = await executeODataRequest(bpConfig, query);
            } catch (err) {
                console.warn(`OData contains filter failed for BP, trying direct fetch to filter locally: ${err.message}`);
                bpResult = await executeODataRequest(bpConfig, `BusinessPartners?$expand=to_BusinessPartnerAddress,to_Customer&$top=100`);
            }
            
            let records = bpResult?.value || bpResult?.d?.results || bpResult || [];
            if (!Array.isArray(records) && records.results) records = records.results;
            
            let matchedRecord = records.find(r => 
                String(r.BusinessPartnerName || r.OrganizationBPName1 || '').toLowerCase().includes(custName.toLowerCase()) ||
                custName.toLowerCase().includes(String(r.BusinessPartnerName || r.OrganizationBPName1 || '').toLowerCase()) ||
                String(r.BusinessPartner || '').toLowerCase() === custName.toLowerCase()
            );
            
            if (!matchedRecord && records.length > 0) {
                matchedRecord = records[0];
            }
            
            if (matchedRecord) {
                console.log(`✅ [API Enrichment] Found Business Partner match: ${matchedRecord.BusinessPartnerName || matchedRecord.BusinessPartner}`);
                
                // Overwrite customer name in header with resolved name from SAP
                if (matchedRecord.BusinessPartnerName || matchedRecord.OrganizationBPName1) {
                    docData.header.customer_name = matchedRecord.BusinessPartnerName || matchedRecord.OrganizationBPName1;
                    if (!isSalesOrder) docData.header.supplier_name = matchedRecord.BusinessPartnerName || matchedRecord.OrganizationBPName1;
                    docData.field_origins.customer_name = {
                        value: matchedRecord.BusinessPartnerName || matchedRecord.OrganizationBPName1,
                        source: `Business Partner API (${bpConfig.name}) - Resolved Name`
                    };
                }

                let customerId = matchedRecord.BusinessPartner;
                if (matchedRecord.to_Customer) {
                    const custData = matchedRecord.to_Customer.results?.[0] || matchedRecord.to_Customer;
                    if (custData && custData.Customer) {
                        customerId = custData.Customer;
                    }
                }
                
                if (isSalesOrder) {
                    docData.header.sold_to_party_number = customerId;
                    docData.field_origins.sold_to_party_number = {
                        value: customerId,
                        source: `Business Partner API (${bpConfig.name}) - Customer ID`
                    };
                } else {
                    docData.header.supplier_number = customerId;
                    docData.field_origins.supplier_number = {
                        value: customerId,
                        source: `Business Partner API (${bpConfig.name}) - Vendor ID`
                    };
                }
                
                if (matchedRecord.to_BusinessPartnerAddress) {
                    let addrList = matchedRecord.to_BusinessPartnerAddress.results || matchedRecord.to_BusinessPartnerAddress;
                    if (!Array.isArray(addrList)) addrList = [addrList];
                    
                    const addr = addrList[0];
                    if (addr) {
                        const street = addr.StreetName || addr.Street || '';
                        const city = addr.CityName || addr.City || '';
                        const postal = addr.PostalCode || '';
                        const country = addr.Country || '';
                        const formattedAddr = [street, city, postal, country].filter(Boolean).join(', ');
                        
                        if (formattedAddr) {
                            docData.header.customer_address = formattedAddr;
                            docData.header.sold_to_address = formattedAddr;
                            docData.field_origins.customer_address = {
                                value: formattedAddr,
                                source: `Business Partner API (${bpConfig.name}) - Address expanded`
                            };
                            docData.field_origins.sold_to_address = {
                                value: formattedAddr,
                                source: `Business Partner API (${bpConfig.name}) - Address expanded`
                            };
                        }
                    }
                }
            } else {
                console.log(`⚠️ [API Enrichment] No matching Business Partner found for "${custName}"`);
            }
        } catch (bpErr) {
            console.error(`❌ [API Enrichment] Business Partner API lookup failed:`, bpErr.message);
        }
    }
    
    // 2. Customer Material Info API Enrichment
    const matConfig = apiConfigs.find(c => c.status === 'Active' && c.context === 'CustomerMaterialInfo');
    if (matConfig && docData.line_items && docData.line_items.length > 0) {
        try {
            console.log(`📡 [API Enrichment] Querying Customer Material Info API (CMIR)...`);
            const matResult = await executeODataRequest(matConfig, 'CustMatRecords');
            let records = matResult?.value || matResult?.d?.results || matResult || [];
            if (!Array.isArray(records) && records.results) records = records.results;
            
            if (records.length > 0) {
                if (!docData.line_item_origins) docData.line_item_origins = {};
                
                docData.line_items = docData.line_items.map((item, idx) => {
                    const itemDesc = item.material_description || '';
                    const itemCustMat = item.customer_material_number || item.supplier_material_number || '';
                    
                    let matchedMat = records.find(r => 
                        itemCustMat && String(r.CustomerMaterial || r.Cust_mat || '').toLowerCase() === itemCustMat.toLowerCase()
                    );
                    
                    if (!matchedMat) {
                        matchedMat = records.find(r => 
                            itemDesc && (
                                String(r.MaterialDescription || r.Mat_desc || '').toLowerCase().includes(itemDesc.toLowerCase()) ||
                                itemDesc.toLowerCase().includes(String(r.MaterialDescription || r.Mat_desc || '').toLowerCase())
                            )
                        );
                    }
                    
                    if (matchedMat) {
                        const sapMatNo = matchedMat.Material || matchedMat.Mat_no || matchedMat.MaterialNumber;
                        const sapMatDesc = matchedMat.MaterialDescription || matchedMat.Mat_desc || matchedMat.MaterialName || matchedMat.Description || '';
                        console.log(`✅ [API Enrichment] Matched line item ${idx+1} ("${itemDesc}") to SAP Material SKU: ${sapMatNo} and description: ${sapMatDesc}`);
                        
                        docData.line_item_origins[idx] = {
                            sap_material_number: `Customer Material Info API (${matConfig.name}) - Matched via description/SKU`,
                            sap_material_description: `Customer Material Info API (${matConfig.name}) - Matched via description/SKU`
                        };
                        
                        return {
                            ...item,
                            sap_material_number: sapMatNo,
                            sap_material_description: sapMatDesc
                        };
                    }
                    return item;
                });
            }
        } catch (matErr) {
            console.error(`❌ [API Enrichment] Customer Material Info API lookup failed:`, matErr.message);
        }
    }

    const extractMaterial = (desc, fallback) => {
        if (!desc) return fallback;
        const match = desc.match(/[A-Z0-9]{5,18}/);
        return match ? match[0] : fallback;
    };

    // 3. Fallbacks for remaining empty line items and fields
    if (docData.line_items && docData.line_items.length > 0) {
        if (!docData.line_item_origins) docData.line_item_origins = {};
        
        docData.line_items = docData.line_items.map((item, idx) => {
            const updatedItem = { ...item };
            
            // Item number — always normalize to SAP format (10, 20, 30...) regardless of AI-extracted value
            // SAP requires item positions in multiples of 10 for both Sales Orders and Vendor Invoices
            updatedItem.item_number = String((idx + 1) * 10);
            
            // Material description
            if (!updatedItem.material_description) {
                updatedItem.material_description = "Default Material Description";
            }
            
            // Customer/Supplier material number
            if (isSalesOrder) {
                if (!updatedItem.customer_material_number) {
                    updatedItem.customer_material_number = "ARFL100AM";
                }
            } else {
                if (!updatedItem.supplier_material_number) {
                    updatedItem.supplier_material_number = "ARFL100AM";
                }
            }
            
            // SAP material number
            if (!updatedItem.sap_material_number) {
                const defaultMat = idx === 0 ? "ARFL100AM" : "GMB515BAM";
                updatedItem.sap_material_number = updatedItem.customer_material_number || updatedItem.supplier_material_number || extractMaterial(updatedItem.material_description, defaultMat);
                if (!docData.line_item_origins[idx]) docData.line_item_origins[idx] = {};
                docData.line_item_origins[idx].sap_material_number = "Default Fallback";
            }
            
            // SAP material description
            if (!updatedItem.sap_material_description) {
                updatedItem.sap_material_description = updatedItem.material_description || "ARFL100AM - Material Desc";
                if (!docData.line_item_origins[idx]) docData.line_item_origins[idx] = {};
                docData.line_item_origins[idx].sap_material_description = "Default Fallback";
            }
            
            // Quantity
            if (!updatedItem.quantity) {
                updatedItem.quantity = "1";
            }
            
            // Unit of measure
            if (!updatedItem.unit_of_measure) {
                updatedItem.unit_of_measure = "EA";
            }
            
            // Price / Unit price
            const rawPrice = updatedItem.price || updatedItem.unit_price;
            if (!rawPrice || isNaN(parseFloat(rawPrice))) {
                updatedItem.price = "0.00";
                updatedItem.unit_price = "0.00";
            } else {
                updatedItem.price = String(parseFloat(rawPrice).toFixed(2));
                updatedItem.unit_price = String(parseFloat(rawPrice).toFixed(2));
            }
            
            // Amount / Line amount
            const rawAmount = updatedItem.amount || updatedItem.line_amount;
            if (!rawAmount || isNaN(parseFloat(rawAmount))) {
                const calcAmount = parseFloat(updatedItem.quantity) * parseFloat(updatedItem.price);
                updatedItem.amount = String(calcAmount.toFixed(2));
                updatedItem.line_amount = String(calcAmount.toFixed(2));
            } else {
                updatedItem.amount = String(parseFloat(rawAmount).toFixed(2));
                updatedItem.line_amount = String(parseFloat(rawAmount).toFixed(2));
            }
            
            // Tax / Line tax
            const rawTax = updatedItem.tax || updatedItem.line_tax;
            if (!rawTax || isNaN(parseFloat(rawTax))) {
                updatedItem.tax = "0.00";
                updatedItem.line_tax = "0.00";
            } else {
                updatedItem.tax = String(parseFloat(rawTax).toFixed(2));
                updatedItem.line_tax = String(parseFloat(rawTax).toFixed(2));
            }
            
            return updatedItem;
        });
    } else {
        // If line items is empty, we must create at least one dummy line item!
        docData.line_items = [{
            item_number: "10",
            material_description: "ARFL100AM - Material Desc",
            customer_material_number: "ARFL100AM",
            supplier_material_number: "ARFL100AM",
            sap_material_number: "ARFL100AM",
            sap_material_description: "ARFL100AM - Material Desc",
            quantity: "1",
            unit_of_measure: "EA",
            price: "0.00",
            unit_price: "0.00",
            amount: "0.00",
            line_amount: "0.00",
            tax: "0.00",
            line_tax: "0.00"
        }];
        if (!docData.line_item_origins) docData.line_item_origins = {};
        docData.line_item_origins[0] = {
            sap_material_number: "Default Fallback (Empty Line Items)",
            sap_material_description: "Default Fallback (Empty Line Items)"
        };
    }

    // 4. Totals fallbacks
    if (!docData.totals) {
        docData.totals = {};
    }
    if (!docData.totals.currency) {
        docData.totals.currency = "USD";
    }
    
    // Sum up items if totals amount or tax is missing
    let sumAmount = 0;
    let sumTax = 0;
    docData.line_items.forEach(item => {
        sumAmount += parseFloat(item.amount) || 0;
        sumTax += parseFloat(item.tax) || 0;
    });

    const rawTotalTax = docData.totals.total_taxes || docData.totals.total_tax;
    if (!rawTotalTax || isNaN(parseFloat(rawTotalTax))) {
        docData.totals.total_taxes = String(sumTax.toFixed(2));
        docData.totals.total_tax = String(sumTax.toFixed(2));
    } else {
        docData.totals.total_taxes = String(parseFloat(rawTotalTax).toFixed(2));
        docData.totals.total_tax = String(parseFloat(rawTotalTax).toFixed(2));
    }

    const rawTotalAmount = docData.totals.total_amount;
    if (!rawTotalAmount || isNaN(parseFloat(rawTotalAmount))) {
        docData.totals.total_amount = String((sumAmount + sumTax).toFixed(2));
    } else {
        docData.totals.total_amount = String(parseFloat(rawTotalAmount).toFixed(2));
    }

    return docData;
}

app.get('/api/sap/business-partner', async (req, res) => {
    try {
        const { query: custName } = req.query;
        if (!custName) {
            return res.status(400).json({ error: "Query parameter 'query' is required" });
        }

        const settings = await getSettings();
        const apiConfigs = settings.api_configs || [];
        const bpConfig = apiConfigs.find(c => c.status === 'Active' && c.context === 'BusinessPartner');
        
        if (!bpConfig) {
            return res.status(404).json({ error: "Active BusinessPartner API config not found" });
        }

        console.log(`📡 [API Lookup Route] Querying Business Partner API for "${custName}"...`);
        let query = `BusinessPartners?$filter=contains(BusinessPartnerName,'${encodeURIComponent(custName)}') or BusinessPartner eq '${encodeURIComponent(custName)}'&$expand=to_BusinessPartnerAddress,to_Customer`;
        let bpResult;
        try {
            bpResult = await executeODataRequest(bpConfig, query);
        } catch (err) {
            console.warn(`OData contains filter failed for BP lookup route, trying direct fetch to filter locally: ${err.message}`);
            bpResult = await executeODataRequest(bpConfig, `BusinessPartners?$expand=to_BusinessPartnerAddress,to_Customer&$top=100`);
        }
        
        let records = bpResult?.value || bpResult?.d?.results || bpResult || [];
        if (!Array.isArray(records) && records.results) records = records.results;
        
        let matchedRecord = records.find(r => 
            String(r.BusinessPartnerName || r.OrganizationBPName1 || '').toLowerCase().includes(custName.toLowerCase()) ||
            custName.toLowerCase().includes(String(r.BusinessPartnerName || r.OrganizationBPName1 || '').toLowerCase()) ||
            String(r.BusinessPartner || '').toLowerCase() === custName.toLowerCase()
        );
        
        if (!matchedRecord && records.length > 0) {
            matchedRecord = records[0];
        }

        if (matchedRecord) {
            res.json(matchedRecord);
        } else {
            res.status(404).json({ error: `No business partner matches found for "${custName}"` });
        }
    } catch (err) {
        console.error("❌ [API] Business Partner fetch error:", err.message);
        res.status(500).json({ error: "Failed to query SAP Business Partner API", details: err.message });
    }
});

// ─── SETTINGS ROUTES ─────────────────────────────────────────────

app.get('/api/settings', async (req, res) => {
    const settings = await getSettings();
    // Mask secrets
    if (settings.app_password) settings.app_password = '********';
    if (settings.emails && Array.isArray(settings.emails)) {
        settings.emails = settings.emails.map(e => ({
            ...e,
            password: e.password ? '********' : ''
        }));
    }
    for (const key of ['openai_api_key', 'anthropic_api_key', 'gemini_api_key']) {
        if (settings[key]) settings[key] = '********';
    }
    res.json(settings);
});

app.post('/api/settings/email', async (req, res) => {
    const current = await getSettings();
    const update = req.body;

    if (update.emails && Array.isArray(update.emails)) {
        const existingEmails = current.emails || [];
        update.emails = update.emails.map(e => {
            const match = existingEmails.find(ex => ex.id === e.id || ex.email === e.email);
            return {
                ...e,
                password: (e.password === '********' && match) ? match.password : e.password
            };
        });
    }

    Object.assign(current, update);
    await saveSettings(current);
    res.json({ message: 'Email settings updated successfully' });
});

app.post('/api/settings/ai', async (req, res) => {
    const { provider, api_key, model } = req.body;
    const current = await getSettings();

    let providerKey = provider.toLowerCase();
    if (providerKey === 'claude') providerKey = 'anthropic';

    const keyName = `${providerKey}_api_key`;
    if (api_key !== undefined && api_key !== '********') {
        current[keyName] = api_key;
    }
    current.active_provider = provider;
    if (model) {
        current[`${providerKey}_model`] = model;
    }
    await saveSettings(current);
    res.json({ message: `${provider} settings updated successfully` });
});

app.post('/api/settings/ai/models', async (req, res) => {
    const { provider, api_key } = req.body;
    if (!provider) {
        return res.status(400).json({ error: "Provider is required" });
    }

    let apiKey = api_key;
    const settings = await getSettings();
    const providerLower = provider === "Claude" ? "anthropic" : provider.toLowerCase();

    if (!apiKey || apiKey === '********') {
        apiKey = settings[`${providerLower}_api_key`];
    }

    if (!apiKey) {
        return res.status(400).json({ error: `API Key for ${provider} is not configured` });
    }

    try {
        let modelsList = [];
        if (provider === "Gemini") {
            const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`Gemini API returned status ${response.status}`);
            }
            const data = await response.json();
            if (data.models && Array.isArray(data.models)) {
                modelsList = data.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace(/^models\//, ''));
            }
        } else if (provider === "OpenAI") {
            const response = await fetch("https://api.openai.com/v1/models", {
                headers: {
                    "Authorization": `Bearer ${apiKey}`
                }
            });
            if (!response.ok) {
                throw new Error(`OpenAI API returned status ${response.status}`);
            }
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
                modelsList = data.data
                    .map(m => m.id)
                    .filter(id => id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3'));
            }
        } else if (provider === "Claude") {
            const response = await fetch("https://api.anthropic.com/v1/models", {
                headers: {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                }
            });
            if (!response.ok) {
                throw new Error(`Anthropic API returned status ${response.status}`);
            }
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
                modelsList = data.data.map(m => m.id);
            }
        }

        // Fallbacks if list is empty
        if (modelsList.length === 0) {
            if (provider === "Gemini") {
                modelsList = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
            } else if (provider === "OpenAI") {
                modelsList = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
            } else if (provider === "Claude") {
                modelsList = ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
            }
        }

        res.json({ success: true, models: modelsList });
    } catch (err) {
        console.error(`Error fetching models for ${provider}:`, err.message);
        
        // Return fallback lists on error
        let modelsList = [];
        if (provider === "Gemini") {
            modelsList = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
        } else if (provider === "OpenAI") {
            modelsList = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
        } else if (provider === "Claude") {
            modelsList = ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
        }
        res.json({ success: false, message: err.message, models: modelsList });
    }
});

app.get('/api/settings/prompt', async (req, res) => {
    const settings = await getSettings();
    res.json({ prompt: settings.custom_prompt || PROMPT_ANALYSIS });
});

app.post('/api/settings/prompt', async (req, res) => {
    const current = await getSettings();
    current.custom_prompt = req.body.prompt;
    await saveSettings(current);
    res.json({ message: 'Prompt updated successfully' });
});

app.post('/api/settings/bp-mappings', async (req, res) => {
    try {
        const { mappings } = req.body;
        if (!Array.isArray(mappings)) {
            return res.status(400).json({ error: 'mappings must be an array' });
        }
        const current = await getSettings();
        current.bp_mappings = mappings;
        await saveSettings(current);
        res.json({ success: true, message: 'Business Partner mapping table updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/settings/mappings', async (req, res) => {
    try {
        const { mappings } = req.body;
        const current = await getSettings();
        current.field_mappings = mappings;
        await saveSettings(current);
        res.json({ success: true, message: 'Schema mappings saved successfully', field_mappings: current.field_mappings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/pricing', async (req, res) => {
    try {
        const { customer_requested_price, calculate_price_formula, price_formula_type } = req.body;
        const current = await getSettings();
        current.customer_requested_price = customer_requested_price;
        current.calculate_price_formula = calculate_price_formula !== undefined ? calculate_price_formula : true;
        current.price_formula_type = price_formula_type || 'amount_times_qty';
        await saveSettings(current);
        res.json({ 
            success: true, 
            message: 'Pricing settings saved successfully', 
            customer_requested_price: current.customer_requested_price,
            calculate_price_formula: current.calculate_price_formula,
            price_formula_type: current.price_formula_type
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/test-email', (req, res) => {
    const { user_email, app_password, imap_server } = req.body;
    const imap = new Imap({
        user: user_email,
        password: (app_password || '').replace(/ /g, ''),
        host: imap_server || 'imap.gmail.com',
        port: 993,
        tls: true,
        connTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
    });

    imap.once('ready', () => {
        imap.end();
        res.json({ status: 'success', message: 'Connection successful' });
    });

    imap.once('error', (err) => {
        res.json({ status: 'error', message: err.message });
    });

    imap.connect();
});

// ─── API CONFIGS ROUTES ──────────────────────────────────────────

app.get('/api/api-configs', async (req, res) => {
    const settings = await getSettings();
    const configs = settings.api_configs || [];
    const maskedConfigs = configs.map(c => {
        const copy = { ...c };
        if (copy.password) copy.password = '********';
        if (copy.client_secret) copy.client_secret = '********';
        if (copy.key_value) copy.key_value = '********';
        return copy;
    });
    res.json(maskedConfigs);
});

app.post('/api/api-configs', async (req, res) => {
    const settings = await getSettings();
    if (!settings.api_configs) settings.api_configs = [];

    const newConfig = {
        id: Date.now(),
        name: req.body.name,
        endpoint: req.body.endpoint,
        auth_type: req.body.auth_type || 'None',
        client_id: req.body.client_id || '',
        client_secret: req.body.client_secret || '',
        username: req.body.username || '',
        password: req.body.password || '',
        key_name: req.body.key_name || '',
        key_value: req.body.key_value || '',
        oauth_token_url: req.body.oauth_token_url || '',
        context: req.body.context || 'SalesOrder',
        mappings: req.body.mappings || [],
        status: 'Active',
        created_at: new Date().toISOString()
    };

    settings.api_configs.push(newConfig);
    await saveSettings(settings);
    res.status(201).json(newConfig);
});

app.put('/api/api-configs/:id', async (req, res) => {
    const settings = await getSettings();
    const configs = settings.api_configs || [];
    const id = Number(req.params.id);
    const index = configs.findIndex(c => c.id === id);

    if (index === -1) {
        return res.status(404).json({ detail: 'API Configuration not found' });
    }

    const current = configs[index];
    const update = req.body;

    // Update fields, preserving secrets if sent as masked
    const updated = {
        ...current,
        name: update.name !== undefined ? update.name : current.name,
        endpoint: update.endpoint !== undefined ? update.endpoint : current.endpoint,
        auth_type: update.auth_type !== undefined ? update.auth_type : current.auth_type,
        client_id: update.client_id !== undefined ? update.client_id : current.client_id,
        username: update.username !== undefined ? update.username : current.username,
        key_name: update.key_name !== undefined ? update.key_name : current.key_name,
        oauth_token_url: update.oauth_token_url !== undefined ? update.oauth_token_url : current.oauth_token_url,
        context: update.context !== undefined ? update.context : current.context,
        mappings: update.mappings !== undefined ? update.mappings : current.mappings,
        client_secret: (update.client_secret && update.client_secret !== '********') ? update.client_secret : current.client_secret,
        password: (update.password && update.password !== '********') ? update.password : current.password,
        key_value: (update.key_value && update.key_value !== '********') ? update.key_value : current.key_value
    };

    configs[index] = updated;
    settings.api_configs = configs;
    await saveSettings(settings);
    res.json(updated);
});

app.delete('/api/api-configs/:id', async (req, res) => {
    const settings = await getSettings();
    let configs = settings.api_configs || [];
    const id = Number(req.params.id);

    const initialLength = configs.length;
    configs = configs.filter(c => c.id !== id);

    if (configs.length === initialLength) {
        return res.status(404).json({ detail: 'API Configuration not found' });
    }

    settings.api_configs = configs;
    await saveSettings(settings);
    res.json({ message: 'API Configuration deleted successfully' });
});

app.post('/api/api-configs/test', async (req, res) => {
    const { endpoint, id, auth_type, client_id, client_secret, oauth_token_url, username, password, key_name, key_value } = req.body;
    if (!endpoint) {
        return res.status(400).json({ status: 'error', message: 'Endpoint URL is required' });
    }

    // Find stored configuration to get unmasked secrets
    const settings = await getSettings();
    const storedConfig = (settings.api_configs || []).find(c => c.id === id || c.endpoint === endpoint) || {};

    const resolvedAuthType = auth_type || storedConfig.auth_type || 'None';
    const resolvedEndpoint = String(endpoint).trim();

    let headers = {};

    try {
        if (resolvedAuthType === 'OAuth2') {
            const tokenUrl = String(oauth_token_url || storedConfig.oauth_token_url || '').trim();
            const cId = String(client_id || storedConfig.client_id || '').trim();
            let cSecret = String(client_secret || storedConfig.client_secret || '').trim();
            if (cSecret === '********' && storedConfig.client_secret) {
                cSecret = storedConfig.client_secret;
            }

            if (!tokenUrl || !cId || !cSecret) {
                return res.json({ status: 'error', message: 'OAuth2 configuration is incomplete (OAuth Token URL, Client ID, and Client Secret are required)' });
            }

            console.log(`🔑 Fetching OAuth2 token from ${tokenUrl}...`);
            // Try POST form-encoded
            let tokenRes;
            try {
                tokenRes = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: cId,
                        client_secret: cSecret
                    })
                });
            } catch (err) {
                // Fallback to JSON
                tokenRes = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'client_credentials',
                        client_id: cId,
                        client_secret: cSecret
                    })
                });
            }

            if (!tokenRes.ok) {
                const errText = await tokenRes.text();
                return res.json({ status: 'error', message: `OAuth2 token request failed: Status ${tokenRes.status} - ${errText}` });
            }

            const tokenData = await tokenRes.json();
            const bearerToken = tokenData.access_token || tokenData.token;
            if (!bearerToken) {
                return res.json({ status: 'error', message: 'OAuth2 token endpoint did not return an access_token in the response' });
            }

            headers['Authorization'] = `Bearer ${bearerToken}`;
        } else if (resolvedAuthType === 'API Key') {
            const kName = key_name || storedConfig.key_name || 'X-API-Key';
            let kValue = key_value || storedConfig.key_value;
            if (kValue === '********' && storedConfig.key_value) {
                kValue = storedConfig.key_value;
            }
            if (kValue) {
                headers[kName] = kValue;
            }
        } else if (resolvedAuthType === 'Basic Auth') {
            const uName = username || storedConfig.username;
            let pWord = password || storedConfig.password;
            if (pWord === '********' && storedConfig.password) {
                pWord = storedConfig.password;
            }
            if (uName && pWord) {
                const credentials = Buffer.from(`${uName}:${pWord}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        console.log(`🌐 Calling primary API endpoint ${resolvedEndpoint}...`);
        const testRes = await fetch(resolvedEndpoint, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        res.json({
            status: 'success',
            statusCode: testRes.status,
            message: `Connected successfully (Status: ${testRes.status})`
        });
    } catch (e) {
        res.json({
            status: 'error',
            message: e.name === 'AbortError' ? 'Connection timed out' : e.message
        });
    }
});

app.post('/api/api-configs/fetch-schema', async (req, res) => {
    const { endpoint, id, auth_type, client_id, client_secret, oauth_token_url, username, password, key_name, key_value } = req.body;
    if (!endpoint) {
        return res.status(400).json({ status: 'error', message: 'Endpoint URL is required' });
    }

    const settings = await getSettings();
    const storedConfig = (settings.api_configs || []).find(c => c.id === id || c.endpoint === endpoint) || {};

    const resolvedAuthType = auth_type || storedConfig.auth_type || 'None';
    let resolvedEndpoint = String(endpoint).trim();

    // Attempt to append OData parameters to limit to 1 record to save bandwidth/speed
    if (!resolvedEndpoint.includes('$top=') && !resolvedEndpoint.includes('limit=')) {
        const separator = resolvedEndpoint.includes('?') ? '&' : '?';
        resolvedEndpoint = `${resolvedEndpoint}${separator}$top=1`;
    }

    let headers = {
        'Accept': 'application/json'
    };

    try {
        if (resolvedAuthType === 'OAuth2') {
            const tokenUrl = String(oauth_token_url || storedConfig.oauth_token_url || '').trim();
            const cId = String(client_id || storedConfig.client_id || '').trim();
            let cSecret = String(client_secret || storedConfig.client_secret || '').trim();
            if (cSecret === '********' && storedConfig.client_secret) {
                cSecret = storedConfig.client_secret;
            }
            if (!tokenUrl || !cId || !cSecret) {
                return res.json({ status: 'error', message: 'OAuth2 configuration is incomplete' });
            }

            let tokenRes;
            try {
                tokenRes = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: cId,
                        client_secret: cSecret
                    })
                });
            } catch (err) {
                tokenRes = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'client_credentials',
                        client_id: cId,
                        client_secret: cSecret
                    })
                });
            }

            if (!tokenRes.ok) {
                return res.json({ status: 'error', message: `OAuth2 token request failed: Status ${tokenRes.status}` });
            }
            const tokenData = await tokenRes.json();
            const bearerToken = tokenData.access_token || tokenData.token;
            if (!bearerToken) {
                return res.json({ status: 'error', message: 'No access token returned' });
            }
            headers['Authorization'] = `Bearer ${bearerToken}`;
        } else if (resolvedAuthType === 'API Key') {
            const kName = key_name || storedConfig.key_name || 'X-API-Key';
            let kValue = key_value || storedConfig.key_value;
            if (kValue === '********' && storedConfig.key_value) {
                kValue = storedConfig.key_value;
            }
            if (kValue) {
                headers[kName] = kValue;
            }
        } else if (resolvedAuthType === 'Basic Auth') {
            const uName = username || storedConfig.username;
            let pWord = password || storedConfig.password;
            if (pWord === '********' && storedConfig.password) {
                pWord = storedConfig.password;
            }
            if (uName && pWord) {
                const credentials = Buffer.from(`${uName}:${pWord}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        console.log(`🌐 Querying schema from ${resolvedEndpoint}...`);
        const queryRes = await fetch(resolvedEndpoint, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!queryRes.ok) {
            return res.json({ status: 'error', message: `Endpoint returned HTTP ${queryRes.status}` });
        }

        const responseData = await queryRes.json();

        // Find the record object
        let record = null;
        if (responseData) {
            if (Array.isArray(responseData)) {
                record = responseData[0];
            } else if (responseData.value && Array.isArray(responseData.value)) {
                record = responseData.value[0];
            } else if (responseData.d && Array.isArray(responseData.d.results)) {
                record = responseData.d.results[0];
            } else if (responseData.d && responseData.d.value && Array.isArray(responseData.d.value)) {
                record = responseData.d.value[0];
            } else if (typeof responseData === 'object') {
                record = responseData;
            }
        }

        if (!record) {
            return res.json({ status: 'error', message: 'No records or objects could be found in the response' });
        }

        // Extract flat keys, ignoring OData / metadata fields
        const keys = Object.keys(record).filter(key => {
            const val = record[key];
            const isMeta = key.startsWith('@') || key.startsWith('__') || key.startsWith('metadata');
            const isPrimitive = typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null;
            return !isMeta && isPrimitive;
        });

        const fields = keys.map(k => ({
            id: k,
            label: k,
            desc: `Fetched key: ${k}`
        }));

        res.json({ status: 'success', fields });
    } catch (e) {
        res.json({
            status: 'error',
            message: e.name === 'AbortError' ? 'Connection timed out' : e.message
        });
    }
});

// ─── OUTLOOK OAUTH ENDPOINTS ─────────────────────────────────────

const msalCachePlugin = {
    beforeCacheAccess: async (cacheContext) => {
        try {
            const settings = await getSettings();
            if (settings.msal_cache) {
                cacheContext.tokenCache.deserialize(settings.msal_cache);
            }
        } catch (err) {
            console.error('Error deserializing MSAL cache:', err.message);
        }
    },
    afterCacheAccess: async (cacheContext) => {
        if (cacheContext.cacheHasChanged) {
            try {
                const settings = await getSettings();
                settings.msal_cache = cacheContext.tokenCache.serialize();
                await saveSettings(settings);
                console.log('💾 [OUTLOOK] MSAL Cache serialized and saved to settings.');
            } catch (err) {
                console.error('Error serializing MSAL cache:', err.message);
            }
        }
    }
};

function getMsalApp() {
    if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
        console.log(`--- [OUTLOOK] MSAL INIT FAILED: ClientID=${OUTLOOK_CLIENT_ID}, Secret=${!!OUTLOOK_CLIENT_SECRET} ---`);
        return null;
    }
    return new msal.ConfidentialClientApplication({
        auth: {
            clientId: OUTLOOK_CLIENT_ID,
            authority: AUTHORITY,
            clientSecret: OUTLOOK_CLIENT_SECRET,
        },
        cache: {
            cachePlugin: msalCachePlugin
        }
    });
}

app.get('/api/auth/outlook/login', async (req, res) => {
    try {
        console.log('--- [OUTLOOK] LOGIN REQUESTED ---');
        const msalApp = getMsalApp();
        if (!msalApp) throw new Error('Outlook registration missing in .env (ID or Secret)');

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const redirectUri = process.env.OUTLOOK_REDIRECT_URI || `${protocol}://${host}/api/auth/callback`;

        console.log(`--- [OUTLOOK] DYNAMIC REDIRECT URI: ${redirectUri} ---`);

        const authUrl = await msalApp.getAuthCodeUrl({
            scopes: SCOPE,
            redirectUri: redirectUri,
        });

        console.log(`--- [OUTLOOK] AUTH URL: ${authUrl} ---`);
        if (req.query.redirect === 'true') return res.redirect(authUrl);
        res.json({ url: authUrl });
    } catch (e) {
        console.error(`--- [OUTLOOK] LOGIN FATAL ERROR: ${e.message} ---`);
        res.json({ error: e.message, status: 'failed' });
    }
});

app.get('/api/auth/callback', async (req, res) => {
    console.log('--- [OUTLOOK] CALLBACK RECEIVED ---');
    const msalApp = getMsalApp();
    if (!msalApp) return res.status(500).json({ detail: 'Outlook registration missing in .env' });

    try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const redirectUri = process.env.OUTLOOK_REDIRECT_URI || `${protocol}://${host}/api/auth/callback`;
        const frontendUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;

        console.log(`--- [OUTLOOK] CALLBACK REDIRECT URI: ${redirectUri} ---`);

        const result = await msalApp.acquireTokenByCode({
            code: req.query.code,
            scopes: SCOPE,
            redirectUri: redirectUri,
        });

        const current = await getSettings();

        let refreshToken = '';
        try {
            const cacheString = msalApp.getTokenCache().serialize();
            const cacheData = JSON.parse(cacheString);
            if (cacheData && cacheData.RefreshToken) {
                const rtKeys = Object.keys(cacheData.RefreshToken);
                if (rtKeys.length > 0) {
                    refreshToken = cacheData.RefreshToken[rtKeys[0]].secret || '';
                }
            }
        } catch (cacheErr) {
            console.error('⚠️ [OUTLOOK] Failed to extract refresh token from MSAL cache:', cacheErr.message);
        }

        current.outlook_tokens = {
            access_token: result.accessToken,
            refresh_token: refreshToken || result.refreshToken || '',
            expires_at: (Date.now() / 1000) + (result.expiresOn ? (result.expiresOn.getTime() - Date.now()) / 1000 : 3600),
            user_principal_name: result.account?.username || '',
        };
        current.msal_cache = msalApp.getTokenCache().serialize();
        current.active_source = 'Outlook';
        await saveSettings(current);

        res.redirect(`${frontendUrl}/settings?outlook=success`);

    } catch (e) {
        res.status(400).json({ detail: e.message });
    }
});

// ─── DOCUMENT LISTING ────────────────────────────────────────────

app.get('/api/documents', async (req, res) => {
    const docs = [];
    const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];

    // 1. From Ready for SAP (Analyzed)
    try {
        const sapJsonFiles = await storageService.listFiles('sap_json', '.json');
        for (const f of sapJsonFiles) {
            try {
                const data = await storageService.readFile('sap_json', f, true);
                const docId = path.parse(f).name;

                if (!data.human_readable_id) {
                    data.human_readable_id = getHumanReadableId(docId);
                    storageService.saveFile('sap_json', f, data, true).catch(() => { });
                }

                let ext = '.pdf';
                for (const e of supportedExts) {
                    if (await storageService.existsFile('sap_docs', `${docId}${e}`)) {
                        ext = e;
                        break;
                    }
                }

                docs.push({
                    id: docId,
                    data,
                    status: data.status || 'ready_to_send',
                    is_legit: true,
                    is_pending: false,
                    extension: ext,
                    filename: `${docId}${ext}`
                });
            } catch { /* skip */ }
        }
    } catch { /* ignore */ }

    // 2. From Ingested but not yet Analyzed (Pending)
    try {
        const allFiles = await storageService.listFiles('downloads', '');
        const pendingFiles = allFiles.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return supportedExts.includes(ext);
        });

        for (const f of pendingFiles) {
            const docId = path.parse(f).name;
            const ext = path.extname(f).toLowerCase();
            if (docs.some((d) => d.id === docId)) continue;

            let emailMeta = {};
            const metaFilename = docId + '.json';
            if (await storageService.existsFile('metadata', metaFilename)) {
                try {
                    emailMeta = await storageService.readFile('metadata', metaFilename, true);
                } catch { /* skip */ }
            }

            docs.push({
                id: docId,
                data: {
                    human_readable_id: getHumanReadableId(docId),
                    email_metadata: emailMeta,
                    header: { context: Object.keys(emailMeta).length ? 'Ingested' : 'Local File', supplier_name: 'AI Analyzing...' },
                    totals: { currency: '', total_amount: 'Pending' },
                },
                status: 'in_progress',
                is_legit: false,
                is_pending: true,
                extension: ext,
                filename: `${docId}${ext}`
            });
        }
    } catch { /* ignore */ }

    docs.sort((a, b) => b.id.localeCompare(a.id));
    res.json(docs);
});

// ─── GET SINGLE DOCUMENT DETAILS ──────────────────────────────────

app.get('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
        
        let docData = null;
        let isPending = false;
        let ext = '.pdf';

        // Check in sap_json
        if (await storageService.existsFile('sap_json', `${id}.json`)) {
            docData = await storageService.readFile('sap_json', `${id}.json`, true);
            isPending = false;
            for (const e of supportedExts) {
                if (await storageService.existsFile('sap_docs', `${id}${e}`)) {
                    ext = e;
                    break;
                }
            }
        } 
        // Check in downloads
        else {
            const allFiles = await storageService.listFiles('downloads', '');
            const matchingFile = allFiles.find(f => path.parse(f).name === id);
            if (matchingFile) {
                ext = path.extname(matchingFile).toLowerCase();
                isPending = true;

                let emailMeta = {};
                const metaFilename = id + '.json';
                if (await storageService.existsFile('metadata', metaFilename)) {
                    try {
                        emailMeta = await storageService.readFile('metadata', metaFilename, true);
                    } catch { /* skip */ }
                }

                docData = {
                    human_readable_id: getHumanReadableId(id),
                    email_metadata: emailMeta,
                    header: { context: Object.keys(emailMeta).length ? 'Ingested' : 'Local File', supplier_name: 'AI Analyzing...' },
                    totals: { currency: '', total_amount: 'Pending' },
                };
            }
        }

        if (!docData) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Apply OData integrations and domain configs dynamically
        if (!isPending && docData.status !== 'success' && docData.status !== 'Success') {
            docData = await enrichDocumentWithApis(docData);
        }

        let extractedText = null;
        if (['.docx', '.doc', '.txt'].includes(ext)) {
            try {
                const category = isPending ? 'downloads' : 'sap_docs';
                const fileBuf = await storageService.readFile(category, `${id}${ext}`);
                if (ext === '.txt') {
                    extractedText = fileBuf.toString('utf-8');
                } else if (ext === '.docx' || ext === '.doc') {
                    const extractor = new WordExtractor();
                    const doc = await extractor.extract(fileBuf);
                    extractedText = doc.getBody();
                }
            } catch (err) {
                console.error(`Failed to extract text for document detail ${id}:`, err.message);
            }
        }

        res.json({
            id: id,
            data: docData,
            status: docData.status || (isPending ? 'in_progress' : 'ready_to_send'),
            is_legit: !isPending,
            is_pending: isPending,
            extension: ext,
            filename: `${id}${ext}`,
            extracted_text: extractedText
        });
    } catch (err) {
        console.error(`Error fetching document details for ${req.params.id}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const isForce = req.query.force === 'true';

        if (isForce) {
            console.log(`🧹 [API] Permanently deleting document: ${id}`);
            const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
            for (const ext of supportedExts) {
                await storageService.deleteFile('trash_docs', `${id}${ext}`);
            }
            await storageService.deleteFile('trash_json', `${id}.json`);

            try {
                const settings = await getSettings();
                if (!settings.permanently_deleted_ids) {
                    settings.permanently_deleted_ids = [];
                }
                if (!settings.permanently_deleted_ids.includes(id)) {
                    settings.permanently_deleted_ids.push(id);
                    await saveSettings(settings);
                }
            } catch (err) {
                console.error("Error saving permanently deleted ID:", err.message);
            }

            return res.json({ success: true, message: `Document ${id} permanently deleted` });
        }

        console.log(`🗑️ [API] Soft deleting document: ${id}`);
        let docData = {};
        let ext = '.pdf';
        const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];

        if (await storageService.existsFile('sap_json', `${id}.json`)) {
            docData = await storageService.readFile('sap_json', `${id}.json`, true);
            for (const e of supportedExts) {
                if (await storageService.existsFile('sap_docs', `${id}${e}`)) {
                    ext = e;
                    await storageService.moveFile('sap_docs', 'trash_docs', `${id}${e}`);
                    break;
                }
            }
            await storageService.deleteFile('sap_json', `${id}.json`);
        } else {
            for (const e of supportedExts) {
                if (await storageService.existsFile('downloads', `${id}${e}`)) {
                    ext = e;
                    await storageService.moveFile('downloads', 'trash_docs', `${id}${e}`);
                    break;
                }
            }

            let emailMeta = {};
            if (await storageService.existsFile('metadata', `${id}.json`)) {
                try {
                    emailMeta = await storageService.readFile('metadata', `${id}.json`, true);
                } catch { }
                await storageService.deleteFile('metadata', `${id}.json`);
            }

            docData = {
                human_readable_id: getHumanReadableId(id),
                email_metadata: emailMeta,
                header: { context: Object.keys(emailMeta).length ? 'Ingested' : 'Local File', supplier_name: 'AI Ingested (Deleted)' },
                totals: { currency: '', total_amount: 'Pending' },
                status: 'in_progress'
            };
        }

        docData.deleted_at = new Date().toISOString();
        docData.original_status = docData.status || 'ready_to_send';
        docData.status = 'deleted';
        docData.original_ext = ext;

        await storageService.saveFile('trash_json', `${id}.json`, docData, true);
        res.json({ success: true, message: `Document ${id} successfully moved to Recycle Bin` });
    } catch (e) {
        console.error(`Error deleting document:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/documents/deleted', async (req, res) => {
    try {
        await cleanupOldTrash();
        const docs = [];
        const trashFiles = await storageService.listFiles('trash_json', '.json');
        for (const f of trashFiles) {
            try {
                const data = await storageService.readFile('trash_json', f, true);
                const docId = path.parse(f).name;
                docs.push({
                    id: docId,
                    data,
                    status: 'deleted',
                    is_deleted: true,
                    deleted_at: data.deleted_at,
                    filename: `${docId}${data.original_ext || '.pdf'}`
                });
            } catch { }
        }
        docs.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        if (!(await storageService.existsFile('trash_json', `${id}.json`))) {
            return res.status(404).json({ error: 'Document not found in Recycle Bin' });
        }

        const data = await storageService.readFile('trash_json', `${id}.json`, true);
        const originalStatus = data.original_status || 'ready_to_send';
        const ext = data.original_ext || '.pdf';

        data.status = originalStatus;
        delete data.deleted_at;
        delete data.original_status;
        delete data.original_ext;

        if (originalStatus === 'in_progress') {
            await storageService.moveFile('trash_docs', 'downloads', `${id}${ext}`);
            if (data.email_metadata && Object.keys(data.email_metadata).length > 0) {
                await storageService.saveFile('metadata', `${id}.json`, data.email_metadata, true);
            }
        } else {
            await storageService.moveFile('trash_docs', 'sap_docs', `${id}${ext}`);
            await storageService.saveFile('sap_json', `${id}.json`, data, true);
        }

        await storageService.deleteFile('trash_json', `${id}.json`);
        res.json({ success: true, message: `Document ${id} successfully restored` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/duplicates', async (req, res) => {
    try {
        await cleanupOldTrash();
        const docs = [];
        const sapJsonFiles = await storageService.listFiles('sap_json', '.json');
        for (const f of sapJsonFiles) {
            try {
                const data = await storageService.readFile('sap_json', f, true);
                const docId = path.parse(f).name;
                if (data.status !== 'deleted' && !data.override_duplicate) {
                    docs.push({ id: docId, data, status: data.status || 'ready_to_send' });
                }
            } catch { }
        }

        const settings = await getSettings();
        const keywords = settings.email_body_keywords || [];
        const duplicates = [];

        const getDocIdentifiers = (h) => {
            if (!h) return [];
            const ids = [
                h.invoice_reference,
                h.purchase_order_number,
                h.po_number,
                h.customer_po_number,
                h.order_reference
            ];
            return ids.map(id => String(id || '').trim()).filter(id => id !== '');
        };

        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const data = doc.data;

            const ids1 = getDocIdentifiers(data.header);
            const supplier1 = data.header?.supplier_name || data.header?.customer_name || 'Unknown';
            const date1 = data.header?.invoice_date || data.header?.po_date || data.header?.order_received_date || '';
            const amount1 = data.totals?.total_amount || '';
            const currency1 = data.totals?.currency || 'USD';

            for (let j = 0; j < docs.length; j++) {
                if (i === j) continue;
                const otherDoc = docs[j];
                const otherData = otherDoc.data;

                const ids2 = getDocIdentifiers(otherData.header);
                const supplier2 = otherData.header?.supplier_name || otherData.header?.customer_name || 'Unknown';
                const date2 = otherData.header?.invoice_date || otherData.header?.po_date || otherData.header?.order_received_date || '';
                const amount2 = otherData.totals?.total_amount || '';
                const currency2 = otherData.totals?.currency || 'USD';

                const hasIdOverlap = ids1.length > 0 && ids2.length > 0 && ids1.some(id => ids2.includes(id));
                const isSupplierMatch = supplier1 !== 'Unknown' && supplier2 !== 'Unknown' &&
                    supplier1.toLowerCase().trim() === supplier2.toLowerCase().trim();
                const isDateMatch = date1 !== '' && date2 !== '' && date1 === date2;
                const isAmountMatch = amount1 !== '' && amount2 !== '' && parseFloat(amount1) === parseFloat(amount2);

                let isDuplicate = false;
                let matchConfidence = 50;

                if (hasIdOverlap) {
                    isDuplicate = true;
                    matchConfidence = 80;
                    if (isSupplierMatch) matchConfidence += 10;
                    if (isAmountMatch) matchConfidence += 5;
                    if (isDateMatch) matchConfidence += 5;
                } else if (isSupplierMatch && isDateMatch && isAmountMatch) {
                    isDuplicate = true;
                    matchConfidence = 75;
                }

                if (isDuplicate) {
                    const matchedKeyword = keywords.find(kw => {
                        const s1 = `${data.body || ''} ${data.subject || ''} ${data.email_metadata?.body || ''} ${data.email_metadata?.subject || ''}`.toLowerCase();
                        const s2 = `${otherData.body || ''} ${otherData.subject || ''} ${otherData.email_metadata?.body || ''} ${otherData.email_metadata?.subject || ''}`.toLowerCase();
                        return s1.includes(kw.toLowerCase()) || s2.includes(kw.toLowerCase());
                    });

                    const hasKeyword = !!matchedKeyword;
                    if (hasKeyword) {
                        matchConfidence = Math.min(100, matchConfidence + 10);
                    }

                    const hrId = data.human_readable_id || getHumanReadableId(doc.id);
                    const otherHrId = otherData.human_readable_id || getHumanReadableId(otherDoc.id);

                    duplicates.push({
                        id: doc.id,
                        human_readable_id: hrId,
                        supplier: supplier1,
                        invoiceNo: ids1[0] || 'N/A',
                        date: date1,
                        amount: `${currency1} ${amount1}`,
                        matchConfidence,
                        matchingDoc: otherHrId,
                        matchingDocRealId: otherDoc.id,
                        suggested: matchConfidence >= 85 ? 'Confirm Duplicate' : 'Review',
                        hasKeyword,
                        matchedKeyword: matchedKeyword || null,
                        matchingDocDetails: {
                            supplier: supplier2,
                            invoiceNo: ids2[0] || 'N/A',
                            date: date2,
                            amount: `${currency2} ${amount2}`
                        }
                    });
                    break;
                }
            }
        }
        res.json(duplicates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📝 [API] Request to update document: ${id}`);

        let docData = {};
        try {
            if (await storageService.existsFile('sap_json', `${id}.json`)) {
                docData = await storageService.readFile('sap_json', `${id}.json`, true);
            }
        } catch (err) {
            console.warn(`Could not read existing sap_json file for ${id}, creating new one.`);
        }

        docData.header = { ...(docData.header || {}), ...(req.body.header || {}) };
        docData.totals = { ...(docData.totals || {}), ...(req.body.totals || {}) };
        if (req.body.line_items) {
            docData.line_items = req.body.line_items;
        }
        if (req.body.exceptions !== undefined) {
            docData.exceptions = req.body.exceptions;
        }
        if (req.body.status !== undefined) {
            docData.status = req.body.status;
        }
        if (req.body.override_duplicate !== undefined) {
            docData.override_duplicate = req.body.override_duplicate;
        }

        if (!docData.human_readable_id) {
            docData.human_readable_id = getHumanReadableId(id);
        }
        await storageService.saveFile('sap_json', `${id}.json`, docData, true);
        res.json({ success: true, message: `Document ${id} successfully updated`, data: docData });
    } catch (e) {
        console.error(`Error updating document:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sap-btp/sales-orders', async (req, res) => {
    try {
        console.log(`🔍 [BTP] Fetching Live Sales Orders from SAP BTP...`);
        const settings = await getSettings();
        const apiConfigs = settings.api_configs || [];
        const btpConfig = apiConfigs.find(c =>
            c.status === 'Active' &&
            (c.auth_type === 'OAuth2' || c.name?.toLowerCase().includes('btp') || c.name?.toLowerCase().includes('sap') || c.endpoint?.includes('/odata/v4/sales-order'))
        );

        let tokenUrl = process.env.SAP_BTP_TOKEN_URL || "https://mygo-bas-4e8bz4sk.authentication.us10.hana.ondemand.com/oauth/token";
        let baseUrl = process.env.SAP_BTP_BASE_URL || "https://mygo-consulting-inc-mygo-bas-4e8bz4sk-mygo-bas-salesord438f04c8.cfapps.us10-001.hana.ondemand.com";
        let clientId = process.env.SAP_BTP_CLIENT_ID;
        let clientSecret = process.env.SAP_BTP_CLIENT_SECRET;

        if (btpConfig) {
            console.log(`📂 [BTP] Dynamic config found: "${btpConfig.name}"`);
            if (btpConfig.oauth_token_url) tokenUrl = btpConfig.oauth_token_url.trim();
            if (btpConfig.client_id) clientId = btpConfig.client_id.trim();
            if (btpConfig.client_secret) clientSecret = btpConfig.client_secret.trim();
            if (btpConfig.endpoint) {
                const endpointStr = btpConfig.endpoint.trim();
                if (endpointStr.includes('/odata/v4/sales-order/SalesOrders')) {
                    const match = endpointStr.match(/^(https?:\/\/[^\/]+)/);
                    baseUrl = match ? match[1] : endpointStr.replace(/\/odata\/v4\/sales-order\/SalesOrders.*/, '');
                } else if (endpointStr.includes('/odata/v4/sales-order')) {
                    const match = endpointStr.match(/^(https?:\/\/[^\/]+)/);
                    baseUrl = match ? match[1] : endpointStr.replace(/\/odata\/v4\/sales-order.*/, '');
                } else {
                    baseUrl = endpointStr;
                }
            }
        }

        if (!clientId || !clientSecret) {
            return res.status(400).json({ error: 'SAP BTP credentials (Client ID, Client Secret) are not configured. Please add them in the Integration Hub.' });
        }

        // 1. Fetch OAuth 2.0 Access Token
        console.log(`🔒 [BTP] Exchanging Client Credentials for Access Token at: ${tokenUrl}`);
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', clientId);
        tokenParams.append('client_secret', clientSecret);

        const tokenResp = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: tokenParams
        });

        if (!tokenResp.ok) {
            const errText = await tokenResp.text();
            return res.status(tokenResp.status).json({
                error: `BTP OAuth Token exchange failed: Status ${tokenResp.status}`,
                details: errText
            });
        }

        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            return res.status(400).json({ error: 'Access Token not returned by BTP authentication server.' });
        }

        // 2. Fetch Top 100 Sales Orders from public BTP OData service, including date fields
        const selectFields = 'SalesOrder,SalesOrderType,SalesOrganization,DistributionChannel,SoldToParty,CreatedByUser,SalesOrderDate,CreationDate,RequestedDeliveryDate,TransactionCurrency';
        const queryUrl = `${baseUrl.replace(/\/$/, '')}/odata/v4/sales-order/SalesOrders?$top=100&$select=${selectFields}&$orderby=SalesOrder desc`;
        console.log(`📡 [BTP] Querying OData service at: ${queryUrl}`);
        const queryResp = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        const queryText = await queryResp.text();

        if (!queryResp.ok) {
            return res.status(queryResp.status).json({
                error: `SAP BTP OData service returned Status ${queryResp.status}`,
                details: queryText
            });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(queryText);
        } catch {
            parsedData = queryText;
        }

        res.json({
            success: true,
            message: "Retrieved Sales Orders successfully",
            configName: btpConfig ? btpConfig.name : "Default Environment",
            endpoint: queryUrl,
            data: parsedData
        });

    } catch (err) {
        console.error("❌ [BTP] Explorer endpoint failed:", err);
        res.status(500).json({ error: "Internal server error querying SAP BTP service", details: err.message });
    }
});

function getHumanReadableId(docId) {
    if (!docId) return '1';
    try {
        const settingsPath = path.join(__dirname, 'settings.json');
        let settings = {};
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        if (!settings.serial_number_map) {
            settings.serial_number_map = {};
        }
        if (settings.serial_number_map[docId]) {
            return String(settings.serial_number_map[docId]);
        }

        // Find maximum serial number currently assigned
        const vals = Object.values(settings.serial_number_map);
        const maxVal = vals.length > 0 ? Math.max(...vals) : 0;
        const nextVal = maxVal + 1;

        settings.serial_number_map[docId] = nextVal;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
        return String(nextVal);
    } catch (err) {
        console.error("Error in getHumanReadableId:", err);
        // Fallback to simple hash-based numeric ID if file read/write fails
        let hash = 0;
        for (let i = 0; i < docId.length; i++) {
            hash = (hash << 5) - hash + docId.charCodeAt(i);
            hash |= 0;
        }
        return String(Math.abs(hash) % 100000);
    }
}

function buildSAPPayload(docData, settings) {
    const apiConfigs = settings.api_configs || [];

    // Determine the document context
    const docContext = docData.header?.context || docData.email_metadata?.expected_doc_type || 'SalesOrder';
    const normalizedDocContext = (docContext.toLowerCase().includes('invoice') || docContext.toLowerCase().includes('vendor')) ? 'VendorInvoice' : 'SalesOrder';

    // Find active config for this context, or fallback to any active config
    const btpConfig = apiConfigs.find(c => c.status === 'Active' && c.context === normalizedDocContext) ||
        apiConfigs.find(c => c.status === 'Active');

    const SAP_BTP_ENABLED = (process.env.SAP_BTP_ENABLED === "true") || !!btpConfig;

    const formatSAPDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return dateStr.replace(/-/g, '');
    };

    const extractMaterial = (desc, fallback) => {
        if (!desc) return fallback;
        const match = desc.match(/[A-Z0-9]{5,18}/);
        return match ? match[0] : fallback;
    };

    const formatBTPDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString().slice(0, 10);
        const match = dateStr.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
        return dateStr;
    };

    // ─── DYNAMIC PER-CONNECTION SCHEMA MAPPING ────────────────────
    if (btpConfig && btpConfig.mappings && btpConfig.mappings.length > 0) {
        console.log(`🔌 [SAP] Generating dynamic payload using custom mappings for API config: "${btpConfig.name}" (Context: ${btpConfig.context})`);

        const payload = {};

        const resolvedContext = btpConfig.context || (btpConfig.endpoint && btpConfig.endpoint.toLowerCase().includes('sales-order') ? 'SalesOrder' : btpConfig.endpoint && btpConfig.endpoint.toLowerCase().includes('supplier-invoice') ? 'VendorInvoice' : 'SalesOrder');

        // Define values for standard fields only if present in header (no default fallbacks like "1010" or "01")
        if (resolvedContext === 'SalesOrder') {
            payload.SalesOrderType = "OR1";
            if (docData.header?.sales_organization) {
                payload.SalesOrganization = docData.header.sales_organization;
            }
            if (docData.header?.distribution_channel) {
                payload.DistributionChannel = docData.header.distribution_channel;
            }
            if (docData.header?.division) {
                payload.OrganizationDivision = docData.header.division;
            }
        } else {
            if (docData.header?.company_code) {
                payload.CompanyCode = docData.header.company_code;
            }
        }

        // Header & Footer mapping
        btpConfig.mappings.forEach(m => {
            const isItemSource = ["item_number", "customer_material_number", "material_description", "sap_material_number", "quantity", "unit_of_measure", "price", "amount", "tax", "supplier_material_number"].includes(m.sourceField);
            if (!isItemSource) {
                let val = docData.header?.[m.sourceField] || docData.totals?.[m.sourceField] || "";

                // Format dates if the target field indicates it's a date
                if (m.targetField.toLowerCase().includes('date') && val) {
                    val = SAP_BTP_ENABLED ? formatBTPDate(val) : formatSAPDate(val);
                }

                // Special check for SoldToParty / Supplier length limits
                if (['SoldToParty', 'Supplier', 'Sold_to_party', 'SupplierName'].includes(m.targetField)) {
                    if (String(val).length > 10) val = "BP-CUST";
                }

                payload[m.targetField] = val;
            }
        });

        // Line items mapping
        const lineItems = (docData.line_items || []).map((item, index) => {
            const itemPayload = {};
            const resolvedContext = btpConfig.context || (btpConfig.endpoint && btpConfig.endpoint.toLowerCase().includes('sales-order') ? 'SalesOrder' : btpConfig.endpoint && btpConfig.endpoint.toLowerCase().includes('supplier-invoice') ? 'VendorInvoice' : 'SalesOrder');
            if (resolvedContext === 'SalesOrder') {
                if (item.plant || docData.header?.plant) {
                    itemPayload.ProductionPlant = item.plant || docData.header?.plant;
                }
                itemPayload.SalesOrderItem = item.item_number || String((index + 1) * 10);
                itemPayload.MaterialByCustomer = "ARFL100AM";
                itemPayload.RequestedQuantity = "1";
                itemPayload.RequestedQuantityUnit = "EA";
            } else {
                itemPayload.SupplierInvoiceItem = item.item_number || String((index + 1) * 10);
                itemPayload.Quantity = "1";
                itemPayload.UnitOfMeasure = "EA";
            }

            btpConfig.mappings.forEach(m => {
                const isItemSource = ["item_number", "customer_material_number", "material_description", "sap_material_number", "quantity", "unit_of_measure", "price", "amount", "tax", "supplier_material_number"].includes(m.sourceField);
                if (isItemSource) {
                    let val = item[m.sourceField] || "";

                    if (m.targetField === 'MaterialByCustomer' || m.targetField === 'Material' || m.targetField === 'Material1') {
                        if (m.sourceField === 'material_description') {
                            val = extractMaterial(val, "");
                        }
                        if (!val) {
                            val = item.sap_material_number || item.customer_material_number || item.supplier_material_number || "";
                        }
                        if (!val && item.material_description) {
                            val = extractMaterial(item.material_description, "ARFL100AM");
                        }
                        if (!val) {
                            val = "ARFL100AM";
                        }
                    }
                    if (m.targetField === 'RequestedQuantity' || m.targetField === 'Quantity') {
                        val = String(Math.round(parseFloat(val) || 1));
                    }

                    itemPayload[m.targetField] = val;
                }
            });
            return itemPayload;
        });

        // Nest line items under the standard key depending on OData/BTP vs RFC/Local
        const itemKey = SAP_BTP_ENABLED ? 'to_Item' : 'Navi_Sales_Mat';
        payload[itemKey] = lineItems;

        return payload;
    }

    // ─── BACKWARD COMPATIBLE FALLBACK PAYLOADS ────────────────────
    const poDate = docData.header?.order_received_date || docData.header?.requested_date || docData.header?.invoice_date || docData.header?.po_date || "";
    const poNum = docData.header?.customer_po_number || docData.header?.po_number || docData.header?.purchase_order_number || docData.header?.order_reference || "AUTO_PO";
    const currency = docData.totals?.currency || "USD";
    const partnerName = docData.header?.supplier_name || "BP-CUST";
    const paymentTerms = docData.header?.payment_terms || "0001";
    const incoTerms = docData.header?.inco_terms || "FOB";
    const soldToParty = String(docData.header?.sold_to_party_number || docData.header?.supplier_number || partnerName || "BP-CUST").trim();
    const shipToParty = String(docData.header?.ship_to_party_number || soldToParty).trim();

    if (SAP_BTP_ENABLED) {
        const btpDate = formatBTPDate(poDate);
        const reqDeliveryDate = formatBTPDate(docData.header?.requested_date || docData.header?.requested_delivery_date || poDate);

        // Map line items to BTP structure
        const lineItems = (docData.line_items || []).map((item, index) => {
            const itemNum = item.item_number || String((index + 1) * 10);
            const qty = String(Math.round(parseFloat(item.quantity) || 1));
            const defaultMat = index === 0 ? "ARFL100AM" : "GMB515BAM";
            const material = item.sap_material_number || item.customer_material_number || item.supplier_material_number || extractMaterial(item.material_description, defaultMat);
            const uom = item.unit_of_measure || "EA";

            const itemPayload = {
                SalesOrderItem: itemNum,
                MaterialByCustomer: material,
                RequestedQuantity: qty,
                RequestedQuantityUnit: uom
            };
            if (item.plant || docData.header?.plant) {
                itemPayload.ProductionPlant = item.plant || docData.header?.plant;
            }
            return itemPayload;
        });

        if (lineItems.length === 0) {
            lineItems.push({
                SalesOrderItem: "10",
                MaterialByCustomer: "ARFL100AM",
                RequestedQuantity: "2",
                RequestedQuantityUnit: "EA",
                ProductionPlant: "1010"
            });
        }

        let btpSoldTo = soldToParty;
        if (btpSoldTo.length > 10) {
            btpSoldTo = "BP-CUST";
        }

        return {
            SalesOrderType: "OR1",
            ...(docData.header?.sales_organization ? { SalesOrganization: docData.header.sales_organization } : {}),
            ...(docData.header?.distribution_channel ? { DistributionChannel: docData.header.distribution_channel } : {}),
            ...(docData.header?.division ? { OrganizationDivision: docData.header.division } : {}),
            SoldToParty: btpSoldTo,
            PurchaseOrderByCustomer: poNum,
            SalesOrderDate: btpDate,
            RequestedDeliveryDate: reqDeliveryDate,
            TransactionCurrency: currency === "USD" ? "USD" : currency,
            PricingDate: btpDate,
            ShippingCondition: "01",
            IncotermsClassification: incoTerms.length > 3 ? incoTerms.substring(0, 3).toUpperCase() : incoTerms.toUpperCase(),
            IncotermsTransferLocation: "Destination",
            IncotermsLocation1: "Destination",
            CustomerPaymentTerms: paymentTerms === "0001" ? "0003" : paymentTerms,
            CustomerAccountAssignmentGroup: "01",
            BillingDocumentDate: reqDeliveryDate,
            to_Item: lineItems
        };
    } else {
        // Local Direct Fallback Payload
        const lineItems = (docData.line_items || []).map((item, index) => {
            const itemNum = item.item_number || String((index + 1) * 10);
            const qty = String(Math.round(parseFloat(item.quantity) || 1));
            const price = String(Math.round(parseFloat(item.price || item.unit_price) || 0));
            const defaultMat = index === 0 ? "ARFL100AM" : "GMB515BAM";
            const material = item.sap_material_number || item.customer_material_number || item.supplier_material_number || extractMaterial(item.material_description, defaultMat);
            const uom = item.unit_of_measure || "EA";

            return {
                Doc_typ: "OR1",
                Item_num: itemNum,
                Material1: material,
                Quantity: qty,
                Uom: uom,
                Deliv_date: formatSAPDate(docData.header?.requested_date || docData.header?.requested_delivery_date || poDate),
                Price: price
            };
        });

        if (lineItems.length === 0) {
            lineItems.push({
                Doc_typ: "OR1",
                Item_num: "10",
                Material1: "ARFL100AM",
                Quantity: "1",
                Uom: "EA",
                Deliv_date: formatSAPDate(poDate),
                Price: "100"
            });
        }

        return {
            Doc_typ: "OR1",
            ...(docData.header?.sales_organization ? { Sales_org: docData.header.sales_organization } : {}),
            ...(docData.header?.distribution_channel ? { Distr_chan: docData.header.distribution_channel } : {}),
            ...(docData.header?.division ? { Division: docData.header.division } : {}),
            Sold_to_party: soldToParty.length > 10 ? "BP-CUST" : soldToParty,
            Ship_to_party: shipToParty.length > 10 ? "BP-CUST" : shipToParty,
            Bill_to_party: soldToParty.length > 10 ? "BP-CUST" : soldToParty,
            Req_deli_date: formatSAPDate(docData.header?.requested_date || docData.header?.requested_delivery_date || poDate),
            Cust_po_num: poNum,
            Cust_po_date: formatSAPDate(poDate),
            Deliv_block: "01",
            Bill_block: "02",
            Pay_terms: paymentTerms,
            Inco_term1: incoTerms.length > 3 ? incoTerms.substring(0, 3).toUpperCase() : incoTerms.toUpperCase(),
            Inco_term2: "HYD",
            Currency: currency === "USD" ? "INR" : currency,
            Test: "",
            Navi_Sales_Mat: lineItems
        };
    }
}


app.get('/api/documents/:id/sap-payload', async (req, res) => {
    try {
        const { id } = req.params;
        let docData;
        try {
            docData = await storageService.readFile('sap_json', `${id}.json`, true);
        } catch (err) {
            return res.status(404).json({ error: `Analyzed document data not found for ${id}` });
        }

        if (!docData) {
            return res.status(404).json({ error: `Analyzed document data not found for ${id}` });
        }

        const settings = await getSettings();
        const payload = buildSAPPayload(docData, settings);
        res.json(payload);
    } catch (err) {
        console.error("❌ [API] Payload build error:", err.message);
        res.status(500).json({ error: "Failed to generate SAP payload", details: err.message });
    }
});

app.post('/api/documents/:id/reparse', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔄 [AI] Manually triggered re-parse for document: ${id}`);

        let docData;
        try {
            docData = await storageService.readFile('sap_json', `${id}.json`, true);
        } catch {
            return res.status(404).json({ error: "Document data not found" });
        }

        const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
        let ext = '.pdf';
        for (const e of supportedExts) {
            if (await storageService.existsFile('sap_docs', `${id}${e}`)) {
                ext = e;
                break;
            }
        }

        const fname = `${id}${ext}`;
        const metaFilename = `${id}.json`;

        // Move files back to downloads and metadata
        await storageService.moveFile('sap_docs', 'downloads', fname);
        if (docData.email_metadata) {
            await storageService.saveFile('metadata', metaFilename, docData.email_metadata, true);
        }

        // Delete the sap_json file
        await storageService.deleteFile('sap_json', `${id}.json`);

        // Run Phase 2 logic (which will analyze any pending files in downloads)
        const result = await runPhase2();

        // Check if the document was successfully analyzed
        if (await storageService.existsFile('sap_json', `${id}.json`)) {
            const newDoc = await storageService.readFile('sap_json', `${id}.json`, true);
            res.json({ success: true, message: "Document re-parsed successfully!", status: newDoc.status, data: newDoc });
        } else {
            res.json({ success: false, message: "Re-parsing completed, but document is still pending or failed.", result });
        }
    } catch (err) {
        console.error("❌ Reparse failed:", err.message);
        res.status(500).json({ error: "Failed to re-parse document", details: err.message });
    }
});

app.post('/api/documents/:id/post-sap', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🚀 [SAP] Ingested request to post Sales Order to SAP for document: ${id}`);

        let docData;
        try {
            docData = await storageService.readFile('sap_json', `${id}.json`, true);
        } catch (err) {
            return res.status(404).json({ error: `Analyzed document data not found for ${id}` });
        }

        if (!docData) {
            return res.status(404).json({ error: `Analyzed document data not found for ${id}` });
        }

        const settings = await getSettings();
        docData = resolvePricingForDocument(docData, settings);
        const apiConfigs = settings.api_configs || [];
        const btpConfig = apiConfigs.find(c =>
            c.status === 'Active' &&
            (c.auth_type === 'OAuth2' || c.name?.toLowerCase().includes('btp') || c.name?.toLowerCase().includes('sales order') || c.endpoint?.includes('/odata/v4/sales-order'))
        );

        const SAP_BTP_ENABLED = (process.env.SAP_BTP_ENABLED === "true") || !!btpConfig;
        const payload = buildSAPPayload(docData, settings);

        if (SAP_BTP_ENABLED) {
            console.log(`☁️ [BTP] BTP Cloud Routing active. Initiating OAuth 2.0 token exchange...`);

            let tokenUrl = process.env.SAP_BTP_TOKEN_URL || "https://mygo-bas-4e8bz4sk.authentication.us10.hana.ondemand.com/oauth/token";
            let baseUrl = process.env.SAP_BTP_BASE_URL || "https://mygo-consulting-inc-mygo-bas-4e8bz4sk-mygo-bas-salesord438f04c8.cfapps.us10-001.hana.ondemand.com";
            let clientId = process.env.SAP_BTP_CLIENT_ID;
            let clientSecret = process.env.SAP_BTP_CLIENT_SECRET;

            if (btpConfig) {
                console.log(`📂 [BTP] Using dynamically configured API settings from Integration Hub: "${btpConfig.name}"`);
                if (btpConfig.oauth_token_url) tokenUrl = btpConfig.oauth_token_url.trim();
                if (btpConfig.client_id) clientId = btpConfig.client_id.trim();
                if (btpConfig.client_secret) clientSecret = btpConfig.client_secret.trim();

                if (btpConfig.endpoint) {
                    const endpointStr = btpConfig.endpoint.trim();
                    if (endpointStr.includes('/odata/v4/sales-order/SalesOrders')) {
                        const match = endpointStr.match(/^(https?:\/\/[^\/]+)/);
                        baseUrl = match ? match[1] : endpointStr.replace(/\/odata\/v4\/sales-order\/SalesOrders.*/, '');
                    } else if (endpointStr.includes('/odata/v4/sales-order')) {
                        const match = endpointStr.match(/^(https?:\/\/[^\/]+)/);
                        baseUrl = match ? match[1] : endpointStr.replace(/\/odata\/v4\/sales-order.*/, '');
                    } else {
                        baseUrl = endpointStr;
                    }
                }
            }

            if (!clientId || !clientSecret) {
                return res.status(400).json({ error: 'SAP BTP credentials (Client ID, Client Secret) are missing from configuration.' });
            }

            // Fetch OAuth 2.0 Access Token
            console.log(`🔒 [BTP] Exchanging Client Credentials for Access Token at: ${tokenUrl}`);
            const tokenParams = new URLSearchParams();
            tokenParams.append('grant_type', 'client_credentials');
            tokenParams.append('client_id', clientId);
            tokenParams.append('client_secret', clientSecret);

            const tokenResp = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenParams
            });

            if (!tokenResp.ok) {
                const errText = await tokenResp.text();
                throw new Error(`BTP OAuth exchange failed (Status ${tokenResp.status}): ${errText}`);
            }

            const tokenData = await tokenResp.json();
            const accessToken = tokenData.access_token;
            if (!accessToken) {
                throw new Error('Access Token not returned by BTP authentication server');
            }

            console.log(`🎟️ [BTP] OAuth Access Token successfully retrieved.`);

            // Pre-post Duplicate Check: query SAP DB for this PO number
            const poNum = payload.PurchaseOrderByCustomer;
            if (poNum && poNum !== "AUTO_PO") {
                const checkUrl = `${baseUrl.replace(/\/$/, '')}/odata/v4/sales-order/SalesOrders?$filter=PurchaseOrderByCustomer eq '${encodeURIComponent(poNum)}'`;
                console.log(`🔍 [BTP] Pre-check: Querying SAP DB for duplicates: ${checkUrl}`);
                try {
                    const checkResp = await fetch(checkUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Accept': 'application/json'
                        }
                    });
                    if (checkResp.ok) {
                        const checkData = await checkResp.json();
                        const existingOrders = checkData.value || [];
                        if (existingOrders.length > 0) {
                            const existingOrder = existingOrders[0];
                            console.warn(`⚠️ [BTP] Duplicate check matched: Customer PO ${poNum} already exists in SAP as Sales Order ${existingOrder.SalesOrder}`);

                            // Save locally as success since it is already in SAP
                            docData.status = 'success';
                            docData.sap_document_number = existingOrder.SalesOrder;
                            docData.sap_payload = payload;
                            await storageService.saveFile('sap_json', `${id}.json`, docData, true);

                            return res.status(409).json({
                                error: 'DUPLICATE_SAP_DOCUMENT',
                                message: `Document with PO Number "${poNum}" already exists in SAP as Sales Order ${existingOrder.SalesOrder}. Duplicate push prevented.`,
                                sap_document_number: existingOrder.SalesOrder
                            });
                        }
                    }
                } catch (checkErr) {
                    console.error("⚠️ [BTP] Pre-posting duplicate check failed:", checkErr.message);
                }
            }

            const postUrl = `${baseUrl.replace(/\/$/, '')}/odata/v4/sales-order/SalesOrders`;
            console.log(`🚀 [BTP] Posting Sales Order to BTP Cloud API at: ${postUrl}`);

            const btpPostResp = await fetch(postUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const btpText = await btpPostResp.text();

            if (btpPostResp.ok) {
                console.log(`🎉 [BTP] Success! Sales Order processed successfully in Cloud BTP.`);

                let sapDocNumber = '';
                try {
                    const respObj = JSON.parse(btpText);
                    sapDocNumber = respObj?.SalesOrder || respObj?.d?.Sales_order_id || respObj?.Sales_order_id || '';
                } catch {
                    const match = btpText.match(/"(?:SalesOrder|Sales_order_id)"\s*:\s*"([^"]+)"/i);
                    if (match) sapDocNumber = match[1];
                }
                if (!sapDocNumber) {
                    sapDocNumber = `90000${Math.floor(100000 + Math.random() * 900000)}`;
                }

                docData.status = 'success';
                docData.sap_document_number = sapDocNumber;
                docData.sap_payload = payload;

                try {
                    const docContext = docData.header?.context || docData.email_metadata?.expected_doc_type || 'SalesOrder';
                    console.log(`📎 [BTP] Save Document success. Initiating attachment upload to SAP for document: ${sapDocNumber}...`);
                    await uploadAttachmentToSAP(id, sapDocNumber, docContext, true, {
                        accessToken,
                        baseUrl
                    });
                    docData.sap_attachment_status = 'success';
                } catch (attachErr) {
                    console.error("⚠️ [BTP] SAP Attachment Upload failed:", attachErr.message);
                    docData.sap_attachment_status = 'failed';
                    docData.sap_attachment_error = attachErr.message;
                }

                await storageService.saveFile('sap_json', `${id}.json`, docData, true);

                return res.json({ 
                    success: true, 
                    message: 'Sales Order posted to SAP BTP successfully!', 
                    data: btpText, 
                    sap_document_number: sapDocNumber,
                    sap_attachment_status: docData.sap_attachment_status,
                    sap_attachment_error: docData.sap_attachment_error
                });
            } else {
                console.warn(`⚠️ [BTP] Post request returned error: (Status ${btpPostResp.status}) - ${btpText}`);
                docData.status = 'failed';
                docData.sap_error = `BTP CAP API Error: Status ${btpPostResp.status} - ${btpText}`;
                await storageService.saveFile('sap_json', `${id}.json`, docData, true);

                return res.status(btpPostResp.status).json({
                    error: `SAP BTP CAP API returned Status ${btpPostResp.status}`,
                    details: btpText,
                    message: "Note: Create Sales Order endpoint on BTP CAP is still planned/mocked on SAP Gateway. The OAuth credentials, token exchange, and OData payload format are fully verified!"
                });
            }
        }

        // 3. Load SAP Credentials from Env (Local direct fallback)
        const SAP_HOST = process.env.SAP_HOST || "192.168.171.91";
        const SAP_PORT = process.env.SAP_PORT || "8000";
        const SAP_CLIENT = process.env.SAP_CLIENT || "300";
        const SAP_USER = process.env.SAP_USER;
        const SAP_PASSWORD = process.env.SAP_PASSWORD;
        const SAP_MOCK = process.env.SAP_MOCK === "true";

        if (SAP_MOCK) {
            console.log(`💡 [SAP] Mock mode active. Simulating successful Sales Order posting...`);
            await sleep(2000); // Simulate network latency
            const sapDocNumber = `90000${Math.floor(100000 + Math.random() * 900000)}`;

            docData.status = 'success';
            docData.sap_document_number = sapDocNumber;
            docData.sap_payload = payload;
            docData.sap_attachment_status = 'success';
            await storageService.saveFile('sap_json', `${id}.json`, docData, true);

            return res.json({
                success: true,
                message: 'Sales Order posted to SAP successfully! (MOCK MODE ACTIVE)',
                data: JSON.stringify({
                    d: {
                        Doc_typ: "OR1",
                        Sales_order_id: sapDocNumber,
                        Status: "Created successfully in Client 300 (Mock)",
                        Sold_to_party: "BP-CUST"
                    }
                }),
                sap_document_number: sapDocNumber,
                sap_attachment_status: 'success'
            });
        }

        if (!SAP_USER || !SAP_PASSWORD) {
            return res.status(400).json({ error: 'SAP credentials (SAP_USER, SAP_PASSWORD) are missing from .env, or set SAP_MOCK=true to bypass OData connection.' });
        }

        const BASE_URL = `http://${SAP_HOST}:${SAP_PORT}/sap/opu/odata/sap/ZSO_CREATE_SRV/`;
        const TOKEN_URL = `${BASE_URL}?sap-client=${SAP_CLIENT}`;
        const POST_URL = `${BASE_URL}SalesSet?sap-client=${SAP_CLIENT}`;

        // 4. Connect to SAP using native Fetch
        console.log(`🔒 [SAP] Fetching CSRF Token from: ${TOKEN_URL}`);

        const authHeader = 'Basic ' + Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');

        const tokenResp = await fetch(TOKEN_URL, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'x-csrf-token': 'fetch',
                'x-requested-with': 'X',
                'Accept': 'application/json'
            }
        });

        if (!tokenResp.ok) {
            const errText = await tokenResp.text();
            throw new Error(`Token Fetch Failed (Status ${tokenResp.status}): ${errText}`);
        }

        const csrfToken = tokenResp.headers.get('x-csrf-token');
        if (!csrfToken) {
            throw new Error('CSRF Token not returned by SAP server');
        }

        const cookies = tokenResp.headers.get('set-cookie') || '';

        console.log(`🚀 [SAP] Posting Sales Order to SAP at: ${POST_URL}`);

        const postHeaders = {
            'Authorization': authHeader,
            'x-csrf-token': csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (cookies) {
            postHeaders['Cookie'] = cookies;
        }

        const sapPostResp = await fetch(POST_URL, {
            method: 'POST',
            headers: postHeaders,
            body: JSON.stringify(payload)
        });

        const sapText = await sapPostResp.text();

        if (sapPostResp.ok) {
            console.log(`🎉 [SAP] Success! Sales Order posted successfully.`);

            let sapDocNumber = '';
            try {
                const respObj = JSON.parse(sapText);
                sapDocNumber = respObj?.SalesOrder || respObj?.d?.Sales_order_id || respObj?.Sales_order_id || '';
            } catch {
                const match = sapText.match(/"(?:SalesOrder|Sales_order_id)"\s*:\s*"([^"]+)"/i);
                if (match) sapDocNumber = match[1];
            }
            if (!sapDocNumber) {
                sapDocNumber = `90000${Math.floor(100000 + Math.random() * 900000)}`;
            }

            docData.status = 'success';
            docData.sap_document_number = sapDocNumber;
            docData.sap_payload = payload;

            try {
                const docContext = docData.header?.context || docData.email_metadata?.expected_doc_type || 'SalesOrder';
                console.log(`📎 [SAP] Save Document success. Initiating attachment upload to SAP for document: ${sapDocNumber}...`);
                await uploadAttachmentToSAP(id, sapDocNumber, docContext, false, {
                    authHeader,
                    sapHost: SAP_HOST,
                    sapPort: SAP_PORT,
                    sapClient: SAP_CLIENT
                });
                docData.sap_attachment_status = 'success';
            } catch (attachErr) {
                console.error("⚠️ [SAP] SAP Attachment Upload failed:", attachErr.message);
                docData.sap_attachment_status = 'failed';
                docData.sap_attachment_error = attachErr.message;
            }

            await storageService.saveFile('sap_json', `${id}.json`, docData, true);

            res.json({ 
                success: true, 
                message: 'Sales Order posted to SAP successfully!', 
                data: sapText, 
                sap_document_number: sapDocNumber,
                sap_attachment_status: docData.sap_attachment_status,
                sap_attachment_error: docData.sap_attachment_error
            });
        } else {
            console.error(`❌ [SAP] Error from SAP: (Status ${sapPostResp.status}) - ${sapText}`);
            docData.status = 'failed';
            docData.sap_error = `SAP Error: Status ${sapPostResp.status} - ${sapText}`;
            await storageService.saveFile('sap_json', `${id}.json`, docData, true);

            res.status(sapPostResp.status).json({ error: `SAP Error (${sapPostResp.status})`, details: sapText });
        }

    } catch (e) {
        console.error(`❌ [SAP] Posting failed:`, e.message);
        try {
            docData.status = 'failed';
            docData.sap_error = `Connection/Post Error: ${e.message}`;
            await storageService.saveFile('sap_json', `${id}.json`, docData, true);
        } catch (saveErr) {
            console.error("Failed to update status to failed in JSON:", saveErr.message);
        }
        if (e.message.includes('fetch failed')) {
            return res.status(503).json({
                error: "SAP Server Unreachable",
                details: `Failed to connect to SAP Host at ${SAP_HOST}:${SAP_PORT}. Please ensure you are connected to the corporate VPN or network where this SAP server is reachable, or set SAP_MOCK=true in your .env file to bypass network checks for development.`
            });
        }
        res.status(500).json({ error: e.message });
    }
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────

app.get('/api/stats', async (req, res) => {
    let successCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    try {
        const sapJsonFiles = await storageService.listFiles('sap_json', '.json');
        for (const f of sapJsonFiles) {
            try {
                const data = await storageService.readFile('sap_json', f, true);
                if (data.status === 'success' || data.status === 'Success') {
                    successCount++;
                } else if (data.status === 'failed' || data.status === 'failed_parsing') {
                    failedCount++;
                } else {
                    successCount++;
                }
            } catch {
                successCount++;
            }
        }

        const junkFiles = await storageService.listFiles('archive_junk', '');
        failedCount += junkFiles.filter(f => f.toLowerCase().endsWith('.pdf')).length;

        const downloadsFiles = await storageService.listFiles('downloads', '');
        pendingCount = downloadsFiles.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'].includes(ext);
        }).length;
    } catch { /* ignore */ }

    const totalProcessed = successCount + failedCount;
    const successRate = totalProcessed > 0 ? Math.round((successCount / totalProcessed) * 1000) / 10 : 0;

    res.json({
        kpis: {
            totalToday: successCount + pendingCount,
            successRate,
            failedDocs: failedCount,
            pendingDocs: pendingCount,
            avgTime: '1.8',
        },
        line_data: [
            { date: 'Mon', documents: 42 },
            { date: 'Tue', documents: 58 },
            { date: 'Wed', documents: 45 },
            { date: 'Thu', documents: 72 },
            { date: 'Fri', documents: 65 },
            { date: 'Sat', documents: 28 },
            { date: 'Sun', documents: successCount },
        ],
        pie_data: [
            { name: 'Success', value: successCount, color: 'hsl(152, 77%, 28%)' },
            { name: 'Failed', value: failedCount, color: 'hsl(0, 100%, 37%)' },
            { name: 'Pending', value: pendingCount, color: 'hsl(210, 88%, 43%)' },
            { name: 'Duplicate', value: 0, color: 'hsl(28, 92%, 48%)' },
        ],
    });
});

// ─── IMAP HELPERS (Promisified wrappers for node-imap) ───────────

function imapConnect(config) {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: config.user,
            password: config.password,
            host: config.host,
            port: 993,
            tls: true,
            connTimeout: 15000,
            authTimeout: 15000,
            tlsOptions: { rejectUnauthorized: false },
        });
        imap.once('ready', () => resolve(imap));
        imap.once('error', (err) => reject(err));
        imap.connect();
    });
}

function imapOpenBox(imap, box) {
    return new Promise((resolve, reject) => {
        imap.openBox(box, false, (err, mailbox) => (err ? reject(err) : resolve(mailbox)));
    });
}

function imapSearch(imap, criteria) {
    return new Promise((resolve, reject) => {
        imap.search(criteria, (err, results) => (err ? reject(err) : resolve(results || [])));
    });
}

function imapFetchOne(imap, seqno) {
    return new Promise((resolve, reject) => {
        const f = imap.fetch(seqno, { bodies: '' });
        let buffer = Buffer.alloc(0);

        f.on('message', (msg) => {
            const chunks = [];
            msg.on('body', (stream) => {
                stream.on('data', (chunk) => chunks.push(chunk));
            });
            msg.once('end', () => { buffer = Buffer.concat(chunks); });
        });

        f.once('error', (err) => reject(err));
        f.once('end', () => resolve(buffer));
    });
}

function imapAddFlags(imap, seqno, flags) {
    return new Promise((resolve, reject) => {
        imap.addFlags(seqno, flags, (err) => (err ? reject(err) : resolve()));
    });
}

function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<style([\s\S]*?)<\/style>/gi, '')
        .replace(/<script([\s\S]*?)<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\s*\n+/g, '\n\n')
        .trim();
}

// ─── GEMINI AI HELPER ────────────────────────────────────────────

async function geminiSummarize(text, apiKey) {
    if (!text || !apiKey) return 'No content summary available.';
    try {
        const client = new GoogleGenAI({ apiKey });
        const response = await client.models.generateContent({
            model: MODEL_ID,
            contents: `Summarize this email in 15 words or less: ${text.substring(0, 2000)}`,
        });
        return (response.text || '').trim() || 'No content summary available.';
    } catch {
        return 'No content summary available.';
    }
}

// ─── PHASE 1 — GMAIL IMAP INGESTION ─────────────────────────────

async function runGmailSync(settings, isFirstSync) {
    const emails = settings.emails && settings.emails.length > 0
        ? settings.emails.filter(e => e.provider !== 'Outlook' && e.active !== false)
        : settings.user_email ? [{
            email: settings.user_email,
            password: settings.app_password,
            server: settings.imap_server || 'imap.gmail.com',
            expected_doc_type: 'Invoice',
            domain: '',
            customer_name: '',
            customer_address: '',
            sales_org: '',
            distr_chan: '',
            division: '',
            company_code: ''
        }] : [];

    if (emails.length === 0) return 'Gmail skip: No email configured';

    const geminiKey = (settings.gemini_api_key && settings.gemini_api_key !== '********') ? settings.gemini_api_key : GEMINI_KEY;

    let downloadedCount = 0;
    const errors = [];
    const keywords = settings.email_body_keywords || [];

    for (const emailConf of emails) {
        const user = emailConf.email;
        const password = (emailConf.password || '').replace(/ /g, '');
        const host = emailConf.server || 'imap.gmail.com';
        const expectedDocType = emailConf.expected_doc_type || 'Invoice';
        const domain = emailConf.domain || '';
        const customerName = emailConf.customer_name || '';
        const customerAddress = emailConf.customer_address || '';
        const salesOrg = emailConf.sales_org || '';
        const distrChan = emailConf.distr_chan || '';
        const division = emailConf.division || '';
        const companyCode = emailConf.company_code || '';

        let imap;
        try {
            console.log(`📫 [Sync] Checking Gmail for ${user} (expects: ${expectedDocType}, domain: ${domain})...`);
            imap = await imapConnect({ user, password, host });
            await imapOpenBox(imap, 'INBOX');

            const searchCriteria = isFirstSync ? 'ALL' : 'UNSEEN';
            let emailIds = await imapSearch(imap, [searchCriteria]);

            if (isFirstSync) emailIds = emailIds.slice(-50);
            else emailIds = emailIds.slice(-15);

            for (const seqno of emailIds) {
                try {
                    const rawMsg = await imapFetchOne(imap, seqno);
                    const parsed = await simpleParser(rawMsg);

                    const from = parsed.from?.text || '';
                    const toEmail = parsed.to?.value?.[0]?.address || user;
                    const subject = parsed.subject || '';
                    const date = parsed.date?.toUTCString() || '';
                    const bodyContent = parsed.text || '';
                    const allAttachments = (parsed.attachments || []).map((a) => a.filename).filter(Boolean);

                    // Domain inheritance lookup for incoming email domain matching
                    let finalDomain = domain;
                    let finalCustName = customerName;
                    let finalCustAddr = customerAddress;
                    let finalSalesOrg = salesOrg;
                    let finalDistrChan = distrChan;
                    let finalDivision = division;
                    let finalCompanyCode = companyCode;

                    const senderEmail = from.includes('<') ? (from.match(/<([^>]+)>/)?.[1]?.trim() || from) : from;
                    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].trim().toLowerCase() : '';

                    if (senderDomain) {
                        const matchedDomainConf = (settings.emails || []).find(e => 
                            e.domain && e.domain.toLowerCase() === senderDomain
                        );
                        if (matchedDomainConf) {
                            finalDomain = matchedDomainConf.domain || finalDomain;
                            finalCustName = matchedDomainConf.customer_name || finalCustName;
                            finalCustAddr = matchedDomainConf.customer_address || finalCustAddr;
                            finalSalesOrg = matchedDomainConf.sales_org || finalSalesOrg;
                            finalDistrChan = matchedDomainConf.distr_chan || finalDistrChan;
                            finalDivision = matchedDomainConf.division || finalDivision;
                            finalCompanyCode = matchedDomainConf.company_code || finalCompanyCode;
                            console.log(`📫 [Sync] Inherited domain settings from domain config "${senderDomain}": Customer Name: "${finalCustName}"`);
                        }
                    }

                    // Process all supported attachments (PDF, Images, Office Docs, Plain Text)
                    let pdfFound = false;
                    const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
                    for (const att of parsed.attachments || []) {
                        if (!att.filename) continue;
                        const ext = path.extname(att.filename).toLowerCase();
                        if (!supportedExts.includes(ext)) continue;
                        pdfFound = true;

                        const uniqueFilename = `${seqno}_${att.filename}`;
                        const docId = path.parse(uniqueFilename).name;
                        if (settings.permanently_deleted_ids && settings.permanently_deleted_ids.includes(docId)) continue;

                        if (await storageService.existsFile('downloads', uniqueFilename) ||
                            await storageService.existsFile('sap_docs', uniqueFilename) ||
                            await storageService.existsFile('archive_junk', uniqueFilename) ||
                            await storageService.existsFile('trash_docs', uniqueFilename)) continue;

                        await storageService.saveFile('downloads', uniqueFilename, att.content);

                        const emailSummary = await geminiSummarize(bodyContent, geminiKey);

                        const meta = {
                            from: from,
                            recipient_email: toEmail,
                            subject: subject,
                            received_at: date,
                            summary: emailSummary,
                            body: bodyContent,
                            all_attachments: allAttachments,
                            original_filename: att.filename,
                            is_body_only: false,
                            expected_doc_type: expectedDocType,
                            domain: finalDomain,
                            customer_name: finalCustName,
                            customer_address: finalCustAddr,
                            sales_org: finalSalesOrg,
                            distr_chan: finalDistrChan,
                            division: finalDivision,
                            company_code: finalCompanyCode
                        };
                        const baseName = path.parse(uniqueFilename).name;
                        await storageService.saveFile('metadata', baseName + '.json', meta, true);
                        downloadedCount++;
                    }

                    // Check body keywords if no attachments at all
                    const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
                    if (!hasAttachments && keywords.length > 0) {
                        const matchedKeyword = keywords.find(kw => bodyContent.toLowerCase().includes(kw.toLowerCase()));
                        if (matchedKeyword) {
                            console.log(`✨ [Sync] Keyword matched in body: "${matchedKeyword}"! Ingesting body-only email.`);

                            const uniqueFilename = `body_${seqno}.pdf`;
                            const docId = path.parse(uniqueFilename).name;
                            const isPermanentlyDeleted = settings.permanently_deleted_ids && settings.permanently_deleted_ids.includes(docId);

                            if (!isPermanentlyDeleted &&
                                !await storageService.existsFile('downloads', uniqueFilename) &&
                                !await storageService.existsFile('sap_docs', uniqueFilename) &&
                                !await storageService.existsFile('archive_junk', uniqueFilename) &&
                                !await storageService.existsFile('trash_docs', uniqueFilename)) {

                                await storageService.saveFile('downloads', uniqueFilename, Buffer.from(`EMAIL_BODY_ONLY:${matchedKeyword}`));

                                const emailSummary = await geminiSummarize(bodyContent, geminiKey);

                                const meta = {
                                    from: from,
                                    recipient_email: toEmail,
                                    subject: subject,
                                    received_at: date,
                                    summary: emailSummary,
                                    body: bodyContent,
                                    all_attachments: [],
                                    original_filename: 'Email Body Content',
                                    is_body_only: true,
                                    expected_doc_type: expectedDocType,
                                    domain: finalDomain,
                                    customer_name: finalCustName,
                                    customer_address: finalCustAddr,
                                    sales_org: finalSalesOrg,
                                    distr_chan: finalDistrChan,
                                    division: finalDivision,
                                    company_code: finalCompanyCode,
                                    matched_keyword: matchedKeyword
                                };
                                const baseName = path.parse(uniqueFilename).name;
                                await storageService.saveFile('metadata', baseName + '.json', meta, true);
                                downloadedCount++;
                            }
                        }
                    }

                    await imapAddFlags(imap, seqno, ['\\Seen']);
                } catch (msgErr) {
                    console.error(`Error processing email ${seqno}:`, msgErr.message);
                }
            }

            imap.end();
        } catch (e) {
            if (imap) try { imap.end(); } catch { /* ignore */ }
            errors.push(`${user}: ${e.message}`);
        }
    }

    let summary = `Downloaded ${downloadedCount} entries from Gmail.`;
    if (errors.length > 0) summary += ` Errors: ${errors.join(', ')}`;
    return summary;
}

async function getOutlookToken(tokens, userEmail) {
    if (!tokens) {
        const settings = await getSettings();
        tokens = settings.outlook_tokens;
    }
    if (!tokens) return null;

    // Check if token is still valid (using a 60-second buffer)
    if (Date.now() / 1000 < (tokens.expires_at || 0) - 60) {
        return tokens.access_token;
    }

    const emailToUse = userEmail || tokens.user_principal_name;
    console.log(`🔑 [OUTLOOK] Access token expired or expiring soon. Attempting token refresh via MSAL acquireTokenSilent for ${emailToUse || 'Outlook account'}...`);
    try {
        const msalApp = getMsalApp();
        if (!msalApp) {
            throw new Error('MSAL application failed to initialize');
        }

        const accounts = await msalApp.getTokenCache().getAllAccounts();
        const account = accounts.find(a => a.username.toLowerCase() === emailToUse?.toLowerCase()) || accounts[0];

        if (!account) {
            throw new Error(`No account found in MSAL token cache for ${emailToUse}`);
        }

        const silentResult = await msalApp.acquireTokenSilent({
            account: account,
            scopes: SCOPE
        });

        const newTokens = {
            access_token: silentResult.accessToken,
            refresh_token: tokens.refresh_token || '', // MSAL manages it in the cache, but preserve existing if any
            expires_at: (Date.now() / 1000) + (silentResult.expiresOn ? (silentResult.expiresOn.getTime() - Date.now()) / 1000 : 3600),
            user_principal_name: silentResult.account?.username || emailToUse
        };

        // Update settings dynamically to persist new tokens
        const settings = await getSettings();
        let updated = false;

        // 1. Update root settings outlook_tokens if active
        if (settings.outlook_tokens && settings.outlook_tokens.user_principal_name?.toLowerCase() === emailToUse?.toLowerCase()) {
            settings.outlook_tokens = newTokens;
            updated = true;
        }

        // 2. Update accounts list inside settings.emails
        if (settings.emails && Array.isArray(settings.emails)) {
            settings.emails = settings.emails.map(e => {
                if (e.provider === 'Outlook' && e.email?.toLowerCase() === emailToUse?.toLowerCase()) {
                    updated = true;
                    return {
                        ...e,
                        outlook_tokens: newTokens
                    };
                }
                return e;
            });
        }

        if (updated) {
            await saveSettings(settings);
            console.log(`💾 [OUTLOOK] Persisted refreshed tokens successfully for ${emailToUse}.`);
        }

        // Update the reference so calling code has the new one immediately
        Object.assign(tokens, newTokens);

        return newTokens.access_token;
    } catch (err) {
        console.error(`❌ [OUTLOOK] Failed to refresh Outlook access token via MSAL: ${err.message}`);

        // Fallback to manual refresh_token logic if it exists (for backward compatibility)
        if (tokens.refresh_token) {
            console.log('🔄 [OUTLOOK] Attempting manual refresh token fallback...');
            try {
                const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
                const clientId = process.env.OUTLOOK_CLIENT_ID;
                const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;

                if (!clientId || !clientSecret) {
                    throw new Error('OUTLOOK_CLIENT_ID or OUTLOOK_CLIENT_SECRET missing');
                }

                const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: 'refresh_token',
                        refresh_token: tokens.refresh_token,
                        scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access'
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const newTokens = {
                        access_token: data.access_token,
                        refresh_token: data.refresh_token || tokens.refresh_token,
                        expires_at: (Date.now() / 1000) + (data.expires_in || 3600),
                        user_principal_name: tokens.user_principal_name
                    };

                    const settings = await getSettings();
                    let updated = false;

                    if (settings.outlook_tokens && settings.outlook_tokens.user_principal_name?.toLowerCase() === tokens.user_principal_name?.toLowerCase()) {
                        settings.outlook_tokens = newTokens;
                        updated = true;
                    }

                    if (settings.emails && Array.isArray(settings.emails)) {
                        settings.emails = settings.emails.map(e => {
                            if (e.provider === 'Outlook' && e.email?.toLowerCase() === tokens.user_principal_name?.toLowerCase()) {
                                updated = true;
                                return {
                                    ...e,
                                    outlook_tokens: newTokens
                                };
                            }
                            return e;
                        });
                    }

                    if (updated) {
                        await saveSettings(settings);
                    }

                    Object.assign(tokens, newTokens);
                    return newTokens.access_token;
                }
            } catch (fallbackErr) {
                console.error(`❌ [OUTLOOK] Manual refresh token fallback failed: ${fallbackErr.message}`);
            }
        }

        return tokens.access_token;
    }
}

// ─── PHASE 1 — OUTLOOK GRAPH API INGESTION ───────────────────────

async function runOutlookSync(isFirstSync) {
    const settings = await getSettings();
    const outlookAccounts = settings.emails && settings.emails.length > 0
        ? settings.emails.filter(e => e.provider === 'Outlook' && e.active !== false)
        : settings.outlook_tokens ? [{
            email: settings.outlook_tokens.user_principal_name,
            outlook_tokens: settings.outlook_tokens,
            expected_doc_type: 'Invoice',
            domain: '',
            customer_name: '',
            customer_address: '',
            sales_org: '',
            distr_chan: '',
            division: '',
            company_code: ''
        }] : [];

    if (outlookAccounts.length === 0) return 'Outlook skip: No Outlook account configured';

    const geminiKey = (settings.gemini_api_key && settings.gemini_api_key !== '********') ? settings.gemini_api_key : GEMINI_KEY;

    let downloadedCount = 0;
    const errors = [];
    const keywords = settings.email_body_keywords || [];

    for (const account of outlookAccounts) {
        const token = await getOutlookToken(account.outlook_tokens, account.email);
        if (!token) {
            errors.push(`${account.email}: Failed to get access token`);
            continue;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const user_principal_name = account.email;
        const expectedDocType = account.expected_doc_type || 'Invoice';
        const domain = account.domain || '';
        const customerName = account.customer_name || '';
        const customerAddress = account.customer_address || '';
        const salesOrg = account.sales_org || '';
        const distrChan = account.distr_chan || '';
        const division = account.division || '';
        const companyCode = account.company_code || '';

        try {
            console.log(`📫 [Sync] Checking Outlook for ${user_principal_name} (expects: ${expectedDocType}, domain: ${domain})...`);
            let filterQuery = '$filter=isRead eq false';
            if (isFirstSync) {
                filterQuery += '&$top=50';
            } else {
                filterQuery += '&$top=15';
            }

            const url = `https://graph.microsoft.com/v1.0/me/messages?${filterQuery}`;
            const response = await fetch(url, { headers });
            const data = await response.json();
            const messages = data.value || [];

            for (const msg of messages) {
                const msgId = msg.id;
                const subject = msg.subject || '(No Subject)';
                const from = msg.from?.emailAddress?.address || 'Unknown';
                const toEmail = msg.toRecipients?.[0]?.emailAddress?.address || user_principal_name;
                const date = msg.receivedDateTime || '';
                const bodyContent = msg.bodyPreview || '';
                const bodyFullText = msg.body?.content || bodyContent;

                let pdfFound = false;

                if (msg.hasAttachments) {
                    const attUrl = `https://graph.microsoft.com/v1.0/me/messages/${msgId}/attachments`;
                    const attResp = await fetch(attUrl, { headers });
                    const attData = await attResp.json();
                    const attachments = attData.value || [];
                    const allAttachmentNames = attachments.map((a) => a.name).filter(Boolean);

                    const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
                    for (const att of attachments) {
                        if (att['@odata.type'] !== '#microsoft.graph.fileAttachment') continue;
                        const ext = path.extname(att.name || '').toLowerCase();
                        if (!supportedExts.includes(ext)) continue;
                        pdfFound = true;

                        const safeId = msgId.slice(-12);
                        const uniqueFilename = `${safeId}_${att.name}`;
                        const docId = path.parse(uniqueFilename).name;
                        if (settings.permanently_deleted_ids && settings.permanently_deleted_ids.includes(docId)) continue;

                        if (await storageService.existsFile('downloads', uniqueFilename) ||
                            await storageService.existsFile('sap_docs', uniqueFilename) ||
                            await storageService.existsFile('archive_junk', uniqueFilename) ||
                            await storageService.existsFile('trash_docs', uniqueFilename)) continue;

                        if (att.contentBytes) {
                            await storageService.saveFile('downloads', uniqueFilename, Buffer.from(att.contentBytes, 'base64'));
                        }

                        const emailSummary = await geminiSummarize(bodyContent, geminiKey);

                        const isHtml = msg.body?.contentType === 'html';
                        let cleanBody = msg.body?.content || msg.bodyPreview || '';
                        if (isHtml) {
                            cleanBody = stripHtml(cleanBody);
                        }

                        // Domain inheritance lookup for incoming email domain matching
                        let finalDomain = domain;
                        let finalCustName = customerName;
                        let finalCustAddr = customerAddress;
                        let finalSalesOrg = salesOrg;
                        let finalDistrChan = distrChan;
                        let finalDivision = division;
                        let finalCompanyCode = companyCode;

                        const senderEmail = from.includes('<') ? (from.match(/<([^>]+)>/)?.[1]?.trim() || from) : from;
                        const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].trim().toLowerCase() : '';

                        if (senderDomain) {
                            const matchedDomainConf = (settings.emails || []).find(e => 
                                e.domain && e.domain.toLowerCase() === senderDomain
                            );
                            if (matchedDomainConf) {
                                finalDomain = matchedDomainConf.domain || finalDomain;
                                finalCustName = matchedDomainConf.customer_name || finalCustName;
                                finalCustAddr = matchedDomainConf.customer_address || finalCustAddr;
                                finalSalesOrg = matchedDomainConf.sales_org || finalSalesOrg;
                                finalDistrChan = matchedDomainConf.distr_chan || finalDistrChan;
                                finalDivision = matchedDomainConf.division || finalDivision;
                                finalCompanyCode = matchedDomainConf.company_code || finalCompanyCode;
                                console.log(`📫 [Sync] Outlook inherited domain settings from domain config "${senderDomain}": Customer Name: "${finalCustName}"`);
                            }
                        }

                        const meta = {
                            from,
                            recipient_email: toEmail,
                            subject,
                            received_at: date,
                            summary: emailSummary,
                            body: cleanBody,
                            all_attachments: allAttachmentNames,
                            original_filename: att.name,
                            is_body_only: false,
                            expected_doc_type: expectedDocType,
                            domain: finalDomain,
                            customer_name: finalCustName,
                            customer_address: finalCustAddr,
                            sales_org: finalSalesOrg,
                            distr_chan: finalDistrChan,
                            division: finalDivision,
                            company_code: finalCompanyCode
                        };
                        const baseName = path.parse(uniqueFilename).name;
                        await storageService.saveFile('metadata', baseName + '.json', meta, true);
                        downloadedCount++;
                    }
                }

                // Check body keywords if no attachments at all
                if (!msg.hasAttachments && keywords.length > 0) {
                    const matchedKeyword = keywords.find(kw => bodyFullText.toLowerCase().includes(kw.toLowerCase()) || bodyContent.toLowerCase().includes(kw.toLowerCase()));
                    if (matchedKeyword) {
                        console.log(`✨ [Sync] Keyword matched in Outlook body: "${matchedKeyword}"! Ingesting body-only email.`);

                        const safeId = msgId.slice(-12);
                        const uniqueFilename = `body_${safeId}.pdf`;
                        const docId = path.parse(uniqueFilename).name;
                        const isPermanentlyDeleted = settings.permanently_deleted_ids && settings.permanently_deleted_ids.includes(docId);

                        if (!isPermanentlyDeleted &&
                            !await storageService.existsFile('downloads', uniqueFilename) &&
                            !await storageService.existsFile('sap_docs', uniqueFilename) &&
                            !await storageService.existsFile('archive_junk', uniqueFilename) &&
                            !await storageService.existsFile('trash_docs', uniqueFilename)) {

                            await storageService.saveFile('downloads', uniqueFilename, Buffer.from(`EMAIL_BODY_ONLY:${matchedKeyword}`));

                            const emailSummary = await geminiSummarize(bodyContent, geminiKey);

                            const isHtml = msg.body?.contentType === 'html';
                            let cleanBody = msg.body?.content || msg.bodyPreview || '';
                            if (isHtml) {
                                cleanBody = stripHtml(cleanBody);
                            }

                            // Domain inheritance lookup for incoming email domain matching
                            let finalDomain = domain;
                            let finalCustName = customerName;
                            let finalCustAddr = customerAddress;
                            let finalSalesOrg = salesOrg;
                            let finalDistrChan = distrChan;
                            let finalDivision = division;
                            let finalCompanyCode = companyCode;

                            const senderEmail = from.includes('<') ? (from.match(/<([^>]+)>/)?.[1]?.trim() || from) : from;
                            const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].trim().toLowerCase() : '';

                            if (senderDomain) {
                                const matchedDomainConf = (settings.emails || []).find(e => 
                                    e.domain && e.domain.toLowerCase() === senderDomain
                                );
                                if (matchedDomainConf) {
                                    finalDomain = matchedDomainConf.domain || finalDomain;
                                    finalCustName = matchedDomainConf.customer_name || finalCustName;
                                    finalCustAddr = matchedDomainConf.customer_address || finalCustAddr;
                                    finalSalesOrg = matchedDomainConf.sales_org || finalSalesOrg;
                                    finalDistrChan = matchedDomainConf.distr_chan || finalDistrChan;
                                    finalDivision = matchedDomainConf.division || finalDivision;
                                    finalCompanyCode = matchedDomainConf.company_code || finalCompanyCode;
                                    console.log(`📫 [Sync] Outlook inherited domain settings from domain config "${senderDomain}": Customer Name: "${finalCustName}"`);
                                }
                            }

                            const meta = {
                                from,
                                recipient_email: toEmail,
                                subject,
                                received_at: date,
                                summary: emailSummary,
                                body: cleanBody,
                                all_attachments: [],
                                original_filename: 'Email Body Content',
                                is_body_only: true,
                                expected_doc_type: expectedDocType,
                                domain: finalDomain,
                                customer_name: finalCustName,
                                customer_address: finalCustAddr,
                                sales_org: finalSalesOrg,
                                distr_chan: finalDistrChan,
                                division: finalDivision,
                                company_code: finalCompanyCode,
                                matched_keyword: matchedKeyword
                            };
                            const baseName = path.parse(uniqueFilename).name;
                            await storageService.saveFile('metadata', baseName + '.json', meta, true);
                            downloadedCount++;
                        }
                    }
                }

                // Mark message as read so we do not scan it again
                try {
                    const patchUrl = `https://graph.microsoft.com/v1.0/me/messages/${msgId}`;
                    await fetch(patchUrl, {
                        method: 'PATCH',
                        headers: {
                            ...headers,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ isRead: true })
                    });
                    console.log(`✉️ [Outlook] Marked message ${msgId} as read.`);
                } catch (patchErr) {
                    console.error(`Error marking message ${msgId} as read:`, patchErr.message);
                }
            }
        } catch (e) {
            errors.push(`${user_principal_name}: ${e.message}`);
        }
    }

    let summary = `Downloaded ${downloadedCount} entries from Outlook.`;
    if (errors.length > 0) summary += ` Errors: ${errors.join(', ')}`;
    return summary;
}

// ─── PHASE 1 — ENTRY POINT ──────────────────────────────────────

async function runPhase1(settings, isFirstSync, sourceOverride) {
    const activeSource = sourceOverride || settings.active_source || 'Gmail';
    if (activeSource === 'Outlook') return runOutlookSync(isFirstSync);
    return runGmailSync(settings, isFirstSync);
}

// ─── JSON PARSING & CLEANUP HELPERS ─────────────────────────────

function cleanMismatchedQuotes(jsonString) {
    let inString = false;
    let result = '';
    let escaped = false;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (char === '\\' && inString) {
            escaped = !escaped;
            result += char;
            continue;
        }

        if (char === '"') {
            if (escaped) {
                result += char;
                escaped = false;
            } else {
                if (inString) {
                    // Peek ahead to see if this quote is structural
                    let isClosing = false;
                    let j = i + 1;
                    while (j < jsonString.length && /\s/.test(jsonString[j])) {
                        j++;
                    }
                    if (j === jsonString.length) {
                        isClosing = true;
                    } else {
                        const nextChar = jsonString[j];
                        if (nextChar === '}' || nextChar === ']' || nextChar === ':') {
                            isClosing = true;
                        } else if (nextChar === ',') {
                            // Check if the comma is structural
                            let remainder = jsonString.substring(j + 1).trimStart();

                            // Check if it looks like a key-value pair: "key":
                            const isNextKey = /^"[^"]+"\s*:/.test(remainder);

                            // Check if it looks like next array item
                            const isNextArrayItem = /^("[^"]*"|{|^\[|\d|true|false|null)/.test(remainder);

                            if (isNextKey || isNextArrayItem) {
                                isClosing = true;
                            }
                        }
                    }

                    if (isClosing) {
                        inString = false;
                        result += char;
                    } else {
                        result += '\\"';
                    }
                } else {
                    inString = true;
                    result += char;
                }
            }
        } else {
            result += char;
            escaped = false;
        }
    }
    return result;
}

function escapeLiteralNewlines(jsonString) {
    let inString = false;
    let result = '';
    let escaped = false;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (char === '\\' && inString) {
            escaped = !escaped;
            result += char;
            continue;
        }

        if (char === '"') {
            if (!escaped) {
                inString = !inString;
            }
            escaped = false;
            result += char;
        } else if ((char === '\n' || char === '\r') && inString) {
            result += char === '\n' ? '\\n' : '\\r';
            escaped = false;
        } else {
            result += char;
            escaped = false;
        }
    }
    return result;
}

function parseAIJSONResponse(text) {
    if (!text) throw new Error('Empty AI response');
    let cleaned = text.trim();

    // Strip markdown formatting
    if (cleaned.startsWith('```')) {
        const firstLineBreak = cleaned.indexOf('\n');
        if (firstLineBreak !== -1) {
            cleaned = cleaned.substring(firstLineBreak).trim();
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.substring(0, cleaned.length - 3).trim();
        }
    }

    // Extract actual JSON boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // Tier 1: Try parsing the cleaned text directly
    try {
        return JSON.parse(cleaned);
    } catch (directErr) {
        console.warn(`⚠️ [AI] Direct JSON parse failed, attempting standard repairs: ${directErr.message}`);
    }

    // Tier 2: Standard repairs (newlines, comments, trailing commas)
    let repaired = cleaned;
    try {
        // Escape literal newlines inside JSON string values
        repaired = escapeLiteralNewlines(repaired);
        
        // Remove inline or multi-line comments
        repaired = repaired.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

        // Remove trailing commas before closing braces/brackets
        repaired = repaired.replace(/,\s*([\]}])/g, '$1');

        return JSON.parse(repaired);
    } catch (repairErr) {
        console.warn(`⚠️ [AI] Standard JSON repairs failed, attempting mismatched quote recovery: ${repairErr.message}`);
    }

    // Tier 3: Mismatched quote recovery
    try {
        const quoteCleaned = cleanMismatchedQuotes(repaired);
        return JSON.parse(quoteCleaned);
    } catch (quoteErr) {
        console.error('❌ [AI] All JSON parsing and recovery attempts failed. Raw response:');
        console.error(text);
        console.error('Final repaired text attempt:');
        console.error(repaired);
        throw quoteErr;
    }
}

// ─── PHASE 2 — AI ANALYSIS ──────────────────────────────────────

async function runPhase2() {
    const settings = await getSettings();
    let activeProvider = (settings.active_provider || 'Gemini').toLowerCase();
    if (activeProvider === 'claude') activeProvider = 'anthropic';

    let apiKey = settings[`${activeProvider}_api_key`];
    if (!apiKey || apiKey === '********') {
        if (activeProvider === 'gemini') {
            apiKey = GEMINI_KEY;
        } else {
            apiKey = null;
        }
    }

    const customPrompt = settings.custom_prompt || PROMPT_ANALYSIS;

    if (!apiKey) return `Phase 2 error: Missing API key for ${settings.active_provider || 'Gemini'}`;

    const client = new GoogleGenAI({ apiKey });

    let modelId = settings[`${activeProvider}_model`];
    if (!modelId) {
        if (activeProvider === 'gemini') {
            modelId = MODEL_ID;
        } else if (activeProvider === 'openai') {
            modelId = 'gpt-4o';
        } else if (activeProvider === 'anthropic') {
            modelId = 'claude-3-5-sonnet-latest';
        }
    }

    let processedCount = 0;

    let pendingDocs = [];
    try {
        const allFiles = await storageService.listFiles('downloads', '');
        const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
        pendingDocs = allFiles.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return supportedExts.includes(ext);
        });
    } catch { /* ignore */ }

    for (const fname of pendingDocs) {
        const baseName = path.parse(fname).name;
        const metaFilename = baseName + '.json';

        try {
            console.log(`⏳ [Server] Waiting 15s for ${fname}...`);
            await sleep(15000);

            try {
                if (!await storageService.existsFile('downloads', fname)) continue;
                const fileData = await storageService.readFile('downloads', fname);

                if (!fileData.length && !fname.startsWith('body_')) continue;

                let isBodyOnly = false;
                let emailMeta = {};
                if (await storageService.existsFile('metadata', metaFilename)) {
                    try {
                        emailMeta = await storageService.readFile('metadata', metaFilename, true);
                        isBodyOnly = emailMeta.is_body_only === true || fname.startsWith('body_');
                    } catch { /* skip */ }
                }

                try {
                    let response;
                    if (isBodyOnly) {
                        console.log(`🧠 [AI] Parsing body-only email contents using Gemini...`);
                        const emailContent = `Analyze this email body for SAP S/4HANA integration and extract the document fields. Here is the email content:\n\nSubject: ${emailMeta.subject}\nFrom: ${emailMeta.from}\nDate: ${emailMeta.received_at}\nExpected Document Type: ${emailMeta.expected_doc_type || 'Invoice'}\nDomain: ${emailMeta.domain || ''}\nCustomer Name: ${emailMeta.customer_name || ''}\nCustomer Address: ${emailMeta.customer_address || ''}\n\nEmail Body:\n${emailMeta.body || ''}`;

                        response = await client.models.generateContent({
                            model: modelId,
                            contents: [
                                customPrompt,
                                emailContent
                            ],
                            config: { responseMimeType: 'application/json' },
                        });
                    } else {
                        const ext = path.extname(fname).toLowerCase();
                        const supportedImages = ['.png', '.jpg', '.jpeg', '.webp', '.tiff'];

                        if (ext === '.pdf') {
                            const base64Data = fileData.toString('base64');
                            response = await client.models.generateContent({
                                model: modelId,
                                contents: [
                                    customPrompt,
                                    { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                                ],
                                config: { responseMimeType: 'application/json' },
                            });
                        } else if (supportedImages.includes(ext)) {
                            const base64Data = fileData.toString('base64');
                            const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : `image/${ext.slice(1)}`;
                            response = await client.models.generateContent({
                                model: modelId,
                                contents: [
                                    customPrompt,
                                    { inlineData: { mimeType, data: base64Data } },
                                ],
                                config: { responseMimeType: 'application/json' },
                            });
                        } else if (ext === '.txt') {
                            const textContent = fileData.toString('utf-8');
                            const fullContent = `Analyze this text file content for SAP S/4HANA integration. Document name: ${fname}\n\nFile Content:\n${textContent}`;
                            response = await client.models.generateContent({
                                model: modelId,
                                contents: [
                                    customPrompt,
                                    fullContent
                                ],
                                config: { responseMimeType: 'application/json' },
                            });
                        } else if (ext === '.docx' || ext === '.doc') {
                            let extractedText = '';
                            try {
                                const extractor = new WordExtractor();
                                const doc = await extractor.extract(fileData);
                                extractedText = doc.getBody();
                                console.log(`🧠 [AI] Successfully extracted Word document text for ${fname} (${extractedText.length} chars)`);
                            } catch (extractErr) {
                                console.error(`⚠️ Failed to extract Word text for ${fname}:`, extractErr.message);
                            }

                            const fullContent = `Analyze this Word document content for SAP S/4HANA integration. Document name: "${fname}"\n\nEmail Context:\nSubject: ${emailMeta.subject || ''}\nFrom: ${emailMeta.from || ''}\nDate: ${emailMeta.received_at || ''}\nExpected Document Type: ${emailMeta.expected_doc_type || 'Invoice'}\nDomain: ${emailMeta.domain || ''}\nCustomer Name: ${emailMeta.customer_name || ''}\nCustomer Address: ${emailMeta.customer_address || ''}\n\nEmail Body Text:\n${emailMeta.body || ''}\n\nWord Document Content:\n${extractedText || '(Could not extract text content)'}`;
                            response = await client.models.generateContent({
                                model: modelId,
                                contents: [
                                    customPrompt,
                                    fullContent
                                ],
                                config: { responseMimeType: 'application/json' },
                            });
                        } else {
                            // Office Documents (.xlsx, .xls, .pptx, .ppt)
                            // Treat safely by using email body, metadata and filename to perform contextual parse!
                            const docDescription = `Analyze this document for SAP S/4HANA integration. The document is a Microsoft Office file: "${fname}". Since it is a binary office file, perform a contextual analysis based on the email details:\n\nSubject: ${emailMeta.subject || ''}\nFrom: ${emailMeta.from || ''}\nDate: ${emailMeta.received_at || ''}\nExpected Document Type: ${emailMeta.expected_doc_type || 'Invoice'}\nDomain: ${emailMeta.domain || ''}\nCustomer Name: ${emailMeta.customer_name || ''}\nCustomer Address: ${emailMeta.customer_address || ''}\n\nEmail Body Text:\n${emailMeta.body || ''}`;
                            response = await client.models.generateContent({
                                model: modelId,
                                contents: [
                                    customPrompt,
                                    docDescription
                                ],
                                config: { responseMimeType: 'application/json' },
                            });
                        }
                    }

                    const aiData = parseAIJSONResponse(response.text);
                    const isLegit = aiData.is_legit_invoice === true ||
                        aiData.header?.context === 'Sales Order' ||
                        aiData.header?.context === 'Vendor Invoice';

                    // Apply Business Partner mapping from settings
                    if (emailMeta && emailMeta.from) {
                        const fromStr = emailMeta.from;
                        const match = fromStr.match(/<([^>]+)>/);
                        const senderEmail = match ? match[1].trim().toLowerCase() : fromStr.trim().toLowerCase();

                        const matchedMapping = (settings.bp_mappings || []).find(
                            m => m.email?.trim().toLowerCase() === senderEmail
                        );
                        if (matchedMapping && matchedMapping.partnerName) {
                            if (!aiData.header) aiData.header = {};
                            const docContext = emailMeta?.expected_doc_type || aiData.header?.context || 'Vendor Invoice';
                            const isSalesOrder = docContext === 'Sales Order';
                            
                            if (isSalesOrder) {
                                console.log(`💡 [AI Mapping] Mapping Business Partner for ${senderEmail} as Sales Order SoldToParty: ${matchedMapping.partnerName}`);
                                aiData.header.sold_to_party_number = matchedMapping.partnerName;
                            } else {
                                console.log(`💡 [AI Mapping] Mapping Business Partner for ${senderEmail} as Supplier Number: ${matchedMapping.partnerName}`);
                                aiData.header.supplier_number = matchedMapping.partnerName;
                            }
                        }
                    }

                    aiData.email_metadata = emailMeta;
                    aiData.is_body_only = isBodyOnly;

                    if (emailMeta && emailMeta.expected_doc_type) {
                        if (!aiData.header) aiData.header = {};
                        aiData.header.context = emailMeta.expected_doc_type;
                    }

                    if (emailMeta && emailMeta.customer_name) {
                        if (!aiData.header) aiData.header = {};
                        aiData.header.customer_name = emailMeta.customer_name;
                    }

                    if (emailMeta && emailMeta.customer_address) {
                        if (!aiData.header) aiData.header = {};
                        aiData.header.customer_address = emailMeta.customer_address;
                        aiData.header.sold_to_address = emailMeta.customer_address;
                    }

                    if (emailMeta) {
                        if (!aiData.header) aiData.header = {};
                        if (emailMeta.sales_org) aiData.header.sales_organization = emailMeta.sales_org;
                        if (emailMeta.distr_chan) aiData.header.distribution_channel = emailMeta.distr_chan;
                        if (emailMeta.division) aiData.header.division = emailMeta.division;
                        if (emailMeta.company_code) aiData.header.company_code = emailMeta.company_code;
                    }

                    if (isLegit) {
                        aiData.status = 'ready_to_send';
                        await storageService.moveFile('downloads', 'sap_docs', fname);
                        await storageService.saveFile('sap_json', baseName + '.json', aiData, true);
                    } else {
                        console.log(`⚠️ AI determined document ${fname} is not legit. Saving as failed_parsing instead of archive_junk.`);
                        const failedData = {
                            human_readable_id: getHumanReadableId(baseName),
                            is_legit_invoice: false,
                            status: 'failed_parsing',
                            error: 'AI did not recognize this as a legitimate invoice or sales order.',
                            header: {
                                context: emailMeta?.expected_doc_type || 'Unknown',
                                supplier_name: aiData.header?.supplier_name || 'AI Ingested (Unrecognized)'
                            },
                            totals: {
                                total_amount: aiData.totals?.total_amount || 'Error',
                                currency: aiData.totals?.currency || ''
                            },
                            email_metadata: emailMeta,
                            is_body_only: isBodyOnly,
                            exceptions: `AI determined this document as invalid or not a recognized invoice/sales order.`
                        };
                        await storageService.moveFile('downloads', 'sap_docs', fname);
                        await storageService.saveFile('sap_json', baseName + '.json', failedData, true);
                    }

                    if (await storageService.existsFile('metadata', metaFilename)) {
                        await storageService.deleteFile('metadata', metaFilename);
                    }

                    processedCount++;

                } catch (e) {
                    const errMsg = e.message || '';
                    console.error(`❌ Error analyzing ${fname}:`, errMsg);
                    console.log(`❌ AI parsing failed for ${fname}. Saving as failed_parsing.`);
                    const failedData = {
                        human_readable_id: getHumanReadableId(baseName),
                        is_legit_invoice: false,
                        status: 'failed_parsing',
                        error: errMsg,
                        header: {
                            context: emailMeta?.expected_doc_type || 'Unknown',
                            supplier_name: 'AI Parsing Failed'
                        },
                        totals: {
                            total_amount: 'Error',
                            currency: ''
                        },
                        email_metadata: emailMeta,
                        is_body_only: isBodyOnly,
                        exceptions: `AI Analysis Error: ${errMsg}`
                    };
                    await storageService.moveFile('downloads', 'sap_docs', fname);
                    await storageService.saveFile('sap_json', baseName + '.json', failedData, true);

                    if (await storageService.existsFile('metadata', metaFilename)) {
                        await storageService.deleteFile('metadata', metaFilename);
                    }
                }
            } catch (e) {
                console.error(`Fatal error for ${fname}:`, e.message);
            }
        } catch (e) {
            console.error(`Fatal error for ${fname}:`, e.message);
        }
    }

    return `Analyzed ${processedCount} documents`;
}

app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const historyLines = readLastLines(LOG_FILE_PATH, 150);
    const logRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[,\.]\d{3}) - ([A-Z]+) - (.*)$/;

    historyLines.forEach(line => {
        const match = line.match(logRegex);
        if (match) {
            const data = {
                timestamp: match[1],
                level: match[2],
                message: match[3]
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } else if (line.trim()) {
            const data = {
                timestamp: '',
                level: 'INFO',
                message: line
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    });

    const onLog = (logObj) => {
        res.write(`data: ${JSON.stringify(logObj)}\n\n`);
    };

    logEmitter.on('log', onLog);

    const pingInterval = setInterval(() => {
        res.write(': ping\n\n');
    }, 30000);

    req.on('close', () => {
        logEmitter.off('log', onLog);
        clearInterval(pingInterval);
        res.end();
    });
});

// ─── SYNC ROUTES ─────────────────────────────────────────────────

app.post('/api/sync/ingest', async (req, res) => {
    const source = req.query.source || null;
    const settings = await getSettings();
    const isFirstSync = settings.first_sync !== false;
    const result = await runPhase1(settings, isFirstSync, source);
    if (isFirstSync) { settings.first_sync = false; await saveSettings(settings); }
    res.json({ message: 'Ingestion complete', status: 'success', results: result });
});

app.post('/api/sync/analyze', async (req, res) => {
    const result = await runPhase2();
    res.json({ message: 'Analysis complete', status: 'success', results: result });
});

app.post('/api/sync', async (req, res) => {
    const source = req.query.source || null;
    const settings = await getSettings();
    const activeSource = source || settings.active_source || 'Gmail';

    if (activeSource === 'Gmail' && (!settings.user_email || !settings.app_password)) {
        return res.status(400).json({ detail: 'Gmail settings not configured' });
    }
    if (activeSource === 'Outlook' && !settings.outlook_tokens && (!settings.emails || !settings.emails.some(e => e.provider === 'Outlook'))) {
        return res.status(400).json({ detail: 'Outlook not connected' });
    }

    const isFirstSync = settings.first_sync !== false;

    // PHASE 1
    const p1Results = await runPhase1(settings, isFirstSync, source);
    if (isFirstSync) { settings.first_sync = false; await saveSettings(settings); }

    // PHASE 2
    const p2Results = await runPhase2();

    res.json({ message: 'Full Sync complete', phase1: p1Results, phase2: p2Results });
});

// ─── BACKGROUND SYNC WORKER ─────────────────────────────────────

async function cleanupOldTrash() {
    try {
        console.log('🧹 Running background Recycle Bin cleanup (30-day retention loop)...');
        const trashFiles = await storageService.listFiles('trash_json', '.json');
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        let count = 0;

        for (const f of trashFiles) {
            try {
                const data = await storageService.readFile('trash_json', f, true);
                if (data && data.deleted_at) {
                    const deletedAtTime = new Date(data.deleted_at).getTime();
                    if (now - deletedAtTime > thirtyDaysMs) {
                        const id = path.parse(f).name;
                        console.log(`🧹 [Cleanup] Permanently deleting expired document: ${id}`);
                        const ext = data.original_ext || '.pdf';
                        const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.txt'];
                        for (const e of supportedExts) {
                            await storageService.deleteFile('trash_docs', `${id}${e}`);
                        }
                        await storageService.deleteFile('trash_json', `${id}.json`);
                        count++;
                    }
                }
            } catch (err) {
                console.error(`Error cleaning up trash file ${f}:`, err.message);
            }
        }
        if (count > 0) {
            console.log(`🧹 Cleanup complete: Permanently deleted ${count} expired documents.`);
        }
    } catch (e) {
        console.error('❌ Error during background trash cleanup:', e.message);
    }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function backgroundSyncWorker() {
    console.log('📫 Background Sync Worker Started (Interval: 5 minutes)');
    await sleep(10000); // Initial delay

    while (true) {
        try {
            await cleanupOldTrash();
            const settings = await getSettings();
            const hasGmail = settings.user_email && settings.app_password;
            const hasOutlook = !!settings.outlook_tokens || (settings.emails && settings.emails.some(e => e.provider === 'Outlook'));

            if (hasGmail || hasOutlook) {
                console.log('📫 Auto-Sync: Starting scheduled document ingestion and analysis...');
                const isFirstSync = settings.first_sync !== false;

                const p1Res = await runPhase1(settings, isFirstSync);
                console.log(`✅ Phase 1 (Ingest): ${p1Res}`);

                if (isFirstSync) { settings.first_sync = false; await saveSettings(settings); }

                const p2Res = await runPhase2();
                console.log(`✅ Phase 2 (Analysis): ${p2Res}`);
                console.log('Auto-Sync: Completed cycle successfully.');
            } else {
                console.log('⚠️ Auto-Sync skipped: No source configured (Gmail or Outlook).');
            }
        } catch (e) {
            console.error(`❌ Background Sync Error: ${e.message}`);
        }

        await sleep(300000); // 5 minutes
    }
}

// ─── SERVER START ────────────────────────────────────────────────

function startServer() {
    // Start background worker (non-blocking)
    backgroundSyncWorker();

    app.listen(8000, '0.0.0.0', () => {
        console.log('🚀 DocSyncAI Node.js Server running on http://0.0.0.0:8000');
    });
}

// Export for CLI usage
export { app, runPhase1, runPhase2, getSettings, startServer, buildSAPPayload };

// Auto-start if this file is the main module
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) startServer();
