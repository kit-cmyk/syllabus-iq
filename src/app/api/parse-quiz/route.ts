import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import Fuse from 'fuse.js'
import type { ExamTemplate } from '@/types/exam'

const RequestSchema = z.object({
  raw_text: z.string().min(10).max(50000),
  enrollment_id: z.string().uuid(),
})

const QuizItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  topic_hint: z.string(),
})

const ParsedQuizSchema = z.object({
  items: z.array(QuizItemSchema),
  total: z.number(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { raw_text, enrollment_id } = parsed.data

  // Get exam template for topic matching
  const { data: enrollment } = await supabase
    .from('user_exam_enrollments')
    .select('template_id, exam_templates(config)')
    .eq('id', enrollment_id)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  const template = (enrollment.exam_templates as unknown as { config: ExamTemplate } | null)?.config
  const topicList = template
    ? template.subjects.flatMap((s) =>
        s.domains.flatMap((d) =>
          d.topics.map((t) => ({ id: t.id, label: t.label, subjectCode: s.code }))
        )
      )
    : []

  // Call Claude API to extract Q&A
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract all question-answer pairs from the following quiz text. For each item, provide:
1. The question text
2. The correct answer
3. A topic_hint: a short phrase describing the accounting/legal/tax subject matter of this question

Return ONLY valid JSON matching this schema:
{"items": [{"question": "...", "answer": "...", "topic_hint": "..."}], "total": <number>}

Quiz text:
---
${raw_text}
---`,
      },
    ],
  })

  const rawContent = response.content[0]
  if (rawContent.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 })
  }

  // Parse JSON from Claude's response
  let quizData
  try {
    const jsonMatch = rawContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    quizData = ParsedQuizSchema.parse(JSON.parse(jsonMatch[0]))
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Fuzzy-match each item's topic_hint to the syllabus tree
  const fuse = new Fuse(topicList, { keys: ['label', 'subjectCode'], threshold: 0.4 })

  const itemsWithNodes = quizData.items.map((item) => {
    const results = fuse.search(item.topic_hint)
    const bestMatch = results[0]?.item ?? null
    return {
      ...item,
      suggested_node: bestMatch
        ? { id: bestMatch.id, label: bestMatch.label, subjectCode: bestMatch.subjectCode }
        : null,
    }
  })

  return NextResponse.json({
    items: itemsWithNodes,
    total: quizData.total,
  })
}
