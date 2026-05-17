const { createClient } = require('@supabase/supabase-js')

module.exports = createClient(
  process.env.VERA_SUPABASE_URL,
  process.env.VERA_SUPABASE_SERVICE_ROLE_KEY
)
