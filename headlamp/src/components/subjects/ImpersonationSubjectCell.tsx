import { Typography } from '@mui/material';
import { CapsuleSubjectLink } from './CapsuleSubjectLink';
import { capsuleSubjectFromServiceAccountReference } from './subjectReferences';

export interface ImpersonationSubjectCellProps {
  fallbackLabel?: string;
  fallbackNamespace?: string;
  namespaces?: string[];
  reference?: {
    name?: string;
    namespace?: string;
  };
}

/** Linked ServiceAccount identity used by Capsule to reconcile or impersonate a resource. */
export function ImpersonationSubjectCell({
  fallbackLabel = 'Not configured',
  fallbackNamespace,
  namespaces = [],
  reference,
}: ImpersonationSubjectCellProps) {
  const subject = capsuleSubjectFromServiceAccountReference(reference, fallbackNamespace);
  if (!subject) return <Typography color="text.secondary">{fallbackLabel}</Typography>;

  const subjectNamespaces = [subject.namespace, ...namespaces].filter(Boolean) as string[];
  return (
    <CapsuleSubjectLink
      display="chip"
      subject={subject}
      namespaces={[...new Set(subjectNamespaces)]}
    />
  );
}

export default ImpersonationSubjectCell;
