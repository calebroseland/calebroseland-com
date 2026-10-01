import { parse } from "yaml";
import type { z } from "zod";

/** Parses YAML text and validates it. Throws a ZodError whose message names the path that failed. */
export function parseYaml<T extends z.ZodType>(schema: T, text: string): z.output<T> {
  const data: unknown = parse(text);
  return schema.parse(data);
}
