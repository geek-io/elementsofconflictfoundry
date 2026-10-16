import { cp, mkdir, readFile, lstat, mkdtemp, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(process.execPath, [resolve(root, "tools/check.mjs")], { stdio: "inherit" });
const output = resolve(root, "dist/elementsofconflictfoundry");
await mkdir(resolve(root,"dist"), {recursive:true});
const stage=await mkdtemp(resolve(root,"dist/.package-"));
for (const path of ["system.json", "scripts", "styles", "templates", "lang", "README.md", "ICON-CREDITS.md", "LICENSE", "licenses", "docs", "packs", "assets", "icons"]) await cp(resolve(root, path), resolve(stage, path), { recursive: true });
let previous;
try{previous=await lstat(output);}catch(error){if(error.code!=="ENOENT")throw error;}
if(previous){
  if(previous.isSymbolicLink()||!previous.isDirectory())throw Error("Staging output must be a normal directory.");
  await mkdir(resolve(root,"tmp"),{recursive:true});
  const backup=await mkdtemp(resolve(root,"tmp/package-backup-"));
  if(dirname(output)!==resolve(root,"dist")||dirname(backup)!==resolve(root,"tmp"))throw Error("Invalid package paths.");
  await rename(output,resolve(backup,"elementsofconflictfoundry"));
}
await rename(stage,output);
console.log(`Staged system: ${output}`);
