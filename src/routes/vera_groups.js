const { Router } = require('express')
const { randomUUID } = require('crypto')
const supabase = require('../vera_supabase')

const router = Router()

// GET /api/vera/groups?user_id=
router.get('/groups', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' })

  const { data: memberships, error: memErr } = await supabase
    .from('vera_group_members')
    .select('group_id')
    .eq('user_id', user_id)

  if (memErr) {
    console.error('getGroups members:', memErr)
    return res.status(500).json({ error: memErr.message })
  }

  const groupIds = memberships.map(m => m.group_id)
  if (groupIds.length === 0) return res.json([])

  const { data: groups, error: gErr } = await supabase
    .from('vera_groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false })

  if (gErr) {
    console.error('getGroups:', gErr)
    return res.status(500).json({ error: gErr.message })
  }
  res.json(groups)
})

// POST /api/vera/groups
router.post('/groups', async (req, res) => {
  const { user_id, name } = req.body
  if (!user_id || !name) return res.status(400).json({ error: 'user_id y name son requeridos' })

  const { data: group, error: groupErr } = await supabase
    .from('vera_groups')
    .insert({ user_id, name: name.trim(), invite_token: randomUUID() })
    .select()
    .single()

  if (groupErr) {
    console.error('createGroup:', groupErr)
    return res.status(500).json({ error: groupErr.message })
  }

  // Auto-inscribir al creador como miembro
  const { error: memberErr } = await supabase
    .from('vera_group_members')
    .insert({ group_id: group.id, user_id })

  if (memberErr) console.error('createGroup addMember:', memberErr)

  res.status(201).json({ ...group, member_count: 1 })
})

// GET /api/vera/groups/join/:token — público
router.get('/groups/join/:token', async (req, res) => {
  const { token } = req.params

  const { data, error } = await supabase
    .from('vera_groups')
    .select('id, name, created_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (error) {
    console.error('getGroupByToken:', error)
    return res.status(500).json({ error: error.message })
  }
  if (!data) return res.status(404).json({ error: 'Grupo não encontrado' })
  res.json(data)
})

// POST /api/vera/groups/join
router.post('/groups/join', async (req, res) => {
  const { user_id, invite_token } = req.body
  if (!user_id || !invite_token) return res.status(400).json({ error: 'user_id e invite_token son requeridos' })

  const { data: group, error: groupErr } = await supabase
    .from('vera_groups')
    .select('id, name')
    .eq('invite_token', invite_token)
    .maybeSingle()

  if (groupErr) {
    console.error('joinGroup find:', groupErr)
    return res.status(500).json({ error: groupErr.message })
  }
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

  const { error: memberErr } = await supabase
    .from('vera_group_members')
    .upsert({ group_id: group.id, user_id }, { onConflict: 'group_id,user_id' })

  if (memberErr) {
    console.error('joinGroup insert:', memberErr)
    return res.status(500).json({ error: memberErr.message })
  }
  res.json(group)
})

// GET /api/vera/groups/:group_id/albums
router.get('/groups/:group_id/albums', async (req, res) => {
  const { group_id } = req.params

  const { data, error } = await supabase
    .from('vera_albums')
    .select('id, name, cover_url')
    .eq('group_id', group_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getGroupAlbums:', error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

module.exports = router
