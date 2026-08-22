ALTER TABLE habits
    DROP CONSTRAINT IF EXISTS habits_type_check;

ALTER TABLE habits
    ADD CONSTRAINT habits_type_check
    CHECK (type IN ('check', 'count', 'duration', 'score', 'time'));
