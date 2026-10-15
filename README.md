# resource-permits
Resource-Permits framework for approval flows native to kubernetes

The standalone [Headlamp plugin](headlamp/README.md) provides a top-level
**Permits** menu for requests, templates, review, and lifecycle management.

## Development

Use the pinned Devbox environment and Task targets:

```sh
devbox run -- task check
devbox run -- task playground
devbox run -- task docs:serve
```

See the [documentation](docs/content/docs/), [development guide](DEVELOPMENT.md), [contributing](CONTRIBUTING.md),
[Helm installation](charts/resource-permits/README.md), and the
[playground manifests](playground/manifests/).
