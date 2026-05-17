const { Router } = require('express')
const supabase = require('../vera_supabase')

const router = Router()

router.get('/', async (req, res) => {
    try {
        const { user_id } = req.query
        if (!user_id) return res.status(400).json({ error: 'user_id requerido' })

        const { data, error } = await supabase
            .from('vera_people')
            .select('*')
            .eq('user_id', user_id)
            .order('capture_count', { ascending: false })

        if (error) throw error
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/', async (req, res) => {
    try {
        const { user_id, name, relation } = req.body
        if (!user_id || !name) return res.status(400).json({ error: 'user_id y name requeridos' })

        const { data, error } = await supabase
            .from('vera_people')
            .insert({ user_id, name, relation: relation || null })
            .select()
            .single()

        if (error) throw error
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
