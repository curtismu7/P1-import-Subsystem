import { Router } from 'express';
import path from 'path';

const router = Router();

// Example route
router.get("/test", (req, res) => {
    res.json({ message: "API is working!" });
});

// Settings route - redirect to main app which handles settings view
router.get('/settings', (req, res) => {
    res.redirect('/');
});

// SECTION: Test UI Routes
// Serve the worker token manager test UI
router.get('/test-token-manager', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'test-token-manager.html'));
});

export default router;
