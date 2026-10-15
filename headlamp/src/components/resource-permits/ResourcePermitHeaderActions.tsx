import { ActionButton } from '@kinvolk/headlamp-plugin/lib/components/common';
import { resourcePermitIsReviewable } from './resourcePermitHelpers';
import { openResourcePermitReviewActivity } from './ResourcePermitReviewActivity';

function actionResource(props: any) {
  let resource = props.item || props.resource;
  if (resource?.item && !resource.jsonData && !resource.kind) resource = resource.item;
  return resource;
}

export function ResourcePermitReviewAction(props: any) {
  const resource = actionResource(props);
  if (!resourcePermitIsReviewable(resource)) return null;

  return (
    <ActionButton
      buttonStyle={props.buttonStyle}
      color="primary"
      description="Review ResourcePermit"
      longDescription="Inspect resulting changes, adjust approval timing, and submit a verdict"
      icon="mdi:clipboard-check-outline"
      onClick={() => {
        openResourcePermitReviewActivity(resource);
        props.closeMenu?.();
      }}
    />
  );
}

export default ResourcePermitReviewAction;
