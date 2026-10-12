GO ?= go
CONTROLLER_GEN ?= controller-gen
GINKGO ?= ginkgo
KO ?= ko
E2E_FILTER ?= resource-permit

.PHONY: build kubectl-resource_permits generate manifests test bench lint e2e
build:
	$(GO) build -o bin/manager ./cmd/controller
kubectl-resource_permits:
	$(GO) build -o bin/kubectl-resource_permits ./cmd/cli
generate:
	$(CONTROLLER_GEN) object:headerFile=hack/boilerplate.go.txt paths=./api/... paths=./pkg/...
manifests: generate
	$(CONTROLLER_GEN) crd paths=./api/... output:crd:artifacts:config=charts/resource-permits/crds
test:
	$(GO) test ./api/... ./pkg/... ./internal/... ./cmd/...
bench:
	$(GO) test ./internal/controllers/resourcepermit ./internal/webhook/generic -run '^$$' -bench . -benchmem
lint:
	golangci-lint run
# The existing cluster must run both changed controllers. Configuration scenarios
# remain serial, while other selected addon scenarios may execute concurrently.
e2e:
	@parallel_status=0; config_status=0; \
	$(GINKGO) -p --fail-on-empty --label-filter='($(E2E_FILTER)) && !config' ./e2e || parallel_status=$$?; \
	$(GINKGO) --fail-on-empty --label-filter='($(E2E_FILTER)) && config' ./e2e || config_status=$$?; \
	test $$parallel_status -eq 0 && test $$config_status -eq 0
