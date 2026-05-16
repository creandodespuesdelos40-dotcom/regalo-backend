require('dotenv').config();
const express = require('express');
const cors = require('cors');

const regalosRouter = require('./routes/regalos');
const musicaRouter = require('./routes/musica');
const veraCapturesRouter = require('./routes/vera_captures');
const veraPeopleRouter = require('./routes/vera_people');
const veraInsightsRouter = require('./routes/vera_insights');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://regalo-verus.vercel.app',
  'https://regalo.arcitia.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/regalos', regalosRouter);
app.use('/api/musica', musicaRouter);
app.use('/api/vera/captures', veraCapturesRouter);
app.use('/api/vera/people', veraPeopleRouter);
app.use('/api/vera/insights', veraInsightsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
