import type { PluginEntry } from "../sdk/contracts.js";

export interface PluginDescriptor { id: string; version: string; expression: string; instanceId?: string }
export interface PluginEndpoint { binding: string | null; token: string | null }
export interface PluginSource { id: string; version: string; source: string; apiVersion?: 1; config?: Record<string, unknown>; owner?: string | null; endpoint?: PluginEndpoint }
export interface LoaderManifest { path: string; root: string; plugins: PluginEntry[] }
export interface Target { id: string; type?: string; url?: string; webSocketDebuggerUrl: string }
export interface BindingCall { name: string; payload: string; executionContextId: number }
export interface PluginResult { targetId?: string; pluginId: string | null; status?: unknown; injected?: boolean; stage?: string; error?: string }
export interface CleanupFailure { pluginId: string; stage: string }
export interface PluginSummary { id: string; version: string; instanceId?: string; state: string }
