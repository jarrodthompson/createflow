// Provide safe defaults so env-validated modules load under test.
process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/db?schema=public";
process.env.SESSION_SECRET ||= "test-session-secret-at-least-32-characters-long";
process.env.TOKEN_ENC_KEY ||= "test-token-encryption-key-at-least-32-chars";
