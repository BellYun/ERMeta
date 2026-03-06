export function isDesktopAuthEnabled(): boolean {
  // 기본값은 enabled(true)로 두고, 운영에서 명시적으로 끌 수 있게 한다.
  return process.env.ENABLE_DESKTOP_AUTH !== "false";
}

