// =================================================================
// DocSyncAI — CLI Master Controller (Node.js)
// Replaces Python app.py
//
// Usage:
//   node app.js server   - Start the Backend Server
//   node app.js phase1   - Run Email Ingestion once
//   node app.js phase2   - Run AI Analysis once
//   node app.js sync     - Run Sync (Phase 1 + Phase 2) once
// =================================================================

const command = process.argv[2]?.toLowerCase();

if (!command) {
    console.log('\n--- Document Automation Master Controller (Node.js) ---');
    console.log('Usage:');
    console.log('  node app.js server   - Start the Backend Server');
    console.log('  node app.js phase1   - Run Email Ingestion once');
    console.log('  node app.js phase2   - Run AI Analysis once');
    console.log('  node app.js sync     - Run Sync (Phase 1 + Phase 2) once');
    console.log('------------------------------------------------------\n');
    process.exit(0);
}

if (command === 'server') {
    // Import and start the full server
    const { startServer } = await import('./server.js');
    startServer();
} else if (command === 'phase1') {
    console.log('Starting Phase 1: Email Ingestion...');
    try {
        const { runPhase1, getSettings } = await import('./server.js');
        const storageService = (await import('./storageService.js')).default;
        const settings = await getSettings();
        const isFirstSync = settings.first_sync !== false;
        const result = await runPhase1(settings, isFirstSync);
        console.log(`Phase 1 completed: ${result}`);
        if (isFirstSync) {
            settings.first_sync = false;
            await storageService.saveFile('settings', 'settings.json', settings, true);
        }
    } catch (e) {
        console.error(`Phase 1 failed: ${e.message}`);
    }
    process.exit(0);
} else if (command === 'phase2') {
    console.log('Starting Phase 2: AI Analysis...');
    try {
        const { runPhase2 } = await import('./server.js');
        const result = await runPhase2();
        console.log(`Phase 2 completed: ${result}`);
    } catch (e) {
        console.error(`Phase 2 failed: ${e.message}`);
    }
    process.exit(0);
} else if (command === 'sync') {
    console.log('Starting Full Sync (Phase 1 + Phase 2)...');
    try {
        const { runPhase1, runPhase2, getSettings } = await import('./server.js');
        const storageService = (await import('./storageService.js')).default;
        const settings = await getSettings();
        const isFirstSync = settings.first_sync !== false;

        const p1 = await runPhase1(settings, isFirstSync);
        console.log(`Phase 1: ${p1}`);

        const p2 = await runPhase2();
        console.log(`Phase 2: ${p2}`);

        if (isFirstSync) {
            settings.first_sync = false;
            await storageService.saveFile('settings', 'settings.json', settings, true);
        }
    } catch (e) {
        console.error(`Sync failed: ${e.message}`);
    }
    process.exit(0);
} else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
