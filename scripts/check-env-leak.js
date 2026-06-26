import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "../src");

// Secret/Server-only environment variables that should NEVER be present in client-side files
const SERVER_ONLY_VARS = [
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "ADMIN_API_KEY",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
  "GEMINI_API_KEY",
  "ADMIN_EMAILS",
  "APP_URL"
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let hasError = false;

console.log("🔍 Scanning client-side source code (src/) for environment variable leaks...");

walkDir(SRC_DIR, (filePath) => {
  // Only scan source files
  if (!/\.(js|ts|jsx|tsx|css)$/.test(filePath)) return;
  // Ignore boilerplateData.ts as it contains raw templates / documentation code strings
  if (filePath.endsWith("boilerplateData.ts")) return;
  // Ignore firebaseAdmin.ts as it is a server-side module
  if (filePath.endsWith("firebaseAdmin.ts")) return;

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Check for process.env usage in client-side code
    if (line.includes("process.env")) {
      console.error(
        `❌ Error: Found usage of 'process.env' in client-side file:\n   File: ${filePath}:${lineNum}\n   Line: "${line.trim()}"\n   Recommendation: Use '(import.meta as any).env' with a 'VITE_' prefix instead.`
      );
      hasError = true;
    }

    // 2. Check for server-only variable names
    SERVER_ONLY_VARS.forEach((secretVar) => {
      // Regex to find occurrences of the secret variable name
      // Avoid matching sub-words or unrelated strings by checking boundaries
      const regex = new RegExp(`\\b${secretVar}\\b`);
      if (regex.test(line) && !line.includes(`VITE_${secretVar}`)) {
        console.error(
          `❌ Error: Found reference to server-only variable '${secretVar}' in client-side file:\n   File: ${filePath}:${lineNum}\n   Line: "${line.trim()}"\n   Recommendation: Keep this secret server-side. Never import or reference it in the frontend.`
        );
        hasError = true;
      }
    });
  });
});

if (hasError) {
  console.error("\n❌ Environment leak check failed! Please fix the errors above before building.");
  process.exit(1);
} else {
  console.log("✅ Client-side code is clean. No environment variable leaks detected!");
  process.exit(0);
}
