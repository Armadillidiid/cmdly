#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { Effect, Layer } from "effect";
import { CliService } from "./cli.js";

const layers = Layer.mergeAll(CliService.Default, NodeContext.layer);

Effect.gen(function* () {
  const cli = yield* CliService;
  yield* cli.run(process.argv);
}).pipe(Effect.provide(layers), NodeRuntime.runMain());
