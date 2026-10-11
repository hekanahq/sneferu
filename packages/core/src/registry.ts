import type { HkTag, HkTagInput } from './tags';
import { normalizeFieldLabels, normalizeLabel } from './labels';

export class TagRegistry {
  private readonly tags = new Map<string, HkTag>();
  /** Labels may be written as "Text", { en } or { ar, en }; they are stored as { ar, en }. */
  register(input: HkTag | HkTagInput): this {
    if (this.tags.has(input.name)) throw new Error(`${input.name} is already registered`);
    const label = normalizeLabel(input.editor.label);
    if (!label) throw new Error(`${input.name}: editor label must be a string or { en }`);
    const props = normalizeFieldLabels(input.props);
    if (props.bad.length) throw new Error(`${input.name}: prop label must be a string or { en }: ${props.bad.join(', ')}`);
    const tag: HkTag = { ...input, props: props.schema, editor: { ...input.editor, label } };
    this.tags.set(tag.name, tag);
    return this;
  }
  get(name: string): HkTag | undefined { return this.tags.get(name); }
  has(name: string): boolean { return this.tags.has(name); }
  names(): Set<string> { return new Set(this.tags.keys()); }
}
