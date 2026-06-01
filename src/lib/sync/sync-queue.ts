'use client'

import { getDb } from '@/lib/dexie/db'
import { createClient } from '@/lib/supabase/client'

let isFlushing = false

export async function flushOfflineQueue(): Promise<void> {
  if (isFlushing || !navigator.onLine) return
  isFlushing = true

  const db = getDb()
  const supabase = createClient()

  try {
    // 1. Sync unsynced user_nodes (upsert)
    const unsyncedNodes = await db.user_nodes.where('synced').equals(0).toArray()
    for (const node of unsyncedNodes) {
      const { error } = await supabase.from('user_nodes').upsert(
        {
          user_id: node.user_id,
          enrollment_id: node.enrollment_id,
          node_path: node.node_path,
          coverage_status: node.coverage_status,
          mastery_score: node.mastery_score,
          updated_at: node.updated_at,
        },
        { onConflict: 'user_id,enrollment_id,node_path' }
      )
      if (!error && node.id) {
        await db.user_nodes.update(node.id, { synced: true })
      }
    }

    // 2. Sync unsynced sessions (insert)
    const unsyncedSessions = await db.sessions.where('synced').equals(0).toArray()
    for (const session of unsyncedSessions) {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: session.user_id,
          enrollment_id: session.enrollment_id,
          node_path: session.node_path,
          type: session.type,
          duration_minutes: session.duration_minutes,
          score: session.score,
          total_items: session.total_items,
          logged_at: session.logged_at,
        })
        .select('id')
        .single()

      if (!error && data && session.id) {
        await db.sessions.update(session.id, { synced: true, remote_id: data.id })
      }
    }
  } finally {
    isFlushing = false
  }
}

export function setupOnlineListener() {
  if (typeof window === 'undefined') return
  window.addEventListener('online', flushOfflineQueue)
  window.addEventListener('syllabusiq:flush-queue', flushOfflineQueue)
}
