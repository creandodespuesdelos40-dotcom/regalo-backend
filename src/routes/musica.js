const express = require('express');
const axios = require('axios');

const router = express.Router();

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

// GET /api/musica — list music files from Bunny.net CDN
router.get('/', async (req, res) => {
  const folder = req.query.folder || 'audios';

  try {
    const response = await axios.get(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${folder}/`,
      {
        headers: {
          AccessKey: BUNNY_API_KEY,
          Accept: 'application/json',
        },
      }
    );

    const files = response.data
      .filter(f => !f.IsDirectory && /\.(mp3|wav|ogg|m4a)$/i.test(f.ObjectName))
      .map(f => {
        let name = f.ObjectName;
        try { name = decodeURIComponent(name); } catch {}
        const titulo = name
          .replace(/\.[^.]+$/, '')   // remove extension
          .replace(/^\d+[-_\s]*/, '') // strip leading numeric ID
          .replace(/[-_]/g, ' ')      // dashes/underscores → spaces
          .trim();
        return {
          titulo,
          url: `${BUNNY_CDN_URL}/${folder}/${f.ObjectName}`,
          tamanho: f.Length,
        };
      });

    res.json(files);
  } catch (err) {
    console.error('Error listando música de Bunny.net:', err.response?.data || err.message);
    // Return empty array so frontend doesn't crash — user can still type a URL manually
    res.json([]);
  }
});

module.exports = router;
