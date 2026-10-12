// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	capsulev1beta2 "github.com/projectcapsule/capsule/api/v1beta2"
	"github.com/projectcapsule/capsule/pkg/runtime/cache"
	"github.com/projectcapsule/capsule/pkg/runtime/configuration"
	controlleroptions "github.com/projectcapsule/capsule/pkg/runtime/controller"
	"github.com/projectcapsule/capsule/pkg/runtime/events"
	"github.com/projectcapsule/capsule/pkg/runtime/handlers"
	coreindexers "github.com/projectcapsule/capsule/pkg/runtime/indexers"
	tenantindexers "github.com/projectcapsule/capsule/pkg/runtime/indexers/tenant"
	"github.com/projectcapsule/capsule/pkg/runtime/indexers/tenantresource"
	runtimewebhook "github.com/projectcapsule/capsule/pkg/runtime/webhook"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"
	"github.com/projectcapsule/resource-permits/internal/controllers/invalidator"
	permitcontroller "github.com/projectcapsule/resource-permits/internal/controllers/resourcepermit"
	"github.com/projectcapsule/resource-permits/internal/metrics"
	permitwebhook "github.com/projectcapsule/resource-permits/internal/webhook/resourcepermit"
	"github.com/projectcapsule/resource-permits/internal/webhook/route"
	"github.com/projectcapsule/resource-permits/internal/webhook/serviceaccounts"
	permitindexers "github.com/projectcapsule/resource-permits/pkg/runtime/indexers/serviceaccount"
)

func main() {
	var (
		metricsAddress, healthAddress, certDir, configurationName string
		leaderElection                                            bool
		workers, burst                                            int
		qps                                                       float64
	)

	flag.StringVar(&metricsAddress, "metrics-bind-address", ":8080", "Metrics listen address")
	flag.StringVar(&healthAddress, "health-probe-bind-address", ":8081", "Health probe listen address")
	flag.StringVar(&certDir, "webhook-cert-dir", "/tmp/k8s-webhook-server/serving-certs", "Directory containing tls.crt and tls.key")
	flag.StringVar(&configurationName, "capsule-configuration", "default", "Existing CapsuleConfiguration to use")
	flag.BoolVar(&leaderElection, "leader-elect", true, "Enable leader election")
	flag.IntVar(&workers, "workers", 1, "Concurrent template reconciliations")
	flag.Float64Var(&qps, "kube-api-qps", 50, "Kubernetes client QPS")
	flag.IntVar(&burst, "kube-api-burst", 100, "Kubernetes client burst")

	logging := zap.Options{Development: false}
	logging.BindFlags(flag.CommandLine)
	flag.Parse()
	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&logging)))

	if err := run(ctrl.SetupSignalHandler(), metricsAddress, healthAddress, certDir, configurationName, leaderElection, workers, float32(qps), burst); err != nil {
		ctrl.Log.Error(err, "resource-permits stopped")
		os.Exit(1)
	}
}

