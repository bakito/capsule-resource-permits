import {
  registerAppBarAction,
  registerDetailsViewHeaderAction,
  registerDetailsViewSectionsProcessor,
  registerPluginSettings,
  registerResourceTableColumnsProcessor,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import { RESOURCE_DEFINITIONS } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { prewarmCapsuleTableEditAuthorization } from './components/common/CapsuleTableEditAuthorization';
import { PermitsSettings } from './components/common/PermitsSettings';
import { CapsuleEventHub } from './components/event-hub/CapsuleEventHub';
import { PermitResourcePage } from './components/resource-permits/PermitResourcePage';
import { ResourcePermitExpireAction } from './components/resource-permits/ResourcePermitExpireAction';
import { ResourcePermitReviewAction } from './components/resource-permits/ResourcePermitHeaderActions';
import { ResourcePermitRetryAction } from './components/resource-permits/ResourcePermitRetryAction';
import { CapsuleSubjectSummary } from './components/subjects/CapsuleSubjectSummary';
import { processCapsuleTagDetailsSections } from './components/tags/CapsuleTagsDetailsIntegration';
import { addCapsuleTagsTableColumn } from './components/tags/CapsuleTagsTable';
import { CapsuleTagSummary } from './components/tags/CapsuleTagSummary';
import { permitRoutes, permitSidebarEntries } from './navigation';
import {
  GlobalResourcePermitTemplate,
  ResourcePermit,
  ResourcePermitTemplate,
} from './resources/resourcePermits';

permitSidebarEntries.forEach(entry => registerSidebarEntry(entry));
permitRoutes.forEach(route =>
  registerRoute({
    path: route.path,
    name: route.name,
    sidebar: route.sidebar,
    exact: true,
    component: () => <PermitResourcePage kind={route.kind} detail={route.detail} />,
  })
);
registerRoute({
  path: '/permits',
  name: 'permits',
  sidebar: 'resource-permits',
  exact: true,
  component: () => <PermitResourcePage kind="ResourcePermit" detail={false} />,
});
registerRoute({
  path: '/permits/subjects/:kind/:subject',
  name: 'permits-subject',
  sidebar: 'resource-permits',
  exact: true,
  component: () => <CapsuleSubjectSummary />,
});
registerRoute({
  path: '/permits/tags/:tag',
  name: 'permits-tag',
  sidebar: 'resource-permit-templates',
  exact: true,
  component: () => <CapsuleTagSummary />,
});

registerAppBarAction({ id: 'resource-permits-event-hub', action: <CapsuleEventHub /> });
registerDetailsViewHeaderAction(ResourcePermitReviewAction);
registerDetailsViewHeaderAction(ResourcePermitRetryAction);
registerDetailsViewHeaderAction(ResourcePermitExpireAction);
registerResourceTableColumnsProcessor(prewarmCapsuleTableEditAuthorization);
registerResourceTableColumnsProcessor(addCapsuleTagsTableColumn);
registerDetailsViewSectionsProcessor({
  id: 'resource-permits.tags',
  processor: processCapsuleTagDetailsSections,
});
registerPluginSettings('resource-permits', PermitsSettings, true);

Object.assign(RESOURCE_DEFINITIONS, {
  ResourcePermit: { class: ResourcePermit },
  ResourcePermitTemplate: { class: ResourcePermitTemplate },
  GlobalResourcePermitTemplate: { class: GlobalResourcePermitTemplate },
});
