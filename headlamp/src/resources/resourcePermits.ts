import { KubeObject, type KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { PERMITS_API_VERSION } from './permitApi';

export type ResourcePermitPhase =
  | 'Created'
  | 'Requested'
  | 'Pending'
  | 'Denied'
  | 'Approved'
  | 'Active'
  | 'Failed'
  | 'Retrying'
  | 'Expired';

export type ResourcePermitVerdict = 'Pending' | 'Denied' | 'Approved';

export interface ResourcePermitAccessEntity {
  groups?: string[];
  name?: string;
  type?: 'User' | 'Group' | 'System' | 'ServiceAccount' | string;
}

export interface ResourcePermitCondition {
  lastTransitionTime?: string;
  message?: string;
  observedGeneration?: number;
  reason?: string;
  status: string | boolean;
  type: string;
}

export interface ResourcePermitResourcePolicy {
  creation?: 'Owner' | 'Merge' | string;
  deletion?: 'Remove' | 'Orphan' | string;
  force?: boolean;
  protect?: boolean;
}

export interface ResourcePermitRenderedResource {
  policy?: ResourcePermitResourcePolicy;
  targets?: Array<Record<string, any>>;
}

export interface ResourcePermitProcessedItem {
  group?: string;
  kind?: string;
  name?: string;
  namespace?: string;
  origin?: string;
  status?: {
    clusterScoped?: boolean;
    created?: boolean;
    lastApply?: string;
    message?: string;
    status?: string;
    type?: string;
  };
  version?: string;
}

export interface ResourcePermitTemplateReference {
  kind: 'ResourcePermitTemplate' | 'GlobalResourcePermitTemplate' | string;
  name: string;
  resourceVersion?: string;
}

export interface ResourcePermitApprovalSpec {
  approvers?: Array<{
    kind?: 'User' | 'Group' | 'ServiceAccount' | string;
    name?: string;
  }>;
  auto?: boolean;
  conditions?: string[];
}

export interface ResourcePermitTransition {
  actor: {
    name: string;
    type: 'User' | 'Group' | 'System' | 'ServiceAccount' | string;
  };
  eventTime?: string;
  message?: string;
  reason: string;
  timestamp: string;
  type: ResourcePermitPhase;
}

/** Controller-resolved request snapshot presented for review and later application. */
export interface ResourcePermitStatusRequest {
  approvals?: ResourcePermitApprovalSpec;
  duration?: string;
  impersonation?: {
    name?: string;
    namespace?: string;
  };
  keepFor?: string;
  resources?: ResourcePermitRenderedResource[];
  startTime?: string;
  template?: ResourcePermitTemplateReference;
}

export class ResourcePermit extends KubeObject<ResourcePermitObject> {
  static kind = 'ResourcePermit';
  static apiVersion = PERMITS_API_VERSION;
  static apiName = 'resourcepermits';
  static isNamespaced = true;

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status;
  }
}

export interface ResourcePermitObject extends KubeObjectInterface {
  spec?: {
    duration?: string;
    params?: Record<string, any>;
    reason?: string;
    requestor?: ResourcePermitAccessEntity;
    startTime?: string;
    template: ResourcePermitTemplateReference;
  };
  status?: {
    active?: {
      from?: string;
      until?: string;
    };
    conditions?: ResourcePermitCondition[];
    failure?: {
      message?: string;
      reason?: string;
      retryPhase?: 'Requested' | 'Approved' | string;
      stage?: 'Preflight' | 'Activation' | string;
    };
    keepUntil?: string;
    phase?: ResourcePermitPhase;
    processedItems?: ResourcePermitProcessedItem[];
    request?: ResourcePermitStatusRequest;
    review?: {
      message?: string;
      reviewer?: ResourcePermitAccessEntity;
      verdict?: ResourcePermitVerdict;
    };
    size?: number;
    transitions?: ResourcePermitTransition[];
  };
}

export interface ResourcePermitTemplateResource {
  policy?: ResourcePermitResourcePolicy;
  targets?: Array<Record<string, any>>;
  template?: string;
}

/** Compatibility alias retained for consumers using the original global-only type. */
export type GlobalResourcePermitTemplateResource = ResourcePermitTemplateResource;

export interface ResourcePermitTemplateBaseSpec {
  approvals?: ResourcePermitApprovalSpec;
  context?: Record<string, any>;
  defaultDuration?: string;
  keepFor?: string;
  maxDuration?: string;
  paramSchema?: Record<string, any>;
  resources?: ResourcePermitTemplateResource[];
}

export interface ResourcePermitTemplateSpec extends ResourcePermitTemplateBaseSpec {
  impersonation: {
    name: string;
  };
}

export interface GlobalResourcePermitTemplateSpec extends ResourcePermitTemplateBaseSpec {
  impersonation: {
    name: string;
    namespace: string;
  };
  namespaceSelectors?: Array<Record<string, any>>;
}

export class ResourcePermitTemplate extends KubeObject<ResourcePermitTemplateObject> {
  static kind = 'ResourcePermitTemplate';
  static apiVersion = PERMITS_API_VERSION;
  static apiName = 'resourcepermittemplates';
  static isNamespaced = true;

  get spec() {
    return this.jsonData.spec;
  }
}

export interface ResourcePermitTemplateObject extends KubeObjectInterface {
  spec?: ResourcePermitTemplateSpec;
}

export class GlobalResourcePermitTemplate extends KubeObject<GlobalResourcePermitTemplateObject> {
  static kind = 'GlobalResourcePermitTemplate';
  static apiVersion = PERMITS_API_VERSION;
  static apiName = 'globalresourcepermittemplates';
  static isNamespaced = false;

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status;
  }
}

export interface GlobalResourcePermitTemplateObject extends KubeObjectInterface {
  spec?: GlobalResourcePermitTemplateSpec;
  status?: {
    namespaces?: string[];
    observedGeneration?: number;
  };
}
