import { Config } from "./types.js";

export const defaultKirimaseConfigOptions: Config = {
  driver: null,
  hasSrc: false,
  provider: null,
  packages: [],
  preferredPackageManager: "pnpm",
  orm: null,
  auth: null,
  t3: false,
  alias: "@",
  componentLib: null,
  analytics: true,
} as const;

export const defaultKirimaseConfigWithRootPath = {
  ...defaultKirimaseConfigOptions,
  rootPath: process.cwd(),
} as const;
