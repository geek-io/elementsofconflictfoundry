// Adapted from fh-fvtt/zweihander's multi-target explosion support.
// Copyright 2022 Saveliy Ivanov and Kevin Dreßler. MIT notice: licenses/zweihander-MIT.txt.
export function registerMultiTargetExplosions(Die) {
  const original = Die.prototype.explode;
  Die.prototype.explode = async function(modifier, options = {}) {
    if (!modifier.includes("&")) return original.call(this, modifier, options);
    const match = /^x(o)?([0-9]+(?:&[0-9]+)+)$/i.exec(modifier);
    if (!match) throw Error("Unsupported multi-target explosion modifier");
    const targets = match[2].split("&").map(Number);
    if (targets.some(n => n < 1 || n > this.faces) || new Set(targets).size >= this.faces) throw Error("Invalid explosion targets");
    const recursive = options.recursive !== false && !match[1];
    const initial = this.results.length;
    for (let checked = 0; checked < this.results.length; checked++) {
      if (checked >= 1000) throw Error("Too many exploding dice results");
      if (!recursive && checked >= initial) break;
      const result = this.results[checked];
      if (result.active && targets.includes(result.result)) { result.exploded = true; await this.roll({ explode: true }); }
    }
  };
}
