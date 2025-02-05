import { nilql } from "@nillion/nilql";

console.log("nilQL object:", Object.keys(nilql));

// Log all available methods and properties
for (const key of Object.keys(nilql)) {
  console.log(`${key}:`, typeof nilql[key]);
}
