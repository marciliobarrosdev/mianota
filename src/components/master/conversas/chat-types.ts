export interface CompanyInfo {
  nome?: string;
  nome_fantasia?: string;
  email?: string | null;
  logo_url?: string | null;
}

export interface Conversation {
  id: string;
  phone_e164: string;
  contact_name: string | null;
  subscriber_company_id: string | null;
  status: "open" | "pending" | "resolved";
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  assigned_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  avatar_url: string | null;
  lid_jid: string | null;
  pn_jid: string | null;
  company: CompanyInfo | CompanyInfo[] | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  sender_type: "subscriber" | "owner" | "system";
  sender_name?: string | null;
  sender_id?: string | null;
  message_type: string;
  body: string;
  delivery_status: string;
  media_url?: string | null;
  media_meta?: {
    fileName?: string;
    mimeType?: string;
    mediaType?: string;
    duration?: number;
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
  } | null;
  quoted_message_id?: string | null;
  created_at: string;
}

export interface Operator {
  id: string;
  name: string;
  email?: string | null;
}

export interface QuotedSnippet {
  id: string;
  author: string;
  body: string;
  messageType: string;
}
