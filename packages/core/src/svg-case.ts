/**
 * SVG names that are case-sensitive. The parser and every allow-list check work
 * on lower-case names; only the emitted markup is mapped back through this table.
 */
export const SVG_CASE: Record<string, string> = {
  viewbox: 'viewBox', lineargradient: 'linearGradient', radialgradient: 'radialGradient', clippath: 'clipPath',
  gradientunits: 'gradientUnits', gradienttransform: 'gradientTransform', patternunits: 'patternUnits',
  preserveaspectratio: 'preserveAspectRatio', stddeviation: 'stdDeviation', clippathunits: 'clipPathUnits',
  maskunits: 'maskUnits', textlength: 'textLength', spreadmethod: 'spreadMethod',
  markerwidth: 'markerWidth', markerheight: 'markerHeight', refx: 'refX', refy: 'refY',
};
export const svgCase = (name: string): string => Object.prototype.hasOwnProperty.call(SVG_CASE, name) ? SVG_CASE[name]! : name;
