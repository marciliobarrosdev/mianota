import { SQL } from "bun";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres.abgsdnrfyivkwqwwlixf:!Socorr%40o013@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

const sql = new SQL(connectionString);

async function run() {
  console.log("Applying support desk migrations...");
  await sql.unsafe(`
    ALTER TABLE platform_support_conversation
      ADD COLUMN IF NOT EXISTS assigned_to text,
      ADD COLUMN IF NOT EXISTS assigned_name text,
      ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
      ADD COLUMN IF NOT EXISTS resolved_by text,
      ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_by text,
      ADD COLUMN IF NOT EXISTS lid_jid text,
      ADD COLUMN IF NOT EXISTS pn_jid text,
      ADD COLUMN IF NOT EXISTS avatar_url text;

    CREATE INDEX IF NOT EXISTS idx_support_conv_status ON platform_support_conversation (status);
    CREATE INDEX IF NOT EXISTS idx_support_conv_deleted ON platform_support_conversation (deleted_at);
    CREATE INDEX IF NOT EXISTS idx_support_conv_lid ON platform_support_conversation (lid_jid);
    CREATE INDEX IF NOT EXISTS idx_support_conv_pn ON platform_support_conversation (pn_jid);

    ALTER TABLE platform_support_message
      ADD COLUMN IF NOT EXISTS sender_name text,
      ADD COLUMN IF NOT EXISTS sender_id text,
      ADD COLUMN IF NOT EXISTS media_url text,
      ADD COLUMN IF NOT EXISTS media_meta jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS quoted_message_id text;

    CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON platform_support_message (conversation_id, created_at DESC);
  `);

  console.log("Migration applied successfully!");
  await sql.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
