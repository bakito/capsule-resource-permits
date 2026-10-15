import { test, expect } from '@playwright/test';

test('documentation links and API schemas work below a URL prefix', async ({ page, baseURL }) => {
  await page.goto(baseURL);
  await page.getByRole('link', { name: 'Explore the API', exact: true }).click();
  await expect(page).toHaveURL(new URL('docs/reference/api/', baseURL).href);
  for (const name of ['ResourcePermit', 'ResourcePermitTemplate', 'GlobalResourcePermitTemplate']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('img', { name: 'Cloud Native Computing Foundation' })).toBeVisible();
  for (const [title, slug, template] of [
    ['Temporary configuration', 'temporary-config', 'ResourcePermitTemplate'],
    ['Managed Grafana', 'managed-grafana', 'GlobalResourcePermitTemplate'],
    ['Gateway API access', 'gateway-api-access', 'GlobalResourcePermitTemplate'],
  ]) {
    await page.goto(new URL('docs/examples/', baseURL).href);
    await page.locator('.card-list').getByRole('link', { name: new RegExp(title, 'i') }).click();
    await expect(page).toHaveURL(new URL(`docs/examples/${slug}/`, baseURL).href);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const yaml = page.locator('main pre code[data-lang="yaml"]');
    await expect(yaml.filter({ hasText: `kind: ${template}` }).first()).toBeVisible();
    const request = page.getByRole('link', { name: `Download user/solar/resourcepermits/${slug}.yaml`, exact: true });
    const response = await page.request.get(await request.getAttribute('href'));
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    expect(source).toContain('kind: ResourcePermit\n');
    // Readers can inspect the same complete permit on the page that they download.
    await expect(yaml.last()).toHaveText(source);
  }
});

test('permit guides connect templates, parameters, and request operations', async ({ page, baseURL }) => {
  const failures = [];
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto(new URL('docs/concepts/overview/', baseURL).href);
  await expect(page.locator('.mermaid svg')).toHaveCount(1);
  await page.getByRole('link', { name: 'Templates', exact: true }).click();
  await expect(page).toHaveURL(new URL('docs/concepts/templates/', baseURL).href);
  await expect(page.locator('main')).toContainText('apiVersion: addons.projectcapsule.dev/v1beta2');
  await page.getByRole('link', { name: 'Parameter Schemas and Dynamic Forms', exact: true }).first().click();
  await expect(page).toHaveURL(new URL('docs/concepts/parameter-schema/', baseURL).href);
  await page.goto(new URL('docs/concepts/requests/', baseURL).href);
  await expect(page.locator('.mermaid svg')).toHaveCount(3);
  await expect(page.locator('main')).toContainText('kubectl resource-permits review');
  await expect(page.locator('main')).toContainText('resource_permits_resourcepermit_phase');
  await page.reload();
  await expect(page.locator('.mermaid svg')).toHaveCount(3);
  expect(failures).toEqual([]);
});

test('permit documentation stays local and shared concepts link to Capsule', async ({ page, baseURL }) => {
  await page.goto(new URL('docs/concepts/templates/', baseURL).href);
  await page.locator('main').getByRole('link', { name: 'Managed permit resources', exact: true }).first().click();
  await expect(page).toHaveURL(new URL('docs/concepts/managed-resources/', baseURL).href);
  await expect(page.getByRole('heading', { name: 'Managed permit resources', exact: true })).toBeVisible();
  for (const name of ['Resource policy', 'Apply conditions', 'Scope, tracking, and cleanup', 'Status and failures']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('main')).toContainText('Reviewers approve that snapshot.');
  await expect(page.locator('main').getByRole('link', { name: 'server-side apply and object management', exact: true }))
    .toHaveAttribute('href', 'https://projectcapsule.dev/docs/replications/global/#object-management');
  await expect(page.locator('main').getByRole('link', { name: 'field ownership conflicts', exact: true }))
    .toHaveAttribute('href', 'https://projectcapsule.dev/docs/replications/global/#force');
  await page.locator('main').getByRole('link', { name: 'permit lifecycle', exact: true }).click();
  await expect(page).toHaveURL(new URL('docs/concepts/requests/#lifecycle', baseURL).href);
  await expect(page.locator('main')).toContainText('kubectl resource-permits review');
});

test('Concepts combines permit guides and precedes Examples in navigation', async ({ page, isMobile, baseURL }) => {
  await page.goto(baseURL);
  const main = page.locator('#offcanvasNavMain');
  if (isMobile) await page.getByRole('button', { name: 'Open main navigation menu', exact: true }).tap();
  await main.getByRole('link', { name: 'Examples', exact: true }).click();
  await expect(page).toHaveURL(new URL('docs/examples/', baseURL).href);
  await page.locator('.card-list').getByRole('link', { name: /Temporary configuration/i }).click();
  await expect(page).toHaveURL(new URL('docs/examples/temporary-config/', baseURL).href);
  await expect(page.locator('main nav[aria-label="breadcrumb"]')).toContainText('Examples');

  const section = isMobile ? page.locator('#offcanvasNavSection') : page.locator('.docs-sidebar');
  if (isMobile) await page.getByRole('button', { name: 'Open section navigation menu', exact: true }).tap();
  await expect(section.locator('nav > ul > li > details > summary'))
    .toHaveText(['Getting started', 'Concepts', 'Examples', 'Reference', 'Development']);
  const concepts = section.locator('details:has(> summary:text-is("Concepts"))');
  await expect(concepts.getByRole('link')).toHaveText([
    'Permit workflow', 'Resource Permit Templates', 'Parameter Schemas and Dynamic Forms',
    'Resource Permits', 'Managed permit resources',
  ]);
  await section.getByRole('link', { name: 'Resource Permit Templates', exact: true }).click();
  await expect(page).toHaveURL(new URL('docs/concepts/templates/', baseURL).href);
});

test('previous documentation addresses redirect to the restored sections', async ({ page, baseURL }) => {
  for (const [previous, current] of [
    ['guides/', 'getting-started/overview/'],
    ['permits/', 'concepts/overview/'],
    ['permits/templates/', 'concepts/templates/'],
    ['permits/requests/', 'concepts/requests/'],
    ['guides/permits/', 'concepts/overview/'],
    ['guides/permits/templates/', 'concepts/templates/'],
    ['guides/concepts/parameter-schema/', 'concepts/parameter-schema/'],
    ['guides/concepts/managed-resources/', 'concepts/managed-resources/'],
    ['guides/examples/', 'examples/'],
    ['guides/examples/temporary-config/', 'examples/temporary-config/'],
    ['resource-permits/templates/', 'concepts/templates/'],
    ['resource-permits/server-side-apply/', 'concepts/managed-resources/'],
  ]) {
    await page.goto(new URL(`docs/${previous}`, baseURL).href);
    await expect(page).toHaveURL(new URL(`docs/${current}`, baseURL).href);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  }
});
