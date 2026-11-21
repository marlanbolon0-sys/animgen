// Factory `animationProvider` — satu titik pergantian vendor AI.
//   ANIMATION_PROVIDER=runway|meshy|mock  → paksa provider tertentu
//   kosong                                → otomatis: runway jika RUNWAY_API_KEY ada, selain itu mock

import { ANIMATION_PROVIDER, RUNWAY_API_KEY } from "@/lib/env";
import { MeshyProvider } from "./meshy";
import { MockProvider } from "./mock";
import { RunwayProvider } from "./runway";
import type { AnimationProvider } from "./types";

let instance: AnimationProvider | null = null;

export function getAnimationProvider(): AnimationProvider {
  if (!instance) {
    const forced = ANIMATION_PROVIDER;
    if (forced === "runway") instance = new RunwayProvider();
    else if (forced === "meshy") instance = new MeshyProvider();
    else if (forced === "mock") instance = new MockProvider();
    else instance = RUNWAY_API_KEY ? new RunwayProvider() : new MockProvider();
  }
  return instance;
}

export function providerLabel(): string {
  return getAnimationProvider().name;
}

export type { AnimationProvider, ProviderJobStatus, ProviderCreateParams } from "./types";
export { ProviderError } from "./types";
