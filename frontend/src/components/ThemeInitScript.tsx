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

export function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: THEME_INIT_SCRIPT,
      }}
    />
  );
}
