import {
  AdBlockRecoveryPromptPanel,
  type AdBlockRecoveryUiState,
} from "@/components/ads/AdBlockRecoveryPrompt";

const STATES: AdBlockRecoveryUiState[] = [
  "default",
  "hover",
  "focus",
  "active",
  "disabled",
  "loading",
  "error",
  "success",
];

export function AdBlockRecoveryPromptPreview() {
  return (
    <main className="ad-recovery-preview">
      <header className="ad-recovery-preview__header">
        <h1>Ad block recovery prompt</h1>
        <p>A/B copy and all eight interaction states. This wrapper is not mounted in production.</p>
      </header>

      <section className="ad-recovery-preview__variants" aria-label="A/B variants">
        <article>
          <span>Variant A · context</span>
          <AdBlockRecoveryPromptPanel variant="context" locale="ko" preview />
        </article>
        <article>
          <span>Variant B · direct</span>
          <AdBlockRecoveryPromptPanel variant="direct" locale="ko" preview />
        </article>
      </section>

      <section className="ad-recovery-preview__states" aria-label="Interaction states">
        {STATES.map((state) => (
          <article key={state}>
            <span>{state}</span>
            <AdBlockRecoveryPromptPanel variant="context" locale="ko" uiState={state} preview />
          </article>
        ))}
      </section>
    </main>
  );
}
