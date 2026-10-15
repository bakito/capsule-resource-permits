import Form from '@rjsf/mui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buildResourcePermitUiSchema,
  resourcePermitParamSchema2020,
  resourcePermitSchemaValidator,
} from './resourcePermitJsonSchema';
import { KUBERNETES_RESOURCE_WIDGET } from './resourcePermitKubernetesResource';

const selector = (kind: string, apiVersion = 'v1') => ({
  widget: KUBERNETES_RESOURCE_WIDGET,
  source: { apiVersion, kind },
});

function CapturingResourceWidget(props: any) {
  return (
    <button
      data-testid={props.name}
      onClick={() => props.onChange(props.multiple ? ['view', 'edit'] : 'database')}
      type="button"
    >
      Select {props.name}
    </button>
  );
}

describe('ResourcePermit JSON Schema form integration', () => {
  it('keeps scalar and array-item resource picker values schema-native', () => {
    const schema = resourcePermitParamSchema2020({
      type: 'object',
      $defs: {
        clusterRoles: {
          type: 'array',
          minItems: 1,
          uniqueItems: true,
          items: {
            type: 'string',
            'x-capsule-form': selector('ClusterRole', 'rbac.authorization.k8s.io/v1'),
          },
        },
      },
      properties: {
        secret: {
          type: 'string',
          'x-capsule-form': selector('Secret'),
        },
        clusterRoles: { $ref: '#/$defs/clusterRoles' },
      },
    });
    let formData: any = {};

    render(
      <Form
        formData={formData}
        onChange={change => {
          formData = change.formData;
        }}
        schema={schema}
        uiSchema={buildResourcePermitUiSchema(schema)}
        validator={resourcePermitSchemaValidator}
        widgets={{ [KUBERNETES_RESOURCE_WIDGET]: CapturingResourceWidget }}
      >
        <span />
      </Form>
    );

    fireEvent.click(screen.getByTestId('secret'));
    expect(formData.secret).toBe('database');

    fireEvent.click(screen.getByTestId('clusterRoles'));
    expect(formData.clusterRoles).toEqual(['view', 'edit']);
    expect(resourcePermitSchemaValidator.validateFormData(formData, schema).errors).toEqual([]);
  });
});
