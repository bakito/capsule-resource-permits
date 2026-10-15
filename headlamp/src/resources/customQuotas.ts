import { KubeObject, type KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export class CustomQuota extends KubeObject<CustomQuotaObject> {
  static kind: string = 'CustomQuota';
  static apiVersion: string = 'capsule.clastix.io/v1beta2';
  static apiName: string = 'customquotas';

  static isNamespaced: boolean = true;

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status;
  }
}

export class GlobalCustomQuota extends KubeObject<GlobalCustomQuotaObject> {
  static kind: string = 'GlobalCustomQuota';
  static apiVersion: string = 'capsule.clastix.io/v1beta2';
  static apiName: string = 'globalcustomquotas';

  static isNamespaced: boolean = false;

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status;
  }
}

export interface CustomQuotaObject extends KubeObjectInterface {
  spec?: {
    limit: string;
    sources?: Array<{
      apiVersion?: string;
      group?: string;
      kind: string;
      version?: string;
      op: 'add' | 'sub' | 'count';
      path?: string;
      selectors?: Array<{
        matchLabels?: Record<string, string>;
        matchExpressions?: Array<{
          key: string;
          operator: string;
          values?: string[];
        }>;
        fieldSelectors?: string[];
      }>;
    }>;
    scopeSelectors?: Array<{
      matchLabels?: Record<string, string>;
      matchExpressions?: Array<{
        key: string;
        operator: string;
        values?: string[];
      }>;
    }>;
    options?: {
      emitMetricPerClaimUsage?: boolean;
    };
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
      reason: string;
      message: string;
    }>;
    usage?: {
      used?: string;
      available?: string;
      limit?: string;
    };
    claims?: Array<{
      group?: string;
      kind: string;
      name: string;
      namespace?: string;
      uid?: string;
      usage?: string;
      version?: string;
    }>;
    targets?: Array<any>;
  };
}

export interface GlobalCustomQuotaObject extends KubeObjectInterface {
  spec?: {
    limit: string;
    namespaceSelectors?: Array<{
      matchLabels?: Record<string, string>;
      matchExpressions?: Array<{
        key: string;
        operator: string;
        values?: string[];
      }>;
    }>;
    scopeSelectors?: Array<{
      matchLabels?: Record<string, string>;
      matchExpressions?: Array<{
        key: string;
        operator: string;
        values?: string[];
      }>;
    }>;
    sources?: Array<{
      apiVersion?: string;
      group?: string;
      kind: string;
      version?: string;
      op: 'add' | 'sub' | 'count';
      path?: string;
      selectors?: Array<{
        matchLabels?: Record<string, string>;
        matchExpressions?: Array<{
          key: string;
          operator: string;
          values?: string[];
        }>;
        fieldSelectors?: string[];
      }>;
    }>;
    options?: {
      emitMetricPerClaimUsage?: boolean;
    };
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
      reason: string;
      message: string;
    }>;
    usage?: {
      used?: string;
      available?: string;
      limit?: string;
    };
    claims?: Array<{
      group?: string;
      kind: string;
      name: string;
      namespace?: string;
      uid?: string;
      usage?: string;
      version?: string;
    }>;
    namespaces?: string[];
    targets?: Array<any>;
  };
}
