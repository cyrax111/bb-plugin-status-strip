import type { BbPluginApi } from "@get-bb/plugin-sdk";

// Status Strip is frontend-only: app.tsx reads usage and context through the
// host SDK. bb still requires a server entry, so this registers nothing.
export default async function plugin(_bb: BbPluginApi) {}
