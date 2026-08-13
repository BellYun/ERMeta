import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { L10N_CORE_SEEDS } from "@/generated/l10nCoreSeeds";
import { L10N_CHUNK_MANIFEST, type L10nNamespace } from "@/generated/l10nManifest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("l10n namespace loader", () => {
  it("deduplicates concurrent requests for the same language and namespace", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ "Item/Name/101101": "가위" })));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchL10nNamespace } = await import("@/utils/l10n");
    const [first, second] = await Promise.all([
      fetchL10nNamespace("Korean", "item-names"),
      fetchL10nNamespace("Korean", "item-names"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /^\/l10n\/chunks\/Korean\/item-names\.[a-f0-9]{12}\.json$/
    );
    expect(first.get("Item/Name/101101")).toBe("가위");
    expect(second).toBe(first);
  });

  it("evicts a failed request so it can be retried", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ "Character/Name/1": "재키" })));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchL10nNamespace } = await import("@/utils/l10n");

    await expect(fetchL10nNamespace("Korean", "core")).rejects.toThrow(
      "core l10n 데이터를 불러올 수 없습니다."
    );
    await expect(fetchL10nNamespace("Korean", "core")).resolves.toEqual(
      new Map([["Character/Name/1", "재키"]])
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("generated l10n chunks", () => {
  const allowedPrefixes: Record<L10nNamespace, string[]> = {
    core: ["Character/Name/", "WeaponType/", "Trait/Name/"],
    "item-names": ["Item/Name/"],
    "game-descriptions": ["Item/Effect/", "Trait/Tooltip/"],
  };

  const minimumKeyCount: Record<L10nNamespace, number> = {
    core: 300,
    "item-names": 1_000,
    "game-descriptions": 400,
  };

  it.each(Object.entries(L10N_CHUNK_MANIFEST))(
    "keeps %s manifest hashes and namespace contents in sync",
    (_language, namespaces) => {
      for (const [namespace, publicPath] of Object.entries(namespaces)) {
        const content = readFileSync(join(process.cwd(), "public", publicPath), "utf8");
        const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
        const chunk = JSON.parse(content) as Record<string, string>;
        const prefixes = allowedPrefixes[namespace as L10nNamespace];

        expect(publicPath).toContain(`.${hash}.json`);
        expect(Object.keys(chunk).length).toBeGreaterThan(
          minimumKeyCount[namespace as L10nNamespace]
        );
        expect(
          Object.keys(chunk).every((key) => prefixes.some((prefix) => key.startsWith(prefix)))
        ).toBe(true);
      }
    }
  );

  it.each(Object.entries(L10N_CHUNK_MANIFEST))(
    "keeps the generated %s server seed in sync with the public core chunk",
    (language, namespaces) => {
      const publicCore = JSON.parse(
        readFileSync(join(process.cwd(), "public", namespaces.core), "utf8")
      );

      expect(L10N_CORE_SEEDS[language as keyof typeof L10N_CORE_SEEDS]).toEqual(publicCore);
    }
  );
});
