// convertSchemaToTypeScript.ts

import type { JSONSchema7 } from "json-schema";
import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

export interface ConvertSchemaOptions {
  /**
   * If true, do NOT throw an error when a $ref cannot be resolved.
   * Instead, fall back to `unknown` for that reference.
   */
  ignoreUnresolvableRefs?: boolean;
  exportRootType?: boolean;
  excludeTypes?: string[];
  comments?: boolean;
}

interface TypeContext {
  /** Map from a schema object (by reference) to a generated type name. */
  schemaToName: Map<JSONSchema7, string>;
  /** A list of generated (name, definition) pairs for final output. */
  namedTypes: Array<{
    name: string;
    definition: string;
    description: string | undefined;
  }>;
  /** A counter for auto-generating type names when needed. */
  anonymousTypeCount: number;
  /** The user options. */
  options: Required<ConvertSchemaOptions>;
  /** The root schema (used for $ref lookups). */
  rootSchema: JSONSchema7;
  /** A set to detect circular processing in the recursion stack. */
  processingSet: Set<any>;
}

/**
 * Converts a JSON Schema to TypeScript declarations.
 */
export function convertSchemaToTypeScript(
  schema: JSONSchema7,
  options?: ConvertSchemaOptions
): { type: string; definitions: string } {
  // Merge options with defaults
  const mergedOptions: Required<ConvertSchemaOptions> = {
    ignoreUnresolvableRefs: options?.ignoreUnresolvableRefs ?? false,
    exportRootType: options?.exportRootType ?? false,
    excludeTypes: options?.excludeTypes ?? [],
    comments: options?.comments ?? false,
  };

  const context: TypeContext = {
    schemaToName: new Map(),
    namedTypes: [],
    anonymousTypeCount: 1,
    options: mergedOptions,
    rootSchema: schema,
    processingSet: new Set(),
  };

  const rootTypeName =
    schema.title ?? (mergedOptions.exportRootType ? "Root" : undefined);
  const type = rootTypeName
    ? getOrCreateTypeNameForSchema(schema, rootTypeName, context)
    : schemaToType(schema, context, 0);
  const definitions = context.namedTypes
    .filter((item) => !mergedOptions.excludeTypes.includes(item.name))
    .map((item) => {
      const shouldExport =
        item.name === rootTypeName && context.options.exportRootType;
      const exportStr = shouldExport ? "export " : "";
      return [
        !!item.description && context.options.comments
          ? `/** ${item.description} */`
          : "",
        `${exportStr}type ${item.name} = ${item.definition};`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  return { type, definitions };
}

function isBarePrimitive(schema: JSONSchema7): boolean {
  const primitives = ["string", "number", "integer", "boolean", "null"];

  // exactly one primitive type …
  const isSinglePrimitive =
    typeof schema.type === "string" && primitives.includes(schema.type);

  // …and no other keywords that would make it a “real” type
  return (
    isSinglePrimitive &&
    !schema.enum &&
    !schema.anyOf &&
    !schema.oneOf &&
    !schema.allOf &&
    !schema.properties && // not an object
    !schema.items && // not an array
    !schema.$ref // not a reference
  );
}

/**
 * Always produce a named type for the given schema (unless already done).
 * This ensures references/definitions appear as top-level types.
 * Returns the name used.
 */
function getOrCreateTypeNameForSchema(
  schema: JSONSchema7,
  suggestedName: string,
  context: TypeContext
): string {
  // If already named, return
  if (context.schemaToName.has(schema)) {
    return context.schemaToName.get(schema)!;
  }

  let typeName: string = upperFirst(camelCase(schema.title ?? suggestedName));
  // ensure uniqueness
  const allUsedNames = new Set(context.schemaToName.values());
  if (allUsedNames.has(typeName)) {
    typeName = `${typeName}_${context.anonymousTypeCount++}`;
  }

  context.schemaToName.set(schema, typeName);

  // We'll now generate a top-level definition for this schema.
  // We'll store a placeholder for now, to avoid infinite recursion.
  const definition = schemaToType(schema, context, 0);
  context.namedTypes.push({
    name: typeName,
    definition,
    description: schema.description,
  });

  return typeName;
}

function indentStr(level: number): string {
  return " ".repeat(level);
}

/**
 * Decides how to wrap array type.
 */
function wrapArrayType(inner: string): string {
  // If there's a pipe, brace, or space, we prefer Array<T>
  if (inner.includes("|") || inner.includes("{") || inner.includes(" ")) {
    return `Array<${inner}>`;
  }
  // else T[]
  return `${inner}[]`;
}

function basicTypeToTs(t: string): string {
  switch (t) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    // fallback:
    default:
      return "unknown";
  }
}

function schemaToType(
  schema: JSONSchema7,
  context: TypeContext,
  indent: number
): string {
  // detect circular
  if (context.processingSet.has(schema)) {
    // If we have a name for it, return that.
    if (context.schemaToName.has(schema)) {
      return context.schemaToName.get(schema)!;
    }
    return "unknown";
  }
  context.processingSet.add(schema);

  // $ref
  if (schema.$ref && typeof schema.$ref === "string") {
    const refType = handleRef(schema.$ref, context);
    context.processingSet.delete(schema);
    return refType;
  }

  // if enum
  if (Array.isArray(schema.enum)) {
    const union = schema.enum.map((val) => JSON.stringify(val)).join(" | ");
    context.processingSet.delete(schema);
    return union.length > 0 ? union : "unknown";
  }

  // anyOf / oneOf
  if (schema.anyOf) {
    const anyOfTypes = schema.anyOf.map((sub) =>
      schemaToType(sub as JSONSchema7, context, indent)
    );
    context.processingSet.delete(schema);
    return anyOfTypes.join(" | ");
  }
  if (schema.oneOf) {
    const oneOfTypes = schema.oneOf.map((sub) =>
      schemaToType(sub as JSONSchema7, context, indent)
    );
    context.processingSet.delete(schema);
    return oneOfTypes.join(" | ");
  }

  // no type => unknown
  const typeVal = schema.type;
  if (!typeVal) {
    context.processingSet.delete(schema);
    return "unknown";
  }

  if (Array.isArray(typeVal)) {
    context.processingSet.delete(schema);
    return typeVal.map(basicTypeToTs).join(" | ");
  }

  switch (typeVal) {
    case "string":
      context.processingSet.delete(schema);
      return "string";
    case "number":
    case "integer":
      context.processingSet.delete(schema);
      return "number";
    case "boolean":
      context.processingSet.delete(schema);
      return "boolean";
    case "null":
      context.processingSet.delete(schema);
      return "null";

    case "array": {
      if (schema.items) {
        const itemsType = schemaToType(
          schema.items as JSONSchema7,
          context,
          indent
        );
        const result = wrapArrayType(itemsType);
        context.processingSet.delete(schema);
        return result;
      } else {
        context.processingSet.delete(schema);
        return "unknown[]";
      }
    }

    case "object": {
      // if object has a title but we haven't done so, it might have a name. But we already do that in getOrCreate.
      const properties = schema.properties || {};
      const requiredProps = Array.isArray(schema.required)
        ? new Set(schema.required)
        : new Set<string>();

      const nextIndent = indent + 2;
      const propEntries = Object.entries(properties).map(
        ([propName, _propSchema]) => {
          const propSchema = _propSchema as JSONSchema7;
          const tsType = (() => {
            if (propSchema.title && !isBarePrimitive(propSchema)) {
              if (!context.schemaToName.has(propSchema)) {
                getOrCreateTypeNameForSchema(
                  propSchema,
                  propSchema.title,
                  context
                );
              }
              return context.schemaToName.get(propSchema)!;
            }

            return schemaToType(propSchema, context, nextIndent);
          })();

          // wrap propName in quotes if it's not a valid TS identifier
          const isIdentifier = /^[a-zA-Z_$0-9]*$/.test(propName);
          const escapedPropName = isIdentifier ? propName : `"${propName}"`;

          const description = propSchema.description;
          const isRequired = requiredProps.has(propName);
          const indent = indentStr(nextIndent);
          return [
            !!description && context.options.comments
              ? `${indent}/** ${description} */`
              : "",
            `${indent}${escapedPropName}${isRequired ? "" : "?"}: ${tsType};`,
          ]
            .filter(Boolean)
            .join("\n");
        }
      );

      let additionalPropsLine = "";
      if (schema.additionalProperties) {
        if (schema.additionalProperties === true) {
          additionalPropsLine = `${indentStr(
            nextIndent
          )}[key: string]: unknown;`;
        } else {
          const apType = schemaToType(
            schema.additionalProperties as JSONSchema7,
            context,
            nextIndent
          );
          additionalPropsLine = `${indentStr(
            nextIndent
          )}[key: string]: ${apType};`;
        }
      }

      const lines = [...propEntries, additionalPropsLine].filter(Boolean);
      const inner = lines.length
        ? `\n${lines.join("\n")}\n${indentStr(indent)}`
        : "";

      context.processingSet.delete(schema);
      return `{${inner}}`;
    }

    default:
      context.processingSet.delete(schema);
      return "unknown";
  }
}

function handleRef(ref: string, context: TypeContext): string {
  const subSchema = resolveRef(ref, context.rootSchema);
  if (!subSchema) {
    if (context.options.ignoreUnresolvableRefs) {
      return "unknown";
    }
    throw new Error(`Could not resolve $ref: ${ref}`);
  }

  if (context.schemaToName.has(subSchema)) {
    return context.schemaToName.get(subSchema)!;
  }

  const guessName = ref.split("/").filter(Boolean).slice(-1)[0] ?? "Anonymous";
  const typeName = getOrCreateTypeNameForSchema(subSchema, guessName, context);
  return typeName;
}

function resolveRef(ref: string, rootSchema: JSONSchema7): JSONSchema7 | null {
  if (!ref.startsWith("#")) {
    return null;
  }

  const pathParts = ref.slice(1).split("/");
  let current: any = rootSchema;
  for (const part of pathParts) {
    if (part === "") continue;
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return null;
    }
    current = current[part];
    if (!current) {
      return null;
    }
  }
  return current as JSONSchema7;
}
