export type DraftPayload = Record<string, string | null | string[]>;

export interface FormDraft<TPayload extends DraftPayload = DraftPayload> {
  id: string;
  draft_key: string;
  form_key: string;
  entity_type: string;
  entity_id?: string;
  schema_version: number;
  payload: TPayload;
  base_entity_version?: string;
  revision: number;
  client_updated_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface LocalDraft<TPayload extends DraftPayload = DraftPayload> {
  storage_key: string;
  actor_subject: string;
  draft_key: string;
  form_key: string;
  entity_type: string;
  entity_id?: string;
  schema_version: number;
  payload: TPayload;
  base_entity_version?: string;
  server_revision: number;
  client_updated_at: string;
  server_updated_at?: string;
}

export type DraftSaveState = "memuat" | "siap" | "menunggu" | "menyimpan" | "tersimpan" | "lokal" | "konflik" | "gagal";

export interface DraftRecovery<TPayload extends DraftPayload> {
  server?: FormDraft<TPayload>;
  local?: LocalDraft<TPayload>;
  recommended: "server" | "local";
  conflict: boolean;
}
