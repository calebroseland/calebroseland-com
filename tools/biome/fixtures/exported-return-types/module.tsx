/* Exported functions state their return type; components, hooks, query and mutation option factories,
   and local functions infer. A function exported in an `export { … }` list is reported where it is defined. Each line ending in "expect" must be flagged; no other line may be. */

export function declared(a: number): number {
  return a;
}

export function inferred(a: number) { // expect
  return a;
}

export async function loads(): Promise<string> {
  return 'x';
}

export async function loadsInferred() { // expect
  return 'x';
}

export const arrow = (a: number): number => a;

export const withInnerHelpers = (a: number): number => {
  const inner = (b: number) => b;
  function innerDeclared(b: number) {
    return b;
  }
  return inner(innerDeclared(a));
};

export const arrowInferred = (a: number) => a; // expect

export const generic = <T,>(a: T): T => a;

export const genericInferred = <T,>(a: T) => a; // expect

export const asyncGenericInferred = async <T,>(a: T) => a; // expect

export const expression = function (a: number): number {
  return a;
};

export const expressionInferred = function (a: number) { // expect
  return a;
};

export function Component() {
  return <p>component</p>;
}

export const ArrowComponent = () => <p>component</p>;

export const useHook = (): number => 1;

export const useHookInferred = () => 1;

export const entryQuery = (slug: string) => ({ queryKey: [slug] });

export const saveMutation = () => ({ mutationKey: ['save'] });

function local(a: number) {
  return a;
}

const localArrow = (a: number) => a;

export const notAFunction = local(localArrow(1));

export default function defaulted(a: number) { // expect
  return a;
}

const exportedLater = (a: number) => a; // expect

const exportedLaterTyped = (a: number): number => a;

const ExportedLaterComponent = () => <p>component</p>;

export { exportedLater, exportedLaterTyped, ExportedLaterComponent };
