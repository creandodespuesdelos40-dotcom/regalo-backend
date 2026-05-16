const { Router } = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('../supabase')

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_TYPES = ['idea', 'momento', 'intención', 'contenido']

router.post('/', async (req, res) => {
    try {
        const { user_id, content, type_hint, emotion_override, person_id } = req.body
        if (!user_id || !content) return res.status(400).json({ error: 'user_id y content son requeridos' })

        const typeContext = type_hint && VALID_TYPES.includes(type_hint)
            ? `El usuario ya indicó que es de tipo "${type_hint}". Confirmalo a menos que sea claramente incorrecto.`
            : 'Determiná el tipo analizando el contenido.'

        let classification
        try {
            const msg = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                temperature: 0,
                system: `Sos Vera, asistente de memoria personal. ${typeContext}
Respondé SOLO con JSON válido, sin texto adicional:
{"type":"idea"|"momento"|"intención"|"contenido","emotion":string|null,"tags":["2 a 4 tags cortos en español"],"summary":"una oración resumiendo"}`,
                messages: [{ role: 'user', content }],
            })
            classification = JSON.parse(msg.content[0].text)
            if (!VALID_TYPES.includes(classification.type)) classification.type = type_hint || 'idea'
        } catch (claudeErr) {
            console.warn('Claude no disponible, usando clasificación local:', claudeErr.message)
            classification = { type: type_hint || 'idea', emotion: null, tags: [], summary: content.slice(0, 120) }
        }

        const finalEmotion = emotion_override !== undefined ? emotion_override : classification.emotion

        const { data: capture, error } = await supabase
            .from('vera_captures')
            .insert({
                user_id,
                content,
                type: classification.type,
                emotion: finalEmotion,
                tags: classification.tags || [],
                people_ids: person_id ? [person_id] : [],
                metadata: { summary: classification.summary },
            })
            .select()
            .single()

        if (error) throw error

        if (person_id) {
            const { data: p } = await supabase
                .from('vera_people')
                .select('capture_count')
                .eq('id', person_id)
                .single()
            await supabase
                .from('vera_people')
                .update({ last_capture_at: new Date().toISOString(), capture_count: (p?.capture_count ?? 0) + 1 })
                .eq('id', person_id)
        }

        res.json({ capture, classification })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }
})

router.get('/', async (req, res) => {
    try {
        const { user_id } = req.query
        if (!user_id) return res.status(400).json({ error: 'user_id requerido' })

        const { data, error } = await supabase
            .from('vera_captures')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
