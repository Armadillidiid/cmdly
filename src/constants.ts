import type { Config, NonOptional } from "./types.js";

declare const __VERSION__: string;
declare const __NAME__: string;

const VERSION: string =
	typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";
const NAME: string = typeof __NAME__ !== "undefined" ? __NAME__ : "cmdly";

const CONFIG_DIRECTORY = `~/.config/${NAME}`;
const CONFIG_FILENAME = `${NAME}.json`;

const STATE_DIRECTORY = `~/.local/share/${NAME}`;
const CREDENTIALS_FILENAME = "credentials.json";

const DEFAULT_CONFIG: NonOptional<Config> = {
	model: "gpt-5-mini",
	provider: "github-copilot",
	theme: "github-dark-default",
	default_suggest_action: undefined,
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
export const MODELS_CACHE_FILENAME = "models.json";
export const MODELS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours/**

/** List of supported AI providers */
export const SUPPORTED_PROVIDER_IDS = [
	"openai",
	"anthropic",
	"google",
	"github-models",
	"github-copilot",
] as const;

export const SUGGEST_ACTIONS = {
	RUN: "run",
	REVISE: "revise",
	EXPLAIN: "explain",
	COPY: "copy",
	CANCEL: "cancel",
} as const;

export const SUGGEST_ACTION_CHOICES = [
	{ title: "Run", value: SUGGEST_ACTIONS.RUN },
	{ title: "Revise", value: SUGGEST_ACTIONS.REVISE },
	{ title: "Explain", value: SUGGEST_ACTIONS.EXPLAIN },
	{ title: "Copy", value: SUGGEST_ACTIONS.COPY },
	{ title: "Cancel", value: SUGGEST_ACTIONS.CANCEL },
];
