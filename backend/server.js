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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// ─── SETUP PATHS ─────────────────────────────────────────────────
const BASE_DIR = __dirname;
const DATA_ROOT = path.join(BASE_DIR, 'InovicePDFs');
const DOWNLOADS = path.join(DATA_ROOT, 'pdfdownloads');
const METADATA_DIR = path.join(DATA_ROOT, 'pdfdownloadsmetadata');
const READY_FOR_SAP = path.join(DATA_ROOT, 'ready_for_sap');
const SAP_DOCS = path.join(READY_FOR_SAP, 'documents');
const SAP_JSON = path.join(READY_FOR_SAP, 'json');
const ARCHIVE_JUNK = path.join(DATA_ROOT, 'processed_archive', 'junk');
const SETTINGS_FILE = path.join(BASE_DIR, 'settings.json');

for (const p of [DOWNLOADS, METADATA_DIR, SAP_DOCS, SAP_JSON, ARCHIVE_JUNK]) {
    fs.mkdirSync(p, { recursive: true });
}

// Static file serving (PDF previews)
app.use('/api/pdf-docs', express.static(SAP_DOCS));
app.use('/api/pending-docs', express.static(DOWNLOADS));

// Serve Frontend in Production
const DIST_PATH = path.join(BASE_DIR, '..', 'dist');
if (fs.existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(DIST_PATH, 'index.html'));
    });
    console.log(`✅ Production Frontend detected at ${DIST_PATH}`);
}


// ─── API & AUTH CONSTANTS ────────────────────────────────────────
const MODEL_ID = 'gemini-3-flash-preview';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const OUTLOOK_TENANT_ID = process.env.OUTLOOK_TENANT_ID || 'common';
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:8000/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

const AUTHORITY = `https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}`;
const SCOPE = ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/User.Read'];

const PROMPT_ANALYSIS = `
Analyze this document with extreme precision for SAP S/4HANA integration.

1. DATA CLEANING RULES:
   - DATES: Convert all dates to 'YYYY-MM-DD' format.
   - AMOUNTS: Return as clean strings with exactly two decimal places (e.g., "1250.00"). REMOVE $, commas, or spaces.
   - CURRENCY: Use standard 3-letter ISO codes (e.g., USD, CAD).
   - EMPTY FIELDS: Use null or "" rather than "N/A".

2. LOGIC:
   - Set "is_legit_invoice" to true if it is a financial document.
   - Set "total_pages_detected".

3. EXTRACTION:
   - HEADER: context, purchase_order_number, order_reference, customer_name, customer_address, supplier_name, supplier_address, po_date, invoice_date, requested_delivery_date.
   - LINE_ITEMS: material_description, quantity, unit_price, line_amount, line_tax, net_amount.
   - TOTALS: total_amount, total_discount, total_tax, gross_payable_amount, currency, tax_description.

*** IMPORTANT: For 'tax_description', look for text like 'Hst', 'Gst', 'Sales Tax', 'Exempt', or 'Zero Rated'. If not found, use 'Standard'. ***

Return a JSON object structured exactly like this:
{
  "is_legit_invoice": boolean,
  "total_pages_detected": integer,
  "header": { "field_name": "value" },
  "line_items": [ { "field_name": "value" } ],
  "totals": { "field_name": "value" }
}
`;

// ─── SETTINGS HELPERS ────────────────────────────────────────────

function getSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        } catch { return {}; }
    }
    return {};
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4));
}

// ─── SETTINGS ROUTES ─────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
    const settings = getSettings();
    // Mask secrets
    if (settings.app_password) settings.app_password = '********';
    for (const key of ['openai_api_key', 'anthropic_api_key', 'gemini_api_key']) {
        if (settings[key]) settings[key] = '********';
    }
    res.json(settings);
});

app.post('/api/settings/email', (req, res) => {
    const current = getSettings();
    Object.assign(current, req.body);
    saveSettings(current);
    res.json({ message: 'Email settings updated successfully' });
});

