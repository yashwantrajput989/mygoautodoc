import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    S3Client, 
    PutObjectCommand, 
    GetObjectCommand, 
    DeleteObjectCommand, 
    ListObjectsV2Command, 
    CopyObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Env config loading is done in server.js but load here just in case
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'mygo-docsync-invoices';

// Local Directories Layout
const DATA_ROOT = path.join(__dirname, 'InovicePDFs');
const CATEGORY_MAP_LOCAL = {
    downloads: path.join(DATA_ROOT, 'pdfdownloads'),
    metadata: path.join(DATA_ROOT, 'pdfdownloadsmetadata'),
    sap_docs: path.join(DATA_ROOT, 'ready_for_sap', 'documents'),
    sap_json: path.join(DATA_ROOT, 'ready_for_sap', 'json'),
    archive_junk: path.join(DATA_ROOT, 'processed_archive', 'junk'),
    trash_docs: path.join(DATA_ROOT, 'trash', 'documents'),
    trash_json: path.join(DATA_ROOT, 'trash', 'json'),
    settings: path.join(__dirname, 'settings.json'),
    users: path.join(__dirname, 'users.json')
};

// S3 Prefixes Layout
const CATEGORY_MAP_S3 = {
    downloads: 'pdfdownloads/',
    metadata: 'pdfdownloadsmetadata/',
    sap_docs: 'ready_for_sap/documents/',
    sap_json: 'ready_for_sap/json/',
    archive_junk: 'processed_archive/junk/',
    trash_docs: 'trash/documents/',
    trash_json: 'trash/json/',
    settings: 'settings.json',
    users: 'users.json'
};

class StorageService {
    constructor() {
        this.type = STORAGE_TYPE;
        console.log(`🔌 [Storage] Initializing storage in [${this.type.toUpperCase()}] mode`);
        
        if (this.type === 's3') {
            const s3Config = {
                region: AWS_REGION
            };
            // Optional: If running locally but testing S3, credentials might be loaded from env or AWS shared file.
            // If they are explicitly in env, SDK picks them up automatically.
            this.s3 = new S3Client(s3Config);
            this.bucket = AWS_S3_BUCKET;
        }
    }

    /**
     * Initializes folders locally.
     */
    init() {
        if (this.type === 'local') {
            const dirs = [
                CATEGORY_MAP_LOCAL.downloads,
                CATEGORY_MAP_LOCAL.metadata,
                CATEGORY_MAP_LOCAL.sap_docs,
                CATEGORY_MAP_LOCAL.sap_json,
                CATEGORY_MAP_LOCAL.archive_junk,
                CATEGORY_MAP_LOCAL.trash_docs,
                CATEGORY_MAP_LOCAL.trash_json
            ];
            for (const d of dirs) {
                if (!fs.existsSync(d)) {
                    fs.mkdirSync(d, { recursive: true });
                }
            }
            console.log('📂 [Storage] Local directories verified/created');
        } else {
            console.log(`☁️ [Storage] S3 Bucket configured: ${this.bucket}`);
        }
    }

    /**
     * Resolves local file path or S3 key for a category + filename
     */
    _resolve(category, filename) {
        if (this.type === 'local') {
            if (category === 'settings' || category === 'users') {
                return CATEGORY_MAP_LOCAL[category];
            }
            return path.join(CATEGORY_MAP_LOCAL[category], filename);
        } else {
            if (category === 'settings' || category === 'users') {
                return CATEGORY_MAP_S3[category];
            }
            return `${CATEGORY_MAP_S3[category]}${filename}`;
        }
    }

