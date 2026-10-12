#!/usr/bin/env bash
set -euo pipefail
# This harness uses the Capsule revision declared by the addon, never an older
# deployed image. Core e2e remains in Capsule's own workflow.
CAPSULE_SOURCE=$(go list -m -f '{{.Dir}}' github.com/projectcapsule/capsule)
ARTIFACTS=${E2E_ARTIFACTS:-$(mktemp -d)}
mkdir -p "$ARTIFACTS"
KIND_NAME="resource-permits-e2e"
export KUBECONFIG="$ARTIFACTS/kubeconfig"
kind create cluster --name "$KIND_NAME" --image kindest/node:v1.35.0 --kubeconfig "$KUBECONFIG" --wait 90s
cleanup() {
  kubectl get namespaces,events -A -o yaml > "$ARTIFACTS/cluster-state.yaml" 2>&1 || true
  kubectl -n capsule-system logs -l app.kubernetes.io/name=resource-permits --all-containers --prefix > "$ARTIFACTS/addon.log" 2>&1 || true
  kubectl -n capsule-system logs -l app.kubernetes.io/name=capsule --all-containers --prefix > "$ARTIFACTS/capsule.log" 2>&1 || true
  kind delete cluster --name "$KIND_NAME"
}
trap cleanup EXIT
CAPSULE_IMAGE=$(cd "$CAPSULE_SOURCE" && KO_DOCKER_REPO=kind.local ko build --local --bare ./cmd/controller)
ADDON_IMAGE=$(KO_DOCKER_REPO=kind.local ko build --local --bare ./cmd/controller)
kind load docker-image "$CAPSULE_IMAGE" "$ADDON_IMAGE" --name "$KIND_NAME"
cp -R "$CAPSULE_SOURCE/charts/capsule" "$ARTIFACTS/capsule-chart"
helm dependency build "$ARTIFACTS/capsule-chart"
helm install capsule "$ARTIFACTS/capsule-chart" --namespace capsule-system --create-namespace \
  --set manager.image.registry= \
  --set manager.image.repository="${CAPSULE_IMAGE%:*}" --set manager.image.tag="${CAPSULE_IMAGE##*:}" \
  --set certManager.generateCertificates=false --set tls.enableController=true \
  --set manager.options.workers=4 \
  --set 'rbac.resources.create=true' --set-string 'rbac.resources.labels.rbac\.authorization\.k8s\.io/aggregate-to-admin=true' \
  --set 'manager.options.rbac.administrationClusterRoles[0]=cluster-admin' --wait --timeout 5m
helm install resource-permits charts/resource-permits --namespace capsule-system \
  --set image.repository="${ADDON_IMAGE%:*}" --set image.tag="${ADDON_IMAGE##*:}" \
  --set-string 'rbac.requester.labels.rbac\.authorization\.k8s\.io/aggregate-to-admin=true' --wait --timeout 5m
# Record selection, seed and both controller revisions with report artifacts.
SEED=${GINKGO_SEED:-20261011}
printf 'Capsule: %s\nAddon: %s\nSeed: %s\n' "$CAPSULE_IMAGE" "$ADDON_IMAGE" "$SEED" > "$ARTIFACTS/builds.txt"
parallel_status=0
config_status=0
ginkgo -v -p --seed="$SEED" --fail-on-empty --label-filter='!config' --json-report="$ARTIFACTS/parallel.json" ./e2e || parallel_status=$?
ginkgo -v --seed="$SEED" --fail-on-empty --label-filter='config' --json-report="$ARTIFACTS/config.json" ./e2e || config_status=$?
if (( parallel_status != 0 || config_status != 0 )); then
  exit 1
fi
