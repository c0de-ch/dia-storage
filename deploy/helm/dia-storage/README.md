# dia-storage Helm chart

Runs [Dia-Storage](https://github.com/c0de-ch/dia-storage) on Kubernetes:

- one Deployment (Recreate strategy, one replica) with the Next.js server,
- an init container that pushes the Drizzle schema, applies `drizzle/*.sql`
  and seeds the admin user,
- a PersistentVolumeClaim for the slides (`/data`, kept when the release goes),
- a PostgreSQL `Cluster` through the [CloudNativePG](https://cloudnative-pg.io)
  operator (or an external database with `database.cnpg.enabled=false`),
- an optional nightly `pg_dump` CronJob into the data volume,
- Gateway API `HTTPRoute`s (or an Ingress).

```bash
helm install dia-storage oci://ghcr.io/c0de-ch/charts/dia-storage \
  --namespace dia-storage --create-namespace \
  --set image.tag=sha-<commit> \
  --set seed.adminEmail=you@example.com \
  --set secrets.create.DIA_EMAIL__HOST=smtp.example.com \
  --set secrets.create.DIA_EMAIL__USER=... \
  --set secrets.create.DIA_EMAIL__PASSWORD=... \
  --set secrets.create.DIA_EMAIL__FROM=noreply@example.com
```

In GitOps the secret is a `SealedSecret` and `secrets.existingSecret` names
it; see `values.yaml` for every option. The non-secret settings are the
`config` map, rendered to `config.yaml` with the same keys as
`config.yaml.example`.

Lint and render locally:

```bash
helm lint deploy/helm/dia-storage -f deploy/helm/dia-storage/ci/test-values.yaml
helm template dia-storage deploy/helm/dia-storage -f deploy/helm/dia-storage/ci/test-values.yaml
```

Every chart change needs a bump of `version` in `Chart.yaml`: CI publishes a
chart version only once.
