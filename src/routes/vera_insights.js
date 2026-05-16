const { Router } = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('../supabase')

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params

        const { data: pending } = await supabase
            .from('vera_insights')
            .select('*')
            .eq('user_id', user_id)
            .is('shown_at', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (pending) {
            await supabase.from('vera_insights').update({ shown_at: new Date().toISOString() }).eq('id', pending.id)
            return res.json({ message: pending.message })
        }

        const { data: captures } = await supabase
            .from('vera_captures')
            .select('type, tags, emotion, metadata, created_at')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (!captures || captures.length < 3) return res.json({ message: null })

        const resumen = captures
            .map(c => `[${c.type}] ${c.metadata?.summary || ''} — tags: ${(c.tags || []).join(', ')}${c.emotion ? ` — emoción: ${c.emotion}` : ''}`)
            .join('\n')

        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 120,
            temperature: 0.8,
            system: 'Sos Vera, asistente de memoria personal. Basándote en las capturas recientes del usuario, generá UNA observación breve, empática y útil (máximo 2 oraciones). Podés notar patrones, sugerir reflexiones o destacar algo recurrente. Solo el texto, sin comillas ni formato extra.',
            messages: [{ role: 'user', content: resumen }],
        })

        const message = msg.content[0].text.trim()

        const { data: saved } = await supabase
            .from('vera_insights')
            .insert({ user_id, message, shown_at: new Date().toISOString() })
            .select()
            .single()

        res.json({ message: saved?.message || message })
    } catch (err) {
        console.error(err)
        res.json({ message: null })
    }
})

module.exports = router
