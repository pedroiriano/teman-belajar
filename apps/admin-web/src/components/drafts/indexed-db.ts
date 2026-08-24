import type { DraftPayload, LocalDraft } from "./types";

const databaseName = "teman-belajar-admin-drafts-v1";
const storeName = "drafts";

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        const store = database.createObjectStore(storeName, { keyPath: "storage_key" });
        store.createIndex("actor_form", ["actor_subject", "form_key"], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB tidak tersedia"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Operasi IndexedDB gagal"));
  });
}

export function localDraftKey(actorSubject: string, draftKey: string) {
  return `${actorSubject}:${draftKey}`;
}

export async function getLocalDraft<TPayload extends DraftPayload>(actorSubject: string, draftKey: string): Promise<LocalDraft<TPayload> | undefined> {
  const database = await openDraftDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    return await requestResult(transaction.objectStore(storeName).get(localDraftKey(actorSubject, draftKey))) as LocalDraft<TPayload> | undefined;
  } finally {
    database.close();
  }
}

export async function putLocalDraft<TPayload extends DraftPayload>(draft: LocalDraft<TPayload>) {
  const database = await openDraftDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await requestResult(transaction.objectStore(storeName).put(draft));
  } finally {
    database.close();
  }
}

export async function deleteLocalDraft(actorSubject: string, draftKey: string) {
  const database = await openDraftDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await requestResult(transaction.objectStore(storeName).delete(localDraftKey(actorSubject, draftKey)));
  } finally {
    database.close();
  }
}
