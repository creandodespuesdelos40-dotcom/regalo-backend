const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

const BUCKET = 'verus-musica';
const SIGNED_URL_EXPIRY = 3600; // 1 hora

function toTitulo(objectName) {
  const name = objectName.split('/').pop();
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

// GET /api/musica?folder=musicas/pt — list signed URLs from Supabase Storage
router.get('/', async (req, res) => {
  const folder = req.query.folder || 'musicas/pt';

  try {
    const { data: objects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(folder, { limit: 200 });

    if (listError) throw listError;

    const audioFiles = (objects || []).filter(
      f => f.name && /\.(mp3|wav|ogg|m4a)$/i.test(f.name)
    );

    if (audioFiles.length === 0) return res.json([]);

    const paths = audioFiles.map(f => `${folder}/${f.name}`);

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_EXPIRY);

    if (signError) throw signError;

    const files = signed.map((s, i) => ({
      titulo: toTitulo(audioFiles[i].name),
      url: s.signedUrl,
      tamanho: audioFiles[i].metadata?.size ?? null,
    }));

    res.json(files);
  } catch (err) {
    console.error('Error listando música de Supabase:', err.message);
    res.json([]);
  }
});

module.exports = router;
