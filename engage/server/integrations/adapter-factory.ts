import { BasePlatformAdapter, AdapterConfig } from "./base-adapter.js";
import { RainfocusAdapter } from "./rainfocus.js";

export type AdapterType = "rainfocus" | "cvent" | "eventbrite";

export function createAdapter(type: AdapterType, config: AdapterConfig): BasePlatformAdapter {
  switch (type) {
    case "rainfocus":
      return new RainfocusAdapter(config);
    // Future adapters:
    // case "cvent":
    //   return new CventAdapter(config);
    // case "eventbrite":
    //   return new EventbriteAdapter(config);
    default:
      throw new Error(`Unsupported platform adapter: ${type}`);
  }
}
