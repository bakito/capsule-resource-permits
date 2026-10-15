import { useParams } from 'react-router-dom';
import { type PermitResourceKind } from '../../navigation';
import {
  GlobalResourcePermitTemplateDetail,
  ResourcePermitTemplateDetail,
} from './GlobalResourcePermitTemplateDetail';
import { GlobalResourcePermitTemplatesList } from './GlobalResourcePermitTemplateList';
import { ResourcePermitDetail } from './ResourcePermitDetail';
import { ResourcePermitsList } from './ResourcePermitList';
import { ResourcePermitTemplatesList } from './ResourcePermitTemplateList';

export function PermitResourcePage({
  kind,
  detail,
}: {
  kind: PermitResourceKind;
  detail: boolean;
}) {
  const params = useParams<{ crName?: string; name?: string; namespace?: string }>();
  if (!detail) {
    if (kind === 'ResourcePermit') return <ResourcePermitsList />;
    if (kind === 'ResourcePermitTemplate') return <ResourcePermitTemplatesList />;
    return <GlobalResourcePermitTemplatesList />;
  }
  const name = params.crName || params.name;
  const namespace = params.namespace === '-' ? undefined : params.namespace;
  if (kind === 'ResourcePermit') return <ResourcePermitDetail name={name} namespace={namespace} />;
  if (kind === 'ResourcePermitTemplate')
    return <ResourcePermitTemplateDetail name={name} namespace={namespace} />;
  return <GlobalResourcePermitTemplateDetail name={name} />;
}
