import { getDefaultFormState, type RJSFSchema, type UiSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv2020 from 'ajv/dist/2020';
import {
  CAPSULE_FORM_EXTENSION_KEY,
  KUBERNETES_RESOURCE_WIDGET,
  type ResourcePermitFormExtension,
} from './resourcePermitKubernetesResource';

export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

const SCHEMA_VALUE_KEYS = [
  'items',
  'additionalProperties',
  'not',
  'if',
  'then',
  'else',
  'contains',
  'contentSchema',
  'propertyNames',
  'unevaluatedItems',
  'unevaluatedProperties',
] as const;
const SCHEMA_ARRAY_KEYS = ['prefixItems', 'allOf', 'anyOf', 'oneOf'] as const;
const SCHEMA_MAP_KEYS = [
  'properties',
  '$defs',
  'definitions',
  'dependentSchemas',
  'patternProperties',
] as const;

export interface DiscoveredCapsuleFormExtension {
  extension: ResourcePermitFormExtension;
  schemaPath: Array<string | number>;
}

function isSchemaObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Resolves a JSON Schema local reference without mutating the root schema. */
export function resolveLocalSchemaRef(rootSchema: any, ref: string): any | undefined {
  if (ref === '#') return rootSchema;
  if (!ref.startsWith('#/')) return undefined;

  let current = rootSchema;
  for (const rawSegment of ref.slice(2).split('/')) {
    const segment = decodeJsonPointerSegment(decodeURIComponent(rawSegment));
    if (!isSchemaObject(current) && !Array.isArray(current)) return undefined;
    if (!(segment in current)) return undefined;
    current = (current as any)[segment];
  }
  return current;
}

/**
 * Finds every Capsule form extension across the JSON Schema 2020-12 schema
 * containment keywords. Local references are followed with per-branch loop
 * protection so recursive schemas remain safe.
 */
export function discoverCapsuleFormExtensions(schema: any): DiscoveredCapsuleFormExtension[] {
  const discovered: DiscoveredCapsuleFormExtension[] = [];
  const activeObjects = new Set<object>();

  const visit = (
    current: any,
    schemaPath: Array<string | number>,
    activeRefs: ReadonlySet<string>
  ) => {
    if (!isSchemaObject(current) || activeObjects.has(current)) return;
    activeObjects.add(current);

    const extension = current[CAPSULE_FORM_EXTENSION_KEY];
    if (isSchemaObject(extension)) discovered.push({ extension, schemaPath });

    const ref = typeof current.$ref === 'string' ? current.$ref : '';
    if (ref && !activeRefs.has(ref)) {
      const resolved = resolveLocalSchemaRef(schema, ref);
      if (resolved !== undefined) {
        visit(resolved, [...schemaPath, '$ref'], new Set([...activeRefs, ref]));
      }
    }

    for (const key of SCHEMA_VALUE_KEYS) {
      visit(current[key], [...schemaPath, key], activeRefs);
    }
    for (const key of SCHEMA_ARRAY_KEYS) {
      const children = current[key];
      if (!Array.isArray(children)) continue;
      children.forEach((child, index) => visit(child, [...schemaPath, key, index], activeRefs));
    }
    for (const key of SCHEMA_MAP_KEYS) {
      const children = current[key];
      if (!isSchemaObject(children)) continue;
      Object.entries(children).forEach(([name, child]) =>
        visit(child, [...schemaPath, key, name], activeRefs)
      );
    }

    activeObjects.delete(current);
  };

  visit(schema, [], new Set());
  return discovered;
}

function mergeUiSchema(target: Record<string, any>, source: Record<string, any>) {
  for (const [key, value] of Object.entries(source)) {
    if (isSchemaObject(value) && isSchemaObject(target[key])) mergeUiSchema(target[key], value);
    else target[key] = value;
  }
  return target;
}

function applyCapsuleWidget(
  uiSchema: Record<string, any>,
  extension: ResourcePermitFormExtension,
  multiple: boolean
) {
  uiSchema['ui:widget'] = KUBERNETES_RESOURCE_WIDGET;
  uiSchema['ui:options'] = {
    ...(uiSchema['ui:options'] || {}),
    capsuleForm: extension,
    capsuleMultiple: multiple,
  };
}

function firstCapsuleExtension(
  schema: any,
  rootSchema: any,
  activeRefs = new Set<string>(),
  activeObjects = new Set<object>()
): ResourcePermitFormExtension | undefined {
  if (!isSchemaObject(schema) || activeObjects.has(schema)) return undefined;
  activeObjects.add(schema);
  const direct = schema[CAPSULE_FORM_EXTENSION_KEY];
  if (isSchemaObject(direct)) return direct;

  const ref = typeof schema.$ref === 'string' ? schema.$ref : '';
  if (ref && !activeRefs.has(ref)) {
    const resolved = resolveLocalSchemaRef(rootSchema, ref);
    const extension = firstCapsuleExtension(
      resolved,
      rootSchema,
      new Set([...activeRefs, ref]),
      activeObjects
    );
    if (extension) return extension;
  }
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    for (const child of Array.isArray(schema[key]) ? schema[key] : []) {
      const extension = firstCapsuleExtension(child, rootSchema, activeRefs, activeObjects);
      if (extension) return extension;
    }
  }
  activeObjects.delete(schema);
  return undefined;
}

