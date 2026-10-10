import type { HkTag } from './tags';

export class TagRegistry {
  private readonly tags = new Map<string, HkTag>();
  register(tag: HkTag): this {
    if (this.tags.has(tag.name)) throw new Error(`${tag.name} is already registered`);
    this.tags.set(tag.name, tag);
    return this;
  }
  get(name: string): HkTag | undefined { return this.tags.get(name); }
  has(name: string): boolean { return this.tags.has(name); }
  names(): Set<string> { return new Set(this.tags.keys()); }
}