    /**
     * Write file content (JSON string or binary Buffer)
     */
    async saveFile(category, filename, data, isJson = false) {
        const content = isJson ? JSON.stringify(data, null, 4) : data;
        
        if (this.type === 'local') {
            const filePath = this._resolve(category, filename);
            fs.writeFileSync(filePath, content);
        } else {
            const key = this._resolve(category, filename);
            const body = typeof content === 'string' ? Buffer.from(content) : content;
            const contentType = isJson ? 'application/json' : 'application/pdf';
            
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: contentType
            }));
        }
    }

    /**
     * Read file content (returns Buffer, or parsed JSON if isJson=true)
     */
    async readFile(category, filename, isJson = false) {
        if (this.type === 'local') {
            const filePath = this._resolve(category, filename);
            if (!fs.existsSync(filePath)) {
                if (isJson) return null;
                throw new Error(`File not found: ${filePath}`);
            }
            const data = fs.readFileSync(filePath);
            return isJson ? JSON.parse(data.toString('utf-8')) : data;
        } else {
            const key = this._resolve(category, filename);
            try {
                const response = await this.s3.send(new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: key
                }));
                
                const streamToBuffer = (stream) => new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on('data', (chunk) => chunks.push(chunk));
                    stream.on('error', reject);
                    stream.on('end', () => resolve(Buffer.concat(chunks)));
                });
                
                const buffer = await streamToBuffer(response.Body);
                return isJson ? JSON.parse(buffer.toString('utf-8')) : buffer;
            } catch (err) {
                if (err.name === 'NoSuchKey' && isJson) {
                    return null;
                }
                throw err;
            }
        }
    }

    /**
     * Check if a file exists
     */
    async existsFile(category, filename) {
        if (this.type === 'local') {
            const filePath = this._resolve(category, filename);
            return fs.existsSync(filePath);
        } else {
            const key = this._resolve(category, filename);
            try {
                await this.s3.send(new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: key
                }));
                return true;
            } catch (err) {
                if (err.name === 'NotFound' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
                    return false;
                }
                throw err;
            }
        }
    }

    /**
     * Delete a file
     */
    async deleteFile(category, filename) {
        if (this.type === 'local') {
            const filePath = this._resolve(category, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } else {
            const key = this._resolve(category, filename);
            await this.s3.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
        }
    }

    /**
     * Moves a file from one category to another (preserves filename)
     */
    async moveFile(fromCategory, toCategory, filename) {
        if (this.type === 'local') {
            const fromPath = this._resolve(fromCategory, filename);
            const toPath = this._resolve(toCategory, filename);
            
            // Ensure destination directory exists (edge case)
            const destDir = path.dirname(toPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            
            if (fs.existsSync(fromPath)) {
                fs.renameSync(fromPath, toPath);
            }
        } else {
            const sourceKey = this._resolve(fromCategory, filename);
            const destKey = this._resolve(toCategory, filename);
            
            // Copy Object
            await this.s3.send(new CopyObjectCommand({
                Bucket: this.bucket,
                CopySource: encodeURIComponent(`${this.bucket}/${sourceKey}`),
                Key: destKey
            }));
            
            // Delete Original
            await this.s3.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: sourceKey
            }));
        }
    }

    /**
     * Lists files in a category matching a specific extension (e.g. '.pdf' or '.json')
     * Returns an array of filenames.
     */
    async listFiles(category, extension = '') {
        if (this.type === 'local') {
            const dirPath = CATEGORY_MAP_LOCAL[category];
            if (!fs.existsSync(dirPath)) return [];
            
            const files = fs.readdirSync(dirPath);
            if (!extension) return files;
            return files.filter(f => f.toLowerCase().endsWith(extension.toLowerCase()));
        } else {
            const prefix = CATEGORY_MAP_S3[category];
            const response = await this.s3.send(new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix
            }));
            
            const contents = response.Contents || [];
            const files = contents.map(c => {
                // Strip the prefix to get the filename
                return c.Key.slice(prefix.length);
            }).filter(Boolean); // Filter out the directory folder object itself
            
            if (!extension) return files;
            return files.filter(f => f.toLowerCase().endsWith(extension.toLowerCase()));
        }
    }

    /**
     * Returns either the path (for local SendFile) or S3 dynamic stream (for Express stream piping)
     */
    async getStreamOrPath(category, filename) {
        if (this.type === 'local') {
            const filePath = this._resolve(category, filename);
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            return { type: 'path', value: filePath };
        } else {
            const key = this._resolve(category, filename);
            const response = await this.s3.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
            return { type: 'stream', value: response.Body };
        }
    }
}

const storageService = new StorageService();
export default storageService;
