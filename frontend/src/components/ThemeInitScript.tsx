import { AD_PLACEMENT_STORAGE_KEY, resolveAdPlacementMode } from "@/lib/adPlacementExperiment";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var storedTheme = localStorage.getItem("ergg-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : prefersDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

const adPlacementMode = resolveAdPlacementMode(
  process.env.NEXT_PUBLIC_AD_PLACEMENT_MODE,
  process.env.NODE_ENV
);

const AD_PLACEMENT_INIT_SCRIPT = `
(function () {
  var mode = ${JSON.stringify(adPlacementMode)};
  var storageKey = ${JSON.stringify(AD_PLACEMENT_STORAGE_KEY)};
  var variant = "control";
  var source = "off";
  var previewVariant = new URLSearchParams(window.location.search).get("adPlacementVariant");

  if (previewVariant === "control" || previewVariant === "optimized") {
    mode = previewVariant;
  }

  if (mode === "control" || mode === "optimized") {
    variant = mode;
    source = "forced";
  } else if (mode === "experiment") {
    source = "experiment";
    try {
      var stored = localStorage.getItem(storageKey);
      if (stored === "control" || stored === "optimized") {
        variant = stored;
      } else {
        var randomBucket = Math.random();
        if (window.crypto && typeof window.crypto.getRandomValues === "function") {
          var randomValue = new Uint32Array(1);
          window.crypto.getRandomValues(randomValue);
          randomBucket = randomValue[0] / 4294967296;
        }
        variant = randomBucket < 0.5 ? "control" : "optimized";
        localStorage.setItem(storageKey, variant);
      }
    } catch (error) {
      variant = Math.random() < 0.5 ? "control" : "optimized";
    }
  }

  document.documentElement.dataset.adPlacementVariant = variant;
  document.documentElement.dataset.adPlacementSource = source;
})();
`;

export function ThemeInitScript() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: THEME_INIT_SCRIPT,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: AD_PLACEMENT_INIT_SCRIPT,
        }}
      />
    </>
  );
}
