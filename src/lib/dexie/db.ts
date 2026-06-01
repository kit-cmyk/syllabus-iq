import Dexie, { type Table } from 'dexie'

export interface LocalUserNode {
  id?: number
  user_id: string
  enrollment_id: string
  node_path: string
  coverage_status: 'unread' | 'in_progress' | 'completed'
  mastery_score: number
  updated_at: string
  synced: boolean
}

export interface LocalSession {
  id?: number
  remote_id?: string
  user_id: string
  enrollment_id: string
  node_path: string
  type: 'passive' | 'quiz'
  duration_minutes?: number
  score?: number
  total_items?: number
  logged_at: string
  synced: boolean
}

export interface PendingOp {
  id?: number
  table_name: string
  operation: 'upsert' | 'insert'
  payload: Record<string, unknown>
  created_at: string
  attempts: number
}

export class SyllabusIQDb extends Dexie {
  user_nodes!: Table<LocalUserNode>
  sessions!: Table<LocalSession>
  pending_ops!: Table<PendingOp>

  constructor() {
    super('syllabusiq')
    this.version(1).stores({
      user_nodes: '++id, [user_id+enrollment_id+node_path], synced, updated_at',
      sessions: '++id, remote_id, [user_id+enrollment_id], synced, logged_at',
      pending_ops: '++id, table_name, created_at',
    })
  }
}

let _db: SyllabusIQDb | null = null

export function getDb(): SyllabusIQDb {
  if (!_db) _db = new SyllabusIQDb()
  return _db
}
