declare const __VERSION__: string;
declare const __NAME__: string;

const VERSION: string =
  typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";
const NAME: string = typeof __NAME__ !== "undefined" ? __NAME__ : "unknown";

export { NAME, VERSION };
