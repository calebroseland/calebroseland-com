
export function applyStyles (el : HTMLElement, style: CSSStyleDeclaration) {
  for (const [key, value] of Object.entries(style)) {
    (<any>el.style)[key] = value
  }
}