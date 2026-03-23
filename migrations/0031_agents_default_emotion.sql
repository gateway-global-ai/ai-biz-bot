-- Live Emotion Control: default emotional tone for agents (calm | engaged | focused | energized | empathetic)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_emotion text;