app.post('/api/settings/ai', (req, res) => {
    const { provider, api_key, model } = req.body;
    const current = getSettings();
    current[`${provider.toLowerCase()}_api_key`] = api_key;
    current.active_provider = provider;
    if (model) current[`${provider.toLowerCase()}_model`] = model;
    saveSettings(current);
    res.json({ message: `${provider} settings updated successfully` });
});

app.get('/api/settings/prompt', (req, res) => {
    const settings = getSettings();
    res.json({ prompt: settings.custom_prompt || PROMPT_ANALYSIS });
});

app.post('/api/settings/prompt', (req, res) => {
    const current = getSettings();
    current.custom_prompt = req.body.prompt;
    saveSettings(current);
    res.json({ message: 'Prompt updated successfully' });
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

// ─── OUTLOOK OAUTH ENDPOINTS ─────────────────────────────────────

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
    });
}

app.get('/api/auth/outlook/login', async (req, res) => {
    try {
        console.log('--- [OUTLOOK] LOGIN REQUESTED ---');
        const msalApp = getMsalApp();
        if (!msalApp) throw new Error('Outlook registration missing in .env (ID or Secret)');

        const authUrl = await msalApp.getAuthCodeUrl({
            scopes: SCOPE,
            redirectUri: OUTLOOK_REDIRECT_URI,
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
        const result = await msalApp.acquireTokenByCode({
            code: req.query.code,
            scopes: SCOPE,
            redirectUri: OUTLOOK_REDIRECT_URI,
        });

        const current = getSettings();
        current.outlook_tokens = {
            access_token: result.accessToken,
            refresh_token: result.refreshToken || result.tokenCache?.serialize?.() || '',
            expires_at: (Date.now() / 1000) + (result.expiresOn ? (result.expiresOn.getTime() - Date.now()) / 1000 : 3600),
            user_principal_name: result.account?.username || '',
        };
        current.active_source = 'Outlook';
        saveSettings(current);

        res.redirect(`${FRONTEND_URL}/settings?outlook=success`);

    } catch (e) {
        res.status(400).json({ detail: e.message });
    }
});

function getOutlookToken() {
    const settings = getSettings();
    const tokens = settings.outlook_tokens;
    if (!tokens) return null;

    // If token is still valid (1 minute buffer)
    if (Date.now() / 1000 < (tokens.expires_at || 0) - 60) {
        return tokens.access_token;
    }

    // Token expired — for now return the existing one and let Graph API decide
    // (full refresh requires cached MSAL state which is complex in stateless mode)
    console.log('--- [OUTLOOK] Token may be expired, using existing ---');
    return tokens.access_token;
}

// ─── DOCUMENT LISTING ────────────────────────────────────────────

app.get('/api/documents', (req, res) => {
    const docs = [];

    // 1. From Ready for SAP (Analyzed)
    if (fs.existsSync(SAP_JSON)) {
        for (const f of fs.readdirSync(SAP_JSON)) {
            if (!f.endsWith('.json')) continue;
            try {
                const data = JSON.parse(fs.readFileSync(path.join(SAP_JSON, f), 'utf-8'));
                docs.push({
                    id: path.parse(f).name,
                    data,
                    status: 'success',
                    is_legit: true,
                    is_pending: false,
                });
            } catch { /* skip */ }
        }
    }

    // 2. From Ingested but not yet Analyzed (Pending)
    if (fs.existsSync(DOWNLOADS)) {
        for (const f of fs.readdirSync(DOWNLOADS)) {
            if (!f.toLowerCase().endsWith('.pdf')) continue;
            const docId = path.parse(f).name;
            if (docs.some((d) => d.id === docId)) continue;

            let emailMeta = {};
            const metaFile = path.join(METADATA_DIR, docId + '.json');
            if (fs.existsSync(metaFile)) {
                try { emailMeta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')); } catch { /* skip */ }
            }

            docs.push({
                id: docId,
                data: {
                    email_metadata: emailMeta,
                    header: { context: Object.keys(emailMeta).length ? 'Ingested' : 'Local File', supplier_name: 'AI Analyzing...' },
                    totals: { currency: '', total_amount: 'Pending' },
                },
                status: 'pending',
                is_legit: false,
                is_pending: true,
            });
        }
    }

    docs.sort((a, b) => b.id.localeCompare(a.id));
    res.json(docs);
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
    const successCount = fs.existsSync(SAP_JSON) ? fs.readdirSync(SAP_JSON).filter((f) => f.endsWith('.json')).length : 0;
    const pendingCount = fs.existsSync(DOWNLOADS) ? fs.readdirSync(DOWNLOADS).filter((f) => f.toLowerCase().endsWith('.pdf')).length : 0;
    const failedCount = fs.existsSync(ARCHIVE_JUNK) ? fs.readdirSync(ARCHIVE_JUNK).filter((f) => f.toLowerCase().endsWith('.pdf')).length : 0;

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
    const user = settings.user_email;
    if (!user) return 'Gmail skip: No email configured';
    const password = (settings.app_password || '').replace(/ /g, '');
    const host = settings.imap_server || 'imap.gmail.com';

    let downloadedCount = 0;
    let imap;

    try {
        imap = await imapConnect({ user, password, host });
        await imapOpenBox(imap, 'INBOX');

        const searchCriteria = isFirstSync ? 'ALL' : 'UNSEEN';
        let emailIds;
        try {
            // Gmail-specific: filter for emails with attachments
            emailIds = await imapSearch(imap, [searchCriteria, ['X-GM-RAW', 'has:attachment']]);
        } catch {
            // Fallback for non-Gmail IMAP servers
            emailIds = await imapSearch(imap, [searchCriteria]);
        }

        // Limit results
        if (isFirstSync) emailIds = emailIds.slice(-50);
        else emailIds = emailIds.slice(-10);

        for (const seqno of emailIds) {
            try {
                const rawMsg = await imapFetchOne(imap, seqno);
                const parsed = await simpleParser(rawMsg);

                const from = parsed.from?.text || '';
                const subject = parsed.subject || '';
                const date = parsed.date?.toUTCString() || '';
                const bodyContent = parsed.text || '';
                const allAttachments = (parsed.attachments || []).map((a) => a.filename).filter(Boolean);

                // Summarize email body with Gemini
                const emailSummary = await geminiSummarize(bodyContent, GEMINI_KEY);

                // Process PDF attachments
                for (const att of parsed.attachments || []) {
                    if (att.contentType !== 'application/pdf' || !att.filename) continue;

                    const uniqueFilename = `${seqno}_${att.filename}`;
                    const dlPath = path.join(DOWNLOADS, uniqueFilename);
                    const sapPath = path.join(SAP_DOCS, uniqueFilename);

                    if (fs.existsSync(dlPath) || fs.existsSync(sapPath)) continue;

                    // Save PDF
                    fs.writeFileSync(dlPath, att.content);

                    // Save metadata
                    const meta = {
                        from: from,
                        subject: subject,
                        received_at: date,
                        summary: emailSummary,
                        all_attachments: allAttachments,
                        original_filename: att.filename,
                    };
                    const baseName = path.parse(uniqueFilename).name;
                    fs.writeFileSync(path.join(METADATA_DIR, baseName + '.json'), JSON.stringify(meta));

                    downloadedCount++;
                }

                // Mark as seen
                await imapAddFlags(imap, seqno, ['\\Seen']);
            } catch (msgErr) {
                console.error(`Error processing email ${seqno}:`, msgErr.message);
            }
        }

        imap.end();
        return `Downloaded ${downloadedCount} new PDFs from Gmail (${searchCriteria})`;
    } catch (e) {
        if (imap) try { imap.end(); } catch { /* ignore */ }
        return `Phase 1 error: ${e.message}`;
    }
}

// ─── PHASE 1 — OUTLOOK GRAPH API INGESTION ───────────────────────

async function runOutlookSync(isFirstSync) {
    const token = getOutlookToken();
    if (!token) return 'Outlook error: Failed to get access token';

    const headers = { Authorization: `Bearer ${token}` };
    let downloadedCount = 0;

    try {
        let filterQuery = '';
        if (!isFirstSync) {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            filterQuery = `&$filter=receivedDateTime ge ${yesterday} and hasAttachments eq true`;
        } else {
            filterQuery = '&$filter=hasAttachments eq true&$top=50';
        }

        const url = `https://graph.microsoft.com/v1.0/me/messages?${filterQuery}`;
        const response = await fetch(url, { headers });
        const data = await response.json();
        const messages = data.value || [];

        for (const msg of messages) {
            const msgId = msg.id;
            const subject = msg.subject || '(No Subject)';
            const from = msg.from?.emailAddress?.address || 'Unknown';
            const date = msg.receivedDateTime || '';
            const bodyContent = msg.bodyPreview || '';

            // Get attachments
            const attUrl = `https://graph.microsoft.com/v1.0/me/messages/${msgId}/attachments`;
            const attResp = await fetch(attUrl, { headers });
            const attData = await attResp.json();
            const attachments = attData.value || [];

            // Summarize
            const emailSummary = await geminiSummarize(bodyContent, GEMINI_KEY);
            const allAttachmentNames = attachments.map((a) => a.name).filter(Boolean);

            for (const att of attachments) {
                if (att['@odata.type'] !== '#microsoft.graph.fileAttachment') continue;
                if (!att.name?.toLowerCase().endsWith('.pdf')) continue;

                const safeId = msgId.slice(-12);
                const uniqueFilename = `${safeId}_${att.name}`;

                if (fs.existsSync(path.join(DOWNLOADS, uniqueFilename)) || fs.existsSync(path.join(SAP_DOCS, uniqueFilename))) continue;

                // Save PDF (contentBytes is base64)
                if (att.contentBytes) {
                    fs.writeFileSync(path.join(DOWNLOADS, uniqueFilename), Buffer.from(att.contentBytes, 'base64'));
                }

                // Save metadata
                const meta = {
                    from,
                    subject,
                    received_at: date,
                    summary: emailSummary,
                    all_attachments: allAttachmentNames,
                    original_filename: att.name,
                };
                const baseName = path.parse(uniqueFilename).name;
                fs.writeFileSync(path.join(METADATA_DIR, baseName + '.json'), JSON.stringify(meta));

                downloadedCount++;
            }
        }

        return `Downloaded ${downloadedCount} new PDFs from Outlook`;
    } catch (e) {
        return `Outlook Sync Error: ${e.message}`;
    }
}

// ─── PHASE 1 — ENTRY POINT ──────────────────────────────────────

async function runPhase1(settings, isFirstSync, sourceOverride) {
    const activeSource = sourceOverride || settings.active_source || 'Gmail';
    if (activeSource === 'Outlook') return runOutlookSync(isFirstSync);
    return runGmailSync(settings, isFirstSync);
}

// ─── PHASE 2 — AI ANALYSIS ──────────────────────────────────────

async function runPhase2() {
    const settings = getSettings();
    const activeProvider = (settings.active_provider || 'Gemini').toLowerCase();
    const apiKey = settings[`${activeProvider}_api_key`] || GEMINI_KEY;
    const customPrompt = settings.custom_prompt || PROMPT_ANALYSIS;

    if (!apiKey) return `Phase 2 error: Missing API key for ${activeProvider}`;

    const client = new GoogleGenAI({ apiKey });
    const modelId = settings[`${activeProvider}_model`] || MODEL_ID;

    let processedCount = 0;
    const pdfs = fs.existsSync(DOWNLOADS) ? fs.readdirSync(DOWNLOADS).filter((f) => f.toLowerCase().endsWith('.pdf')) : [];

    for (const fname of pdfs) {
        const pdfPath = path.join(DOWNLOADS, fname);
        const baseName = path.parse(fname).name;
        const metaPath = path.join(METADATA_DIR, baseName + '.json');

        try {
            // Rate limit pause
            console.log(`⏳ [Server] Waiting 15s for ${fname}...`);
            await sleep(15000);

            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                try {
                    const pdfData = fs.readFileSync(pdfPath);
                    if (!pdfData.length) break;

                    const base64Pdf = pdfData.toString('base64');

                    const response = await client.models.generateContent({
                        model: modelId,
                        contents: [
                            customPrompt,
                            { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                        ],
                        config: { responseMimeType: 'application/json' },
                    });

                    if (!response.text) throw new Error('Empty AI response');

                    const aiData = JSON.parse(response.text.trim());
                    const isLegit = aiData.is_legit_invoice || false;

                    // Merge email metadata
                    if (fs.existsSync(metaPath)) {
                        try { aiData.email_metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { /* skip */ }
                    }

                    if (isLegit) {
                        fs.renameSync(pdfPath, path.join(SAP_DOCS, fname));
                        fs.writeFileSync(path.join(SAP_JSON, baseName + '.json'), JSON.stringify(aiData, null, 4));
                    } else {
                        fs.renameSync(pdfPath, path.join(ARCHIVE_JUNK, fname));
                    }

                    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

                    processedCount++;
                    break; // Success

                } catch (e) {
                    const errMsg = e.message || '';
                    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                        attempts++;
                        console.log(`⚠️ Rate limit hit. Waiting 60s (Attempt ${attempts}/${maxAttempts})...`);
                        await sleep(60000);
                    } else {
                        attempts++;
                        console.error(`❌ Error analyzing ${fname}:`, errMsg);
                        await sleep(5000);
                        if (attempts >= maxAttempts) break;
                    }
                }
            }
        } catch (e) {
            console.error(`Fatal error for ${fname}:`, e.message);
        }
    }

    return `Analyzed ${processedCount} documents`;
}

// ─── SYNC ROUTES ─────────────────────────────────────────────────

app.post('/api/sync/ingest', async (req, res) => {
    const source = req.query.source || null;
    const settings = getSettings();
    const isFirstSync = settings.first_sync !== false;
    const result = await runPhase1(settings, isFirstSync, source);
    if (isFirstSync) { settings.first_sync = false; saveSettings(settings); }
    res.json({ message: 'Ingestion complete', status: 'success', results: result });
});

app.post('/api/sync/analyze', async (req, res) => {
    const result = await runPhase2();
    res.json({ message: 'Analysis complete', status: 'success', results: result });
});

app.post('/api/sync', async (req, res) => {
    const source = req.query.source || null;
    const settings = getSettings();
    const activeSource = source || settings.active_source || 'Gmail';

    if (activeSource === 'Gmail' && (!settings.user_email || !settings.app_password)) {
        return res.status(400).json({ detail: 'Gmail settings not configured' });
    }
    if (activeSource === 'Outlook' && !settings.outlook_tokens) {
        return res.status(400).json({ detail: 'Outlook not connected' });
    }

    const isFirstSync = settings.first_sync !== false;

    // PHASE 1
    const p1Results = await runPhase1(settings, isFirstSync, source);
    if (isFirstSync) { settings.first_sync = false; saveSettings(settings); }

    // PHASE 2
    const p2Results = await runPhase2();

    res.json({ message: 'Full Sync complete', phase1: p1Results, phase2: p2Results });
});

// ─── BACKGROUND SYNC WORKER ─────────────────────────────────────

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function backgroundSyncWorker() {
    console.log('📫 Background Sync Worker Started (Interval: 5 minutes)');
    await sleep(10000); // Initial delay

    while (true) {
        try {
            const settings = getSettings();
            const hasGmail = settings.user_email && settings.app_password;
            const hasOutlook = !!settings.outlook_tokens;

            if (hasGmail || hasOutlook) {
                console.log('📫 Auto-Sync: Starting scheduled document ingestion and analysis...');
                const isFirstSync = settings.first_sync !== false;

                const p1Res = await runPhase1(settings, isFirstSync);
                console.log(`✅ Phase 1 (Ingest): ${p1Res}`);

                if (isFirstSync) { settings.first_sync = false; saveSettings(settings); }

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
export { app, runPhase1, runPhase2, getSettings, startServer };

// Auto-start if this file is the main module
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) startServer();
