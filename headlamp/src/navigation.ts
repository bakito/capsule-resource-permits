import {
  CAPSULE_CRDS,
  capsuleCustomResourceDetailPath,
  capsuleCustomResourceListPath,
} from './resources/capsuleCustomResources';

export const permitResourcePages = [
  {
    kind: 'ResourcePermit',
    crd: CAPSULE_CRDS.ResourcePermit,
    sidebar: 'resource-permits',
    alias: '/permits/resource-permits',
    namespaced: true,
  },
  {
    kind: 'ResourcePermitTemplate',
    crd: CAPSULE_CRDS.ResourcePermitTemplate,
    sidebar: 'resource-permit-templates',
    alias: '/permits/resource-permit-templates',
    namespaced: true,
  },
  {
    kind: 'GlobalResourcePermitTemplate',
    crd: CAPSULE_CRDS.GlobalResourcePermitTemplate,
    sidebar: 'resource-permit-templates',
    alias: '/permits/global-resource-permit-templates',
    namespaced: false,
  },
] as const;

export type PermitResourceKind = (typeof permitResourcePages)[number]['kind'];

export const permitSidebarEntries = [
  {
    parent: '',
    name: 'permits',
    label: 'Permits',
    icon: 'mdi:shield-key-outline',
    url: capsuleCustomResourceListPath(CAPSULE_CRDS.ResourcePermit),
  },
  {
    parent: 'permits',
    name: 'resource-permits',
    label: 'Requests',
    icon: 'mdi:clipboard-text-clock-outline',
    url: capsuleCustomResourceListPath(CAPSULE_CRDS.ResourcePermit),
  },
  {
    parent: 'permits',
    name: 'resource-permit-templates',
    label: 'Templates',
    icon: 'mdi:file-key-outline',
    url: capsuleCustomResourceListPath(CAPSULE_CRDS.ResourcePermitTemplate),
  },
];

export const permitRoutes = permitResourcePages.flatMap(page => [
  {
    kind: page.kind,
    sidebar: page.sidebar,
    detail: false,
    path: capsuleCustomResourceListPath(page.crd),
    name: `permits-${page.kind.toLowerCase()}-list`,
  },
  {
    kind: page.kind,
    sidebar: page.sidebar,
    detail: true,
    path: capsuleCustomResourceDetailPath(page.crd),
    name: `permits-${page.kind.toLowerCase()}-detail`,
  },
  {
    kind: page.kind,
    sidebar: page.sidebar,
    detail: false,
    path: `${page.alias}/`,
    name: `permits-${page.kind.toLowerCase()}-alias-list`,
  },
  {
    kind: page.kind,
    sidebar: page.sidebar,
    detail: true,
    path: `${page.alias}/${page.namespaced ? ':namespace/' : ''}:name`,
    name: `permits-${page.kind.toLowerCase()}-alias-detail`,
  },
  // Preserve existing bookmarks while routing them to the addon API.
  {
    kind: page.kind,
    sidebar: page.sidebar,
    detail: false,
    path: `${page.alias.replace('/permits/', '/capsule/')}/`,
    name: `permits-${page.kind.toLowerCase()}-legacy-list`,
  },
  {
    kind: page.kind,
    sidebar: page.sidebar,
    detail: true,
    path: `${page.alias.replace('/permits/', '/capsule/')}/${
      page.namespaced ? ':namespace/' : ''
    }:name`,
    name: `permits-${page.kind.toLowerCase()}-legacy-detail`,
  },
]);
