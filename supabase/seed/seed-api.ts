/**
 * Run this script to seed the CPALE exam template via Supabase API.
 * Usage: npx ts-node supabase/seed/seed-api.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import cpaleTemplate from './cpale-template.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  const { error } = await supabase
    .from('exam_templates')
    .upsert(
      {
        name: cpaleTemplate.name,
        slug: cpaleTemplate.slug,
        config: cpaleTemplate,
      },
      { onConflict: 'slug' }
    )

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('CPALE template seeded successfully.')
}

seed()
