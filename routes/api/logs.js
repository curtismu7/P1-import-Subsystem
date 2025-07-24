import { Router } from 'express';
const router = Router();

router.post('/', (req, res) => {
  console.log('[CLIENT LOG]', req.body);
  res.json({ success: true });
});

export default router; 