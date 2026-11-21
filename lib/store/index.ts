// Pemilihan backend data: Supabase jika env lengkap, selain itu mode demo lokal.

import { isSupabaseConfigured } from "@/lib/env";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";
import type { DataStore } from "./types";

let instance: DataStore | null = null;

export function getStore(): DataStore {
  if (!instance) {
    instance = isSupabaseConfigured() ? new SupabaseStore() : new LocalStore();
  }
  return instance;
}

export function storeBackend(): "local" | "supabase" {
  return getStore().backend;
}

export type { DataStore, UserProfile, VideoRecord, VideoStatus, VideoMode } from "./types";
