/* Shorthand for simple element types, Array<…> once the element is a union, intersection, function,
   or generic. Each line ending in "expect" must be flagged; no other line may be. */

export type Ok = {
  names: string[];
  rows: Row[];
  matrix: number[][];
  frozen: readonly string[];
  pairs: Array<string | number>;
  maps: Array<Map<string, Row>>;
  handlers: Array<() => void>;
  qualified: Ns.Thing[];
  literal: 'a'[];
};

export type Bad = {
  pairs: (string | number)[]; // expect
  both: (A & B)[]; // expect
  handlers: (() => void)[]; // expect
  maps: Map<string, Row>[]; // expect
  names: Array<string>; // expect
  rows: Array<Row>; // expect
  frozen: ReadonlyArray<string>; // expect
  frozenPairs: readonly (string | number)[]; // expect
};

type Row = { id: string };
type A = { a: 1 };
type B = { b: 2 };
declare namespace Ns {
  type Thing = 1;
}
