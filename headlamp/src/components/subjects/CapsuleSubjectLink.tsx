import { Icon } from '@iconify/react';
import { Activity, Router } from '@kinvolk/headlamp-plugin/lib';
import { Chip, Link as MuiLink } from '@mui/material';
import type { MouseEvent, ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { CapsuleSubjectSummary } from './CapsuleSubjectSummary';
import {
  type CapsuleSubject,
  capsuleSubjectLabel,
  capsuleSubjectRouteIdentity,
  normalizeCapsuleSubject,
} from './subjectReferences';

export interface CapsuleSubjectLinkProps {
  children?: ReactNode;
  display?: 'chip' | 'link';
  kind?: string;
  name?: string;
  namespaces?: string[];
  subject?: CapsuleSubject;
}

function subjectNamespaces(search: URLSearchParams): string[] {
  return [
    ...new Set(
      (search.get('namespace') || '')
        .split(/\s+/)
        .map(namespace => namespace.trim())
        .filter(Boolean)
    ),
  ];
}

export function capsuleSubjectHref(
  subject: CapsuleSubject,
  namespaces: string[] | undefined,
  currentSearch = ''
): { href: string; namespaces: string[] } {
  const pathname = Router.createRouteURL('permits-subject', {
    kind: subject.kind,
    subject: capsuleSubjectRouteIdentity(subject),
  });
  const search = new URLSearchParams(currentSearch);
  if (namespaces) {
    const visibleNamespaces = [
      ...new Set(namespaces.filter(namespace => namespace && namespace !== '*')),
    ];
    if (visibleNamespaces.length > 0) search.set('namespace', visibleNamespaces.join(' '));
  }
  return {
    href: `${pathname}${search.size > 0 ? `?${search.toString()}` : ''}`,
    namespaces: subjectNamespaces(search),
  };
}

export function openCapsuleSubjectActivity(subject: CapsuleSubject, namespaces: string[] = []) {
  const label = capsuleSubjectLabel(subject);
  const scopeKey = [...namespaces].sort((left, right) => left.localeCompare(right)).join(',');
  const cluster =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/c\/([^/]+)/)?.[1]
      : undefined;
  Activity.launch({
    id: `permits-subject ${subject.kind} ${capsuleSubjectRouteIdentity(subject)} ${scopeKey} ${
      cluster || ''
    }`,
    title: `Subject ${label}`,
    hideTitleInHeader: true,
    location: 'split-right',
    temporary: true,
    cluster,
    content: (
      <CapsuleSubjectSummary
        kind={subject.kind}
        name={capsuleSubjectRouteIdentity(subject)}
        namespaces={namespaces}
      />
    ),
    icon: <Icon icon="mdi:account-search-outline" width="100%" height="100%" />,
  });
}

function opensActivity(event: MouseEvent) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

/** Cluster-aware link to the correlated Capsule subject summary. */
export function CapsuleSubjectLink({
  children,
  display = 'link',
  kind,
  name,
  namespaces,
  subject: subjectProp,
}: CapsuleSubjectLinkProps) {
  const location = useLocation();
  const subject = subjectProp || normalizeCapsuleSubject({ kind, name });
  if (!subject) return <>{children || 'Unknown'}</>;

  const target = capsuleSubjectHref(subject, namespaces, location.search);
  const label = children || capsuleSubjectLabel(subject);
  const handleClick = (event: MouseEvent) => {
    if (!opensActivity(event)) return;
    event.preventDefault();
    openCapsuleSubjectActivity(subject, target.namespaces);
  };

  if (display === 'chip') {
    return (
      <MuiLink component={RouterLink} to={target.href} onClick={handleClick} underline="none">
        <Chip clickable size="small" label={label} variant="outlined" />
      </MuiLink>
    );
  }

  return (
    <MuiLink
      component={RouterLink}
      to={target.href}
      onClick={handleClick}
      sx={{ cursor: 'pointer' }}
    >
      {label}
    </MuiLink>
  );
}

export default CapsuleSubjectLink;
