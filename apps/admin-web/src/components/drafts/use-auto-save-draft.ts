"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { deleteLocalDraft, getLocalDraft, localDraftKey, putLocalDraft } from "./indexed-db";
import type { DraftPayload, DraftRecovery, DraftSaveState, FormDraft, LocalDraft } from "./types";

const draftKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AutoSaveOptions<TPayload extends DraftPayload> {
  formKey: string;
  entityType: string;
  entityId?: string;
  baseEntityVersion?: string;
  value: TPayload;
  emptyValue: TPayload;
  enabled?: boolean;
  onRecover: (payload: TPayload) => void;
  onStartNew: (payload: TPayload) => void;
}

interface SessionResponse { actorId?: string }
interface DraftListResponse<TPayload extends DraftPayload> { data?: FormDraft<TPayload>[] }
interface DraftProblem<TPayload extends DraftPayload> { detail?: string; current_draft?: FormDraft<TPayload> }

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalValue(child)]),
    );
  }
  return value;
}

function serialized(value: DraftPayload) {
  return JSON.stringify(canonicalValue(value));
}

function newerSource<TPayload extends DraftPayload>(server?: FormDraft<TPayload>, local?: LocalDraft<TPayload>) {
  if (!server) return "local" as const;
  if (!local) return "server" as const;
  return Date.parse(local.client_updated_at) > Date.parse(server.client_updated_at) ? "local" as const : "server" as const;
}

