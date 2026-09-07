import assert from "node:assert/strict";
import test from "node:test";

import { CodexLaunchSupervisor } from "../src/launch-supervisor.mjs";

function createProcessState() {
  const state = { running: false, listening: false, owned: false, hasArguments: false };
  return {
    state,
    process: {
      isRunning: async () => state.running,
      portIsListening: async () => state.listening,
      ownsCdpEndpoint: async () => state.owned,
      hasCdpLaunchArguments: async () => state.hasArguments,
    },
  };
}

test("detects a new PID even when a stopped interval was not observed", async () => {
  const { state, process } = createProcessState();
  state.running = true;
  let pid = "100";
  process.runIdentity = async () => pid;
  let starts = 0;
  const supervisor = new CodexLaunchSupervisor({ codexProcess: process, startController: async () => { starts += 1; }, runtimeIsHealthy: async () => false, wait: async () => {} });
  await supervisor.tick();
  pid = "101";
  await supervisor.tick();
  await supervisor.tick();
  assert.equal(starts, 2);
});

test("activates once for each official Codex app run", async () => {
  const { state, process } = createProcessState();
  let activations = 0;
  const supervisor = new CodexLaunchSupervisor({
    codexProcess: process,
    startController: async () => { activations += 1; },
    runtimeIsHealthy: async () => false,
    wait: async () => {},
  });

  assert.equal((await supervisor.tick()).state, "stopped");
  state.running = true;
  assert.equal((await supervisor.tick()).state, "restarted-and-activated");
  assert.equal((await supervisor.tick()).state, "already-handled");
  assert.equal(activations, 1);

  state.running = false;
  await supervisor.tick();
  state.running = true;
  assert.equal((await supervisor.tick()).state, "restarted-and-activated");
  assert.equal(activations, 2);
});

test("does not restart repeatedly after a foreign port or activation failure", async () => {
  const { state, process } = createProcessState();
  state.running = true;
  state.listening = true;
  const supervisor = new CodexLaunchSupervisor({
    codexProcess: process,
    startController: async () => { throw new Error("must not start"); },
    runtimeIsHealthy: async () => false,
    wait: async () => {},
  });

  assert.equal((await supervisor.tick()).state, "foreign-port");
  assert.equal((await supervisor.tick()).state, "already-handled");
});

test("leaves an already healthy runtime untouched", async () => {
  const { state, process } = createProcessState();
  state.running = true;
  state.listening = true;
  state.owned = true;
  let activations = 0;
  const supervisor = new CodexLaunchSupervisor({
    codexProcess: process,
    startController: async () => { activations += 1; },
    runtimeIsHealthy: async () => true,
    wait: async () => {},
  });

  assert.equal((await supervisor.tick()).state, "already-active");
  assert.equal(activations, 0);
});

test("connects without restarting when Codex already has CDP launch arguments", async () => {
  const { state, process } = createProcessState();
  state.running = true;
  state.hasArguments = true;
  let activations = 0;
  const supervisor = new CodexLaunchSupervisor({
    codexProcess: process,
    startController: async () => { activations += 1; },
    runtimeIsHealthy: async () => false,
    wait: async () => {},
  });

  assert.equal((await supervisor.tick()).state, "connected");
  assert.equal(activations, 1);
});
