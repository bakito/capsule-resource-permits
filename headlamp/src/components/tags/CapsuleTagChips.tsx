import { Activity, Router } from '@kinvolk/headlamp-plugin/lib';
import { Chip, Link as MuiLink, Stack, Typography } from '@mui/material';
import type { MouseEvent } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  capsuleResourceMetadata,
  capsuleResourceTags,
  capsuleTagNamespacesFromSearch,
} from './capsuleTags';
import { CapsuleTagSummary } from './CapsuleTagSummary';

export interface CapsuleTagChipsProps {
  emptyLabel?: string;
  namespaces?: string[];
  resource?: any;
  tags?: string[];
}

export function capsuleTagHref(
  tag: string,
  namespaces: string[] | undefined,
  currentSearch = ''
): { href: string; namespaces: string[] } {
  const pathname = Router.createRouteURL('permits-tag', { tag: encodeURIComponent(tag) });
  const search = new URLSearchParams(currentSearch);
  if (namespaces) {
    const visibleNamespaces = [
      ...new Set(namespaces.filter(namespace => namespace && namespace !== '*')),
    ];
    if (visibleNamespaces.length > 0) search.set('namespace', visibleNamespaces.join(' '));
    else search.delete('namespace');
  }

  return {
    href: `${pathname}${search.size > 0 ? `?${search.toString()}` : ''}`,
    namespaces: capsuleTagNamespacesFromSearch(`?${search.toString()}`),
  };
}

export function openCapsuleTagActivity(tag: string, namespaces: string[] = []) {
  const scopeKey = [...namespaces].sort((left, right) => left.localeCompare(right)).join(',');
  const cluster =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/c\/([^/]+)/)?.[1]
      : undefined;
  Activity.launch({
    id: `permits-tag ${tag} ${scopeKey} ${cluster || ''}`,
    title: `Tag ${tag}`,
    hideTitleInHeader: true,
    location: 'split-right',
    temporary: true,
    cluster,
    content: <CapsuleTagSummary tag={tag} namespaces={namespaces} />,
  });
}

function opensActivity(event: MouseEvent) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

/** Clickable tags shared by Capsule list cells and detail metadata. */
export function CapsuleTagChips({
  emptyLabel = '—',
  namespaces,
  resource,
  tags: tagsProp,
}: CapsuleTagChipsProps) {
  const location = useLocation();
  const tags = tagsProp || capsuleResourceTags(resource);
  if (tags.length === 0) {
    return <Typography sx={{ color: 'text.secondary' }}>{emptyLabel}</Typography>;
  }

  const currentNamespaces = capsuleTagNamespacesFromSearch(location.search);
  const resourceNamespace = capsuleResourceMetadata(resource).namespace;
  const requestedNamespaces = namespaces
    ? [...namespaces, ...(resourceNamespace ? [resourceNamespace] : [])]
    : resourceNamespace
    ? [...currentNamespaces, resourceNamespace]
    : undefined;

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {tags.map(tag => {
        const target = capsuleTagHref(tag, requestedNamespaces, location.search);
        return (
          <MuiLink
            key={tag}
            component={RouterLink}
            to={target.href}
            onClick={(event: MouseEvent) => {
              if (!opensActivity(event)) return;
              event.preventDefault();
              openCapsuleTagActivity(tag, target.namespaces);
            }}
            underline="none"
          >
            <Chip clickable color="primary" label={tag} size="small" variant="outlined" />
          </MuiLink>
        );
      })}
    </Stack>
  );
}

export default CapsuleTagChips;
