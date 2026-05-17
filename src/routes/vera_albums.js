const { Router } = require('express')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VERA_SUPABASE_URL,
  process.env.VERA_SUPABASE_SERVICE_ROLE_KEY
)

const router = Router()

// GET /api/vera/albums?user_id=
router.get('/albums', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' })

  const { data, error } = await supabase
    .from('vera_albums')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAlbums:', error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// POST /api/vera/albums
router.post('/albums', async (req, res) => {
  const { user_id, name, description } = req.body
  if (!user_id || !name) return res.status(400).json({ error: 'user_id y name son requeridos' })

  const { data, error } = await supabase
    .from('vera_albums')
    .insert({ user_id, name: name.trim(), description: description?.trim() || null })
    .select()
    .single()

  if (error) {
    console.error('createAlbum:', error)
    return res.status(500).json({ error: error.message })
  }
  res.status(201).json(data)
})

// PATCH /api/vera/albums/:album_id/share
router.patch('/albums/:album_id/share', async (req, res) => {
  const { album_id } = req.params
  const { is_shared } = req.body
  if (typeof is_shared !== 'boolean') return res.status(400).json({ error: 'is_shared debe ser boolean' })

  const { data, error } = await supabase
    .from('vera_albums')
    .update({ is_shared })
    .eq('id', album_id)
    .select()
    .single()

  if (error) {
    console.error('toggleShare:', error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// GET /api/vera/albums/:album_id/memories
router.get('/albums/:album_id/memories', async (req, res) => {
  const { album_id } = req.params

  const { data, error } = await supabase
    .from('vera_memories')
    .select('*')
    .eq('album_id', album_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMemories:', error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// POST /api/vera/memories
router.post('/memories', async (req, res) => {
  const { user_id, album_id, type, file_url, caption, emotion, person_id } = req.body
  if (!user_id || !album_id || !type) return res.status(400).json({ error: 'user_id, album_id y type son requeridos' })

  const VALID_TYPES = ['photo', 'video', 'audio', 'text']
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type debe ser uno de: ${VALID_TYPES.join(', ')}` })

  const { data, error } = await supabase
    .from('vera_memories')
    .insert({
      user_id,
      album_id,
      type,
      file_url: file_url || null,
      caption: caption?.trim() || null,
      emotion: emotion?.trim() || null,
      person_id: person_id || null,
    })
    .select()
    .single()

  if (error) {
    console.error('createMemory:', error)
    return res.status(500).json({ error: error.message })
  }
  res.status(201).json(data)
})

// GET /api/vera/shared/:share_token  — público, sin auth
router.get('/shared/:share_token', async (req, res) => {
  const { share_token } = req.params

  const { data: album, error: albumErr } = await supabase
    .from('vera_albums')
    .select('id, name, description, cover_url, created_at')
    .eq('share_token', share_token)
    .eq('is_shared', true)
    .maybeSingle()

  if (albumErr) {
    console.error('getSharedAlbum:', albumErr)
    return res.status(500).json({ error: albumErr.message })
  }
  if (!album) return res.status(404).json({ error: 'Álbum no encontrado o privado' })

  const { data: memories, error: memErr } = await supabase
    .from('vera_memories')
    .select('*')
    .eq('album_id', album.id)
    .order('created_at', { ascending: true })

  if (memErr) {
    console.error('getSharedMemories:', memErr)
    return res.status(500).json({ error: memErr.message })
  }

  res.json({ album, memories })
})

module.exports = router
