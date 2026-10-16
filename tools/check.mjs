import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import Handlebars from "handlebars";
import { ITEM_TYPES, ITEM_ICONS } from "../scripts/config.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "system.json"), "utf8"));
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (manifest.packs.some(pack => !pack.name.startsWith("eoc-"))) throw Error("Only EoC compendiums belong in this system");
const packNames = manifest.packs.map(pack => pack.name).sort();
if (JSON.stringify((await readdir(resolve(root, "packs"))).sort()) !== JSON.stringify(packNames)) throw Error("Packs folder must contain exactly the declared EoC compendiums");
if (manifest.id !== pkg.name || manifest.version !== pkg.version) throw Error("Package identity/version mismatch");
// Compare generation/build components, rather than decimal numbers.
const compareVersion = (left, right) => {
  const a = String(left).split(".").map(Number);
  const b = String(right).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
};
const target = "14.367";
if (!manifest.compatibility.verified) throw Error("Missing compatibility.verified makes Foundry package availability Unknown");
if (compareVersion(target, manifest.compatibility.minimum) < 0 ||
    (manifest.compatibility.maximum && compareVersion(target, manifest.compatibility.maximum) > 0)) {
  throw Error(`Compatibility range excludes target Foundry ${target}`);
}
async function exactPath(path) {
  if (path.includes("\\") || path.startsWith("/") || path.split("/").includes("..")) throw Error(`Nonportable path: ${path}`);
  let current = root;
  for (const part of path.split("/")) {
    if (!(await readdir(current)).includes(part)) throw Error(`Missing or wrong-case path: ${path}`);
    current = resolve(current, part);
  }
}
for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path), ...manifest.packs.map(p => p.path), "templates/actor.hbs", "templates/item.hbs", "templates/library.hbs"]) await exactPath(path);
for(const type of ITEM_TYPES) {
  if(!manifest.documentTypes.Item[type])throw Error(`Unregistered Item type: ${type}`);
  await exactPath(ITEM_ICONS[type].replace(`systems/${manifest.id}/`,""));
}
for(const path of ["ICON-CREDITS.md","licenses/RPG-Awesome-BSD-2-Clause.txt","licenses/RPG-Awesome-OFL-1.1.txt","licenses/RPG-Awesome-MIT.txt","licenses/Game-icons-CC-BY-3.0.txt","assets/rpg-awesome/fonts/rpgawesome-webfont.woff",...['bukijutsu','genjutsu','ninjutsu','taijutsu','fuinjutsu'].map(type=>`icons/${type}.svg`)])await exactPath(path);
const credits=JSON.parse(await readFile(resolve(root,"data/icon-attribution.json"),"utf8"));
for(const credit of credits){await exactPath(credit.file);if(credit.license!=="CC-BY-3.0" || !credit.author || !credit.url.startsWith("https://game-icons.net/"))throw Error(`Missing icon attribution: ${credit.file}`);}
for(const directory of ['scripts','templates','styles'])for(const file of await readdir(resolve(root,directory)))if(/\.(mjs|hbs|css)$/.test(file))new TextDecoder('utf-8',{fatal:true}).decode(await readFile(resolve(root,directory,file)));
for (const file of await readdir(resolve(root, "scripts"))) if (file.endsWith(".mjs")) execFileSync(process.execPath, ["--check", resolve(root, "scripts", file)]);
for (const language of manifest.languages) JSON.parse(await readFile(resolve(root, language.path), "utf8"));
for (const file of await readdir(resolve(root, "templates"))) if (file.endsWith(".hbs")) Handlebars.precompile(await readFile(resolve(root, "templates", file), "utf8"));
console.log("Manifest, versions, JSON, runtime syntax, Handlebars templates, and case-sensitive asset paths passed. Live Foundry verification pending.");
