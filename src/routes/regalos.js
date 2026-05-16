const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// POST /api/regalos — create (public, no auth required)
router.post('/', async (req, res) => {
  const { musica_url, musica_titulo, mensagem, remetente_nome } = req.body;

  if (!musica_url || !musica_titulo || !mensagem || !remetente_nome) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (mensagem.length > 300) {
    return res.status(400).json({ error: 'Mensaje excede 300 caracteres' });
  }
  if (remetente_nome.length > 100) {
    return res.status(400).json({ error: 'Nombre excede 100 caracteres' });
  }

  let token;
  let attempts = 0;
  while (attempts < 5) {
    token = generateToken();
    const { data: existing } = await supabase
      .from('regalos')
      .select('id')
      .eq('token', token)
      .maybeSingle();
    if (!existing) break;
    attempts++;
  }

  const { data, error } = await supabase
    .from('regalos')
    .insert({
      token,
      remetente_user_id: null,
      remetente_nome: remetente_nome.trim(),
      musica_url,
      musica_titulo,
      mensagem,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando regalo:', error);
    return res.status(500).json({ error: 'Error interno' });
  }

  res.json({ token: data.token });
});

// GET /api/regalos/:token — read (public)
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  const { data, error } = await supabase
    .from('regalos')
    .select('remetente_nome, musica_url, musica_titulo, mensagem, criado_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'Regalo no encontrado' });
  }

  // Mark as accessed if first time
  await supabase
    .from('regalos')
    .update({ acessado: true, acessado_at: new Date().toISOString() })
    .eq('token', token)
    .eq('acessado', false);

  res.json(data);
});

module.exports = router;
