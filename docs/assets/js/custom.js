document.querySelectorAll('[data-permit-example]').forEach(example => {
  const blocks = [...example.querySelectorAll('[data-permit-part]')];
  const panels = [...example.querySelectorAll('[data-permit-help]')];
  const select = key => {
    blocks.forEach(block => {
      if (block.dataset.permitPart === key) block.setAttribute('aria-current', 'true');
      else block.removeAttribute('aria-current');
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.permitHelp !== key; });
  };
  blocks.forEach(block => block.addEventListener('click', event => {
    // Preserve native new-tab behavior and selecting/copying text from the YAML.
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    // In the stacked mobile layout, follow the guide instead of updating a panel
    // below the YAML. Keep this breakpoint aligned with _custom.scss.
    if (window.matchMedia('(max-width: 767.98px)').matches) return;
    event.preventDefault();
    select(block.dataset.permitPart);
  }));
  if (blocks.length) select(blocks[0].dataset.permitPart);

  const copy = example.querySelector('[data-permit-copy]');
  const status = example.querySelector('[data-permit-copy-status]');
  if (navigator.clipboard?.writeText) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(example.querySelector('[data-permit-source]').textContent);
        status.textContent = 'Complete YAML copied.';
      } catch {
        status.textContent = 'Copy is unavailable. Use Download YAML to save the example.';
      }
    });
  }
});
