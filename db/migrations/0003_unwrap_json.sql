-- Until this fix the API passed already-stringified JSON into jsonb columns, so postgres.js encoded it a second
-- time and rows hold a JSON string ("{\"ref\":\"7\"}") instead of an object. Unwrap those in place. Safe to rerun.
update waitlist set utm = (utm #>> '{}')::jsonb where jsonb_typeof(utm) = 'string';
update events set props = (props #>> '{}')::jsonb where jsonb_typeof(props) = 'string';
