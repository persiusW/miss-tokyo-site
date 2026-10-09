-- Miss Tokyo AI: Send-to-admin questions and the admin's saved answers.
-- Service role only (RLS on, no policies); used from phase 4.
CREATE TABLE IF NOT EXISTS ai_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  role text NOT NULL,
  question text NOT NULL CHECK (char_length(question) <= 1000),
  excerpt jsonb NOT NULL DEFAULT '[]',
  page_path text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
  answer text CHECK (char_length(answer) <= 4000),
  answered_by uuid REFERENCES profiles(id),
  answered_at timestamptz,
  saved_answer_id uuid,
  reply_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ai_questions_status_idx ON ai_questions (status, created_at);
CREATE INDEX IF NOT EXISTS ai_questions_user_idx ON ai_questions (user_id, created_at);

CREATE TABLE IF NOT EXISTS ai_saved_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) <= 160),
  body text NOT NULL CHECK (char_length(body) <= 4000),
  roles text[] NOT NULL DEFAULT ARRAY['admin','owner','sales_staff'],
  active boolean NOT NULL DEFAULT true,
  source_question_id uuid REFERENCES ai_questions(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_saved_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE ai_questions ADD CONSTRAINT ai_questions_saved_answer_fk
  FOREIGN KEY (saved_answer_id) REFERENCES ai_saved_answers(id);