export function useAutoSaveDraft<TPayload extends DraftPayload>(options: AutoSaveOptions<TPayload>) {
  const { formKey, entityType, entityId, baseEntityVersion, enabled = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialDraftKey = useRef(searchParams.get("draft") ?? "");
  const [draftKey, setDraftKey] = useState("");
  const [actorSubject, setActorSubject] = useState("");
  const [state, setState] = useState<DraftSaveState>("memuat");
  const [message, setMessage] = useState("Menyiapkan pemulihan draft…");
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [recovery, setRecovery] = useState<DraftRecovery<TPayload>>();
  const [immediateRequest, setImmediateRequest] = useState(0);
  const initialized = useRef(false);
  const initializationStarted = useRef(false);
  const actorRef = useRef("");
  const keyRef = useRef("");
  const serverRevision = useRef(0);
  const valueRef = useRef(options.value);
  const lastSubmitted = useRef("");
  const saveInFlight = useRef(false);
  const pendingPayload = useRef<TPayload | undefined>(undefined);
  const handledImmediateRequest = useRef(0);

  useEffect(() => {
    valueRef.current = options.value;
  }, [options.value]);

  const setURLDraftKey = useCallback((key: string) => {
    const query = new URLSearchParams(window.location.search);
    query.set("draft", key);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }, [pathname, router]);

  const savePayload = useCallback(async (payload: TPayload) => {
    if (!initialized.current || !actorRef.current || !keyRef.current) return false;
    if (saveInFlight.current) {
      pendingPayload.current = payload;
      return false;
    }
    saveInFlight.current = true;
    const clientUpdatedAt = new Date().toISOString();
    const local: LocalDraft<TPayload> = {
      storage_key: localDraftKey(actorRef.current, keyRef.current),
      actor_subject: actorRef.current,
      draft_key: keyRef.current,
      form_key: formKey,
      entity_type: entityType,
      entity_id: entityId,
      schema_version: 1,
      payload,
      base_entity_version: baseEntityVersion,
      server_revision: serverRevision.current,
      client_updated_at: clientUpdatedAt,
    };
    let localSaved = true;
    try {
      await putLocalDraft(local);
    } catch {
      localSaved = false;
    }
    setState("menyimpan");
    setMessage("Menyimpan draft aman…");
    try {
      const response = await fetch(`/api/bff/drafts/${keyRef.current}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Request-ID": crypto.randomUUID() },
        body: JSON.stringify({
          form_key: formKey,
          entity_type: entityType,
          entity_id: entityId ?? null,
          schema_version: 1,
          payload,
          base_entity_version: baseEntityVersion ?? null,
          expected_revision: serverRevision.current,
          client_updated_at: clientUpdatedAt,
        }),
      });
      if (response.status === 409) {
        const problem = await response.json() as DraftProblem<TPayload>;
        const current = problem.current_draft;
        if (current) serverRevision.current = current.revision;
        setRecovery({ server: current, local, recommended: newerSource(current, local), conflict: true });
        setState("konflik");
        setMessage("Ada versi draft lain. Pilih versi sebelum melanjutkan.");
        return false;
      }
      if (!response.ok) {
        const problem = await response.json().catch(() => ({})) as DraftProblem<TPayload>;
        throw new Error(problem.detail || "Server draft belum dapat dihubungi");
      }
      const saved = await response.json() as FormDraft<TPayload>;
      serverRevision.current = saved.revision;
      lastSubmitted.current = serialized(payload);
      setLastSavedAt(saved.updated_at);
      try {
        await putLocalDraft({ ...local, server_revision: saved.revision, server_updated_at: saved.updated_at });
      } catch {
        localSaved = false;
      }
      setState("tersimpan");
      setMessage(localSaved ? "Draft tersimpan di server dan perangkat ini." : "Draft tersimpan di server; penyimpanan lokal tidak tersedia.");
      return true;
    } catch (error) {
      setState(localSaved ? "lokal" : "gagal");
      setMessage(localSaved ? "Server belum terjangkau. Salinan aman tersimpan di perangkat ini." : (error instanceof Error ? error.message : "Draft belum dapat disimpan."));
      return false;
    } finally {
      saveInFlight.current = false;
      const queued = pendingPayload.current;
      pendingPayload.current = undefined;
      if (queued && serialized(queued) !== lastSubmitted.current) {
        setImmediateRequest((value) => value + 1);
      }
    }
  }, [baseEntityVersion, entityId, entityType, formKey]);

  useEffect(() => {
    if (!enabled || initializationStarted.current) return;
    initializationStarted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await sessionResponse.json() as SessionResponse;
        if (!session.actorId) throw new Error("Identitas sesi Admin tidak tersedia");
        let key = initialDraftKey.current;
        let server: FormDraft<TPayload> | undefined;
        if (!draftKeyPattern.test(key)) {
          const query = new URLSearchParams({ form_key: formKey, entity_type: entityType });
          if (entityId) query.set("entity_id", entityId);
          try {
            const listResponse = await fetch(`/api/bff/drafts?${query.toString()}`, { cache: "no-store" });
            if (listResponse.ok) {
              const list = await listResponse.json() as DraftListResponse<TPayload>;
              server = list.data?.[0];
            }
          } catch {
            // IndexedDB remains available when the API is temporarily unreachable.
          }
          key = server?.draft_key ?? crypto.randomUUID();
          setURLDraftKey(key);
        }
        if (!server) {
          try {
            const serverResponse = await fetch(`/api/bff/drafts/${key}`, { cache: "no-store" });
            if (serverResponse.ok) server = await serverResponse.json() as FormDraft<TPayload>;
          } catch {
            // Continue with the actor-partitioned local draft below.
          }
        }
        const local = await getLocalDraft<TPayload>(session.actorId, key).catch(() => undefined);
        if (cancelled) return;
        actorRef.current = session.actorId;
        keyRef.current = key;
        serverRevision.current = server?.revision ?? local?.server_revision ?? 0;
        setActorSubject(session.actorId);
        setDraftKey(key);
        initialized.current = true;
        if (server || local) {
          const conflict = Boolean(server && local && serialized(server.payload) !== serialized(local.payload));
          setRecovery({ server, local, recommended: newerSource(server, local), conflict });
          setState(conflict ? "konflik" : "siap");
          setMessage(conflict ? "Ditemukan dua versi draft. Tinjau pilihan pemulihan." : "Draft tersimpan ditemukan dan siap dipulihkan.");
        } else {
          lastSubmitted.current = serialized(valueRef.current);
          setState("siap");
          setMessage("Pemulihan draft aktif.");
        }
      } catch (error) {
        if (cancelled) return;
        setState("gagal");
        setMessage(error instanceof Error ? error.message : "Pemulihan draft belum dapat disiapkan.");
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, entityId, entityType, formKey, setURLDraftKey]);

  useEffect(() => {
    if (!initialized.current || recovery) return;
    const snapshot = serialized(options.value);
    if (snapshot === lastSubmitted.current) return;
    setState("menunggu");
    setMessage("Perubahan belum disimpan. Menunggu jeda pengetikan…");
    const saveImmediately = immediateRequest > handledImmediateRequest.current;
    if (saveImmediately) handledImmediateRequest.current = immediateRequest;
    const timer = window.setTimeout(() => void savePayload(options.value), saveImmediately ? 0 : 3000);
    return () => window.clearTimeout(timer);
  }, [immediateRequest, options.value, recovery, savePayload]);

  const recoverFrom = useCallback(async (source: "server" | "local") => {
    const selected = source === "server" ? recovery?.server?.payload : recovery?.local?.payload;
    if (!selected) return;
    options.onRecover(selected);
    if (recovery?.server) {
      serverRevision.current = recovery.server.revision;
      await fetch(`/api/bff/drafts/${keyRef.current}/recovered`, { method: "POST" });
    }
    setRecovery(undefined);
    if (source === "local") {
      await savePayload(selected);
    } else {
      lastSubmitted.current = serialized(selected);
      setState("tersimpan");
      setMessage("Draft server dipulihkan.");
      setLastSavedAt(recovery?.server?.updated_at);
    }
  }, [options, recovery, savePayload]);

  const keepCurrent = useCallback(async () => {
    setRecovery(undefined);
    await savePayload(valueRef.current);
  }, [savePayload]);

  const discard = useCallback(async () => {
    if (!actorRef.current || !keyRef.current) return;
    await fetch(`/api/bff/drafts/${keyRef.current}?reason=discarded`, { method: "DELETE" }).catch(() => undefined);
    await deleteLocalDraft(actorRef.current, keyRef.current).catch(() => undefined);
    serverRevision.current = 0;
    lastSubmitted.current = serialized(options.emptyValue);
    setRecovery(undefined);
    options.onStartNew(options.emptyValue);
    setState("siap");
    setMessage("Draft dibuang. Form siap digunakan kembali.");
  }, [options]);

  const startNew = useCallback(() => {
    const key = crypto.randomUUID();
    keyRef.current = key;
    serverRevision.current = 0;
    lastSubmitted.current = serialized(options.emptyValue);
    setDraftKey(key);
    setRecovery(undefined);
    setURLDraftKey(key);
    options.onStartNew(options.emptyValue);
    setState("siap");
    setMessage("Draft baru dibuat. Draft sebelumnya tetap tersimpan.");
  }, [options, setURLDraftKey]);

  const finalize = useCallback(async () => {
    if (!actorRef.current || !keyRef.current) return false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`/api/bff/drafts/${keyRef.current}?reason=finalized`, {
        method: "DELETE",
      }).catch(() => undefined);
      if (response?.ok || response?.status === 404) {
        await deleteLocalDraft(actorRef.current, keyRef.current).catch(() => undefined);
        return true;
      }
      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
    setState("lokal");
    setMessage("Konten sudah tersimpan, tetapi pembersihan draft tertunda dan akan tersedia untuk dipulihkan.");
    return false;
  }, []);

  return {
    actorSubject, draftKey, state, message, lastSavedAt, recovery,
    saveNow: () => savePayload(valueRef.current),
    requestImmediateSave: () => setImmediateRequest((value) => value + 1),
    recoverFrom, keepCurrent, discard, startNew, finalize,
  };
}
