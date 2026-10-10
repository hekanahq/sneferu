import { LIMITS } from '@hekana/sneferu-core';
type Limits = { [K in keyof typeof LIMITS]: number };
export class Budget {
  nodes = 0; iters = 0; chars = 0; exceeded?: string;
  constructor(private readonly limits: Limits = LIMITS) {}
  node(): boolean { if (++this.nodes > this.limits.renderNodes) this.exceeded ??= 'render nodes'; return !this.exceeded; }
  iter(): boolean { if (++this.iters > this.limits.loopIterations) this.exceeded ??= 'loop iterations'; return !this.exceeded; }
  out(n: number): boolean { this.chars += n; if (this.chars > this.limits.outputChars) this.exceeded ??= 'output size'; return !this.exceeded; }
  get maxDepth(): number { return this.limits.renderDepth; }
  get maxInclude(): number { return this.limits.includeDepth; }
}
