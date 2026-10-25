import { supportsKvCas } from "@grok/agent-sdk";

/** Structural view of ctx.host.kv. Values are JSON. */
export type Kv = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
};

type Versioned = { value: unknown; version: string };
type CasKv = Kv & {
  getWithVersion(key: string): Promise<Versioned | undefined>;
  putIfAbsent(key: string, value: unknown): Promise<{ ok: boolean }>;
  putIfVersion(key: string, value: unknown, version: string): Promise<{ ok: boolean }>;
};

function asCas(kv: Kv): CasKv | undefined {
  if (!supportsKvCas(kv as Parameters<typeof supportsKvCas>[0])) return undefined;
  return kv as unknown as CasKv;
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function updateStringList(
  kv: Kv,
  key: string,
  update: (ids: string[]) => string[],
): Promise<void> {
  const cas = asCas(kv);
  if (cas) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await cas.getWithVersion(key);
      const next = update(stringList(current?.value));
      if (current === undefined) {
        const created = await cas.putIfAbsent(key, next);
        if (created.ok) return;
        continue;
      }
      const written = await cas.putIfVersion(key, next, current.version);
      if (written.ok) return;
    }
  }
  await kv.put(key, update(stringList(await kv.get(key))));
}

/** First writer wins. Returns true when this caller claimed the key. */
export async function claimKey(kv: Kv, key: string, value: unknown): Promise<boolean> {
  const cas = asCas(kv);
  if (cas) {
    const result = await cas.putIfAbsent(key, value);
    return result.ok;
  }
  if ((await kv.get(key)) !== undefined) return false;
  await kv.put(key, value);
  return true;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