/**
 * Builds RJSF presentation metadata while preserving the source JSON Schema.
 * An extension on an array's item schema becomes one multi-select widget whose
 * value is the array itself; deeper nested arrays retain their own item UI.
 */
export function buildResourcePermitUiSchema(schema: any): UiSchema {
  const rootSchema = schema;

  const build = (
    current: any,
    activeRefs: ReadonlySet<string> = new Set(),
    activeObjects = new Set<object>()
  ): Record<string, any> => {
    const uiSchema: Record<string, any> = {};
    if (!isSchemaObject(current) || activeObjects.has(current)) return uiSchema;
    activeObjects.add(current);

    const extension = current[CAPSULE_FORM_EXTENSION_KEY];
    if (isSchemaObject(extension)) {
      applyCapsuleWidget(uiSchema, extension, current.type === 'array');
    }

    const ref = typeof current.$ref === 'string' ? current.$ref : '';
    if (ref && !activeRefs.has(ref)) {
      const resolved = resolveLocalSchemaRef(rootSchema, ref);
      mergeUiSchema(
        uiSchema,
        build(resolved, new Set([...activeRefs, ref]), new Set(activeObjects))
      );
    }

    const itemExtension =
      current.type === 'array'
        ? firstCapsuleExtension(current.items, rootSchema, new Set(activeRefs))
        : undefined;
    if (itemExtension) {
      applyCapsuleWidget(uiSchema, itemExtension, true);
    } else if (isSchemaObject(current.items)) {
      uiSchema.items = build(current.items, activeRefs, new Set(activeObjects));
    }

    if (Array.isArray(current.prefixItems)) {
      uiSchema.items = current.prefixItems.map((child: any) =>
        build(child, activeRefs, new Set(activeObjects))
      );
    }

    for (const [name, child] of Object.entries(current.properties || {})) {
      uiSchema[name] = build(child, activeRefs, new Set(activeObjects));
    }
    if (isSchemaObject(current.additionalProperties)) {
      uiSchema.additionalProperties = build(
        current.additionalProperties,
        activeRefs,
        new Set(activeObjects)
      );
    }

    for (const key of [
      'not',
      'if',
      'then',
      'else',
      'contains',
      'contentSchema',
      'propertyNames',
      'unevaluatedItems',
      'unevaluatedProperties',
    ] as const) {
      mergeUiSchema(uiSchema, build(current[key], activeRefs, new Set(activeObjects)));
    }
    for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
      for (const child of Array.isArray(current[key]) ? current[key] : []) {
        mergeUiSchema(uiSchema, build(child, activeRefs, new Set(activeObjects)));
      }
    }
    for (const key of ['dependentSchemas', 'patternProperties'] as const) {
      for (const child of Object.values(current[key] || {})) {
        mergeUiSchema(uiSchema, build(child, activeRefs, new Set(activeObjects)));
      }
    }

    return uiSchema;
  };

  return build(schema) as UiSchema;
}

/** Adds the dialect marker without modifying or flattening the Capsule schema. */
export function resourcePermitParamSchema2020(schema: any): RJSFSchema {
  if (schema === true || schema === undefined || schema === null) {
    return { $schema: JSON_SCHEMA_2020_12 };
  }
  if (schema === false) {
    return { $schema: JSON_SCHEMA_2020_12, not: {} };
  }
  if (!isSchemaObject(schema)) {
    throw new Error('spec.paramSchema must be a JSON Schema object or boolean.');
  }
  return { ...schema, $schema: JSON_SCHEMA_2020_12 };
}

export const resourcePermitSchemaValidator = customizeValidator({
  AjvClass: Ajv2020 as any,
  ajvOptionsOverrides: {
    allErrors: true,
    strict: false,
    validateFormats: true,
  },
});

/** Produces the same schema-defaulted form data RJSF uses for its initial state. */
export function resourcePermitDefaultParamData(schema: any): any {
  const normalizedSchema = resourcePermitParamSchema2020(schema);
  return getDefaultFormState(
    resourcePermitSchemaValidator,
    normalizedSchema,
    undefined,
    normalizedSchema
  );
}

export function validateResourcePermitParamData(schema: any, formData: any) {
  const normalizedSchema = resourcePermitParamSchema2020(schema);
  return resourcePermitSchemaValidator.validateFormData(formData, normalizedSchema);
}