func run(ctx context.Context, metricsAddress, healthAddress, certDir, configurationName string, leaderElection bool, workers int, qps float32, burst int) error {
	scheme := runtime.NewScheme()
	for _, add := range []func(*runtime.Scheme) error{clientgoscheme.AddToScheme, capsulev1beta2.AddToScheme, permitsv1beta2.AddToScheme} {
		if err := add(scheme); err != nil {
			return err
		}
	}

	restConfig, err := ctrl.GetConfig()
	if err != nil {
		return err
	}

	restConfig.QPS = qps
	restConfig.Burst = burst

	mgr, err := ctrl.NewManager(restConfig, ctrl.Options{
		Scheme:                 scheme,
		Metrics:                metricsserver.Options{BindAddress: metricsAddress},
		HealthProbeBindAddress: healthAddress,
		LeaderElection:         leaderElection,
		LeaderElectionID:       "resource-permits.addons.projectcapsule.dev",
		WebhookServer:          webhook.NewServer(webhook.Options{Port: 9443, CertDir: certDir}),
	})
	if err != nil {
		return err
	}
	// Capsule owns configuration. Require it to exist before using its shared
	// accessors, so installing the addon never invents a parallel policy surface.
	cfgObject := &capsulev1beta2.CapsuleConfiguration{}
	if err := mgr.GetAPIReader().Get(ctx, client.ObjectKey{Name: configurationName}, cfgObject); err != nil {
		return fmt.Errorf("loading CapsuleConfiguration: %w", err)
	}

	cfg := configuration.NewCapsuleConfiguration(ctx, mgr.GetClient(), mgr.GetAPIReader(), restConfig, configurationName)

	if err := registerIndexes(ctx, mgr); err != nil {
		return err
	}

	impersonation := cache.NewImpersonationCache()

	options := controlleroptions.ControllerOptions{ConfigurationName: configurationName, Runtime: controlleroptions.RuntimeControllerOptions{MaxConcurrentReconciles: workers}}
	if err := (&permitcontroller.ResourcePermitReconciler{
		Log: ctrl.Log.WithName("resourcepermit"), Configuration: cfg,
		ImpersonationCache: impersonation, Metrics: *metrics.MustMakeResourcePermitsRecorder(),
	}).SetupWithManager(mgr, options); err != nil {
		return err
	}

	if err := (&permitcontroller.ResourcePermitTemplateReconciler{Metrics: metrics.MustMakeResourcePermitTemplateRecorder()}).SetupWithManager(mgr, options); err != nil {
		return err
	}

	if err := (&permitcontroller.GlobalResourcePermitTemplateReconciler{Log: ctrl.Log.WithName("globalresourcepermittemplate"), Metrics: metrics.MustMakeGlobalResourcePermitTemplateRecorder()}).SetupWithManager(mgr, options); err != nil {
		return err
	}

	if err := invalidator.Setup(ctx, mgr, impersonation, cfg, configurationName); err != nil {
		return err
	}

	recorder := events.NewEventRecorder(mgr.GetClient(), ctrl.Log.WithName("events"), mgr.GetEventRecorder("resource-permits"), cfg)

	log := ctrl.Log.WithName("admission")
	if err := runtimewebhook.Register(mgr, recorder, runtimewebhook.RegistrationOptions{},
		route.ResourcePermitMutation(permitwebhook.ResourcePermitMutationHandler(log)),
		route.ResourcePermitValidation(permitwebhook.ResourcePermitValidationHandler(log, cfg)),
		route.ResourcePermitTemplateValidation(permitwebhook.ResourcePermitTemplateValidationHandler(log)),
		route.GlobalResourcePermitTemplateValidation(permitwebhook.GlobalResourcePermitTemplateValidationHandler(log)),
		route.GenericResourcePermitHandler(),
		&serviceAccountWebhook{},
	); err != nil {
		return err
	}

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		return err
	}

	if err := mgr.AddReadyzCheck("webhook", mgr.GetWebhookServer().StartedChecker()); err != nil {
		return err
	}

	return mgr.Start(ctx)
}

// Only indexes consumed by the addon are registered. Each index uses the manager
// cache; admission independently re-reads authorization snapshots through the API.
func registerIndexes(ctx context.Context, mgr ctrl.Manager) error {
	indexes := []coreindexers.CustomIndexer{
		permitindexers.ResourcePermitReference{},
		permitindexers.ResourcePermitFieldOwner{},
		tenantindexers.NamespacesReference{Obj: &capsulev1beta2.Tenant{}},
		tenantresource.FieldOwner{Obj: &capsulev1beta2.GlobalTenantResource{}},
		tenantresource.FieldOwner{Obj: &capsulev1beta2.TenantResource{}},
	}
	for _, index := range indexes {
		if err := mgr.GetFieldIndexer().IndexField(ctx, index.Object(), index.Field(), index.Func()); err != nil {
			return err
		}
	}

	return nil
}

type serviceAccountWebhook struct{}

func (*serviceAccountWebhook) GetPath() string { return "/serviceaccounts/references" }
func (*serviceAccountWebhook) GetHandlers() []handlers.Handler {
	return []handlers.Handler{serviceaccounts.ReferenceProtection()}
}
