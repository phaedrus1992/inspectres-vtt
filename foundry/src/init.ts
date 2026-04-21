/**
 * InSpectres Foundry VTT System
 * Entry point: register Hooks, CONFIG patches, and system initialization
 */

console.log("InSpectres system initializing...");

Hooks.once("init", () => {
  console.log("InSpectres | System init");

  // Register custom document classes and sheets will go here
  // TODO: Register Agent, Franchise, and their sheets
});

Hooks.once("ready", () => {
  console.log("InSpectres | System ready");
});
