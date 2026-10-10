import { LIMITS } from '@hekana/sneferu-core';
export type Limits = { [K in keyof typeof LIMITS]: number };
export class Budget {
  nodes = 0; iters = 0; chars = 0; exceeded?: string;
  /** Shared with child budgets so SN4001 is reported once per page. */
  constructor(private readonly limits: Limits = LIMITS, private readonly shared: { reported: boolean } = { reported: false }) {}
  get reported(): boolean { return this.shared.reported; }
  set reported(v: boolean) { this.shared.reported = v; }
  node(): boolean { if (++this.nodes > this.limits.renderNodes) this.exceeded ??= 'render nodes'; return !this.exceeded; }
  iter(): boolean { if (++this.iters > this.limits.loopIterations) this.exceeded ??= 'loop iterations'; return !this.exceeded; }
  out(n: number): boolean { this.chars += n; if (this.chars > this.limits.outputChars) this.exceeded ??= 'output size'; return !this.exceeded; }
  /** Closing tags keep the output balanced, so they are counted but never refused. */
  force(n: number): void { this.chars += n; }
  get maxDepth(): number { return this.limits.renderDepth; }
  get maxInclude(): number { return this.limits.includeDepth; }
  /** A budget holding what is left of this one, for rendering one section in isolation. */
  child(): Budget {
    return new Budget({ ...this.limits, renderNodes: this.limits.renderNodes - this.nodes, loopIterations: this.limits.loopIterations - this.iters, outputChars: this.limits.outputChars - this.chars }, this.shared);
  }
  /** Charge a failed child's CPU counters (capped at what it was given); its output is discarded. */
  absorbFailed(c: Budget): void {
    this.nodes += Math.min(c.nodes, Math.max(0, this.limits.renderNodes - this.nodes));
    this.iters += Math.min(c.iters, Math.max(0, this.limits.loopIterations - this.iters));
  }
  /** Charge a finished child's work (output only when it was kept). */
  absorb(c: Budget, keptChars: number): void {
    this.nodes += c.nodes; this.iters += c.iters; this.chars += keptChars;
    if (this.nodes > this.limits.renderNodes) this.exceeded ??= 'render nodes';
    if (this.iters > this.limits.loopIterations) this.exceeded ??= 'loop iterations';
    if (this.chars > this.limits.outputChars) this.exceeded ??= 'output size';
  }
}
