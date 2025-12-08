import { Config } from "./schema.js";

declare const __VERSION__: string;
declare const __NAME__: string;

const VERSION: string =
  typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";
const NAME: string = typeof __NAME__ !== "undefined" ? __NAME__ : "unknown";

const CONFIG_DIRECTORY = `~/.config/${NAME}`;
const CONFIG_FILENAME = `${NAME}.json`;

const STATE_DIRECTORY = `~/.local/state/${NAME}`;
const CREDENTIALS_FILENAME = "credentials.json";

const DEFAULT_CONFIG: Config = {
  model: "gpt-4o-mini",
  provider: "github-copilot",
};

export {
  NAME,
  VERSION,
  CONFIG_DIRECTORY,
  CONFIG_FILENAME,
  STATE_DIRECTORY,
  CREDENTIALS_FILENAME,
  DEFAULT_CONFIG,
};
