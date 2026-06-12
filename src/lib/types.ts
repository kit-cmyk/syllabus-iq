export type Subject = {
  id: string;
  code: string;
  name: string;
  exam_item_count: number;
  exam_minutes: number;
  sort_order: number;
};

export type Topic = {
  id: string;
  subject_id: string;
  name: string;
  tos_weight: number;
  sort_order: number;
};

export type Question = {
  id: string;
  topic_id: string;
  stem: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  difficulty: number;
};

/** Question as shipped to the player: no answer, no explanation. */
export type SanitizedQuestion = Omit<Question, "correct_index" | "explanation">;

export type QuizMode = "tutor" | "timed";

export type QuizSession = {
  id: string;
  user_id: string;
  type: "practice" | "mock";
  mode: QuizMode;
  subject_id: string;
  topic_ids: string[];
  question_ids: string[];
  question_count: number;
  started_at: string;
  completed_at: string | null;
  score_pct: number | null;
};

export type Attempt = {
  id: string;
  user_id: string;
  session_id: string;
  question_id: string;
  topic_id: string;
  chosen_index: number;
  is_correct: boolean;
  seconds_taken: number | null;
  created_at: string;
};

export type TopicMastery = {
  user_id: string;
  topic_id: string;
  score: number;
  distinct_seen: number;
  last_attempt_at: string;
};

export type Band =
  | "not-started"
  | "learning"
  | "developing"
  | "proficient"
  | "mastered";

export type ReadinessStatus = "PASS" | "CONDITIONAL" | "NOT_YET";
