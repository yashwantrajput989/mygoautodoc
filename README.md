# MY DocSyncAI - Inbox to SAP Automation

This project is a Document Automation system designed to streamline the transition from incoming documents (inbox) to SAP systems.

## Key Features

- **Document Ingestion**: Seamless syncing of document data from Gmail and Outlook.
- **AI-Powered Analysis**: Extracting key information using Google Gemini AI models.
- **SAP Integration**: Automated data entry and processing for SAP S/4HANA.
- **Monitoring & Analytics**: Real-time dashboards for document flow.

## Getting Started

### Prerequisites

- Node.js (≥18.x) & npm installed

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```sh
   npm install
   ```
3. Install backend dependencies:
   ```sh
   cd backend
   npm install
   ```
4. Configure environment variables in `backend/.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   OUTLOOK_CLIENT_ID=your_azure_client_id
   OUTLOOK_CLIENT_SECRET=your_azure_client_secret
   OUTLOOK_TENANT_ID=your_azure_tenant_id
   OUTLOOK_REDIRECT_URI=http://localhost:8000/api/auth/callback
   ```

### Running the Application

**Start the backend server:**
```sh
cd backend
node app.js server
```

**Start the frontend dev server:**
```sh
npm run dev
```

**One-shot CLI commands:**
```sh
cd backend
node app.js phase1   # Run email ingestion once
node app.js phase2   # Run AI analysis once
node app.js sync     # Run full sync (phase1 + phase2) once
```

## Technologies Used

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **AI**: Google Gemini (gemini-3-flash-preview)
- **Email**: Gmail (IMAP), Microsoft Outlook (Graph API + OAuth 2.0)
## Production Deployment (AWS EC2)

### 1. Build the Frontend
From the root directory, generate the production build:
```sh
npm run build
```
This creates a `dist/` folder which the backend will automatically detect and serve.

### 2. Environment Variables
On your EC2 instance, ensure `backend/.env` is configured with production values:
```env
GEMINI_API_KEY=your_production_key
FRONTEND_URL=https://your-domain.com
OUTLOOK_REDIRECT_URI=https://your-domain.com/api/auth/callback
# Azure App Registration details
OUTLOOK_CLIENT_ID=...
OUTLOOK_CLIENT_SECRET=...
```

### 3. Start with PM2
Use the provided `ecosystem.config.cjs` to manage the process:
```sh
# Install PM2 globally if not already
npm install -g pm2

# Start the application
pm2 start ecosystem.config.cjs

# Save the process list to restart on reboot
pm2 save
pm2 startup
```

### 4. Nginx Configuration
Set up Nginx as a reverse proxy to port 8000:
```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
