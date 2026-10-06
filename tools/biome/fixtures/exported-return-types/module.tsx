/* Exported functions state their return type; components, hooks, query and mutation option factories,
   and local functions infer. Each line ending in "expect" must be flagged; no other line may be. */

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

export const arrowInferred = (a: number) => a; // expect

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
