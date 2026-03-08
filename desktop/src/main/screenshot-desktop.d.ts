declare module "screenshot-desktop" {
  function screenshot(opts?: { format?: string; screen?: number }): Promise<Buffer>;
  export = screenshot;
}
