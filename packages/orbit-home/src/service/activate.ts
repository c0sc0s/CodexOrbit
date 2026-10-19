import type { ServiceContext } from "@c0sc0s/orbit/sdk";
import { HomePreferencesRepository } from "./preferences.js";

export function activate(context: ServiceContext) {
  const repository = new HomePreferencesRepository(context.stateDirectory);
  context.rpc.handle("getPreferences", () => repository.read());
  context.rpc.handle("updatePreferences", async value => {
    const preferences = await repository.update(value);
    context.events.publish("preferences", preferences);
    return preferences;
  });
}
