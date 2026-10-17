# 플레이어 API Google Cloud 배포

## 현재 상태

`Dockerfile.player-api`는 전적·개인 통계·공식 통계 비교·명시적 갱신을 제공하는 NestJS 앱을 실행한다. 기존 `Dockerfile`과 `main.ts`는 기존 전체 백엔드용으로 유지한다. 플레이어 앱은 Supabase와 Redis 설정 없이 시작하며 `GET /health/live`(프로세스)와 `GET /health/ready`(BSER API 키, PostgreSQL 연결 및 전적 테이블)를 제공한다. 프론트엔드의 멀티서치는 `PLAYER_API_BASE_URL`을 설정하면 새 플레이어 API를 사용한다.

이 문서는 실제 프로젝트 ID와 예산이 정해지면 실행할 첫 수동 배포 절차다. Google Cloud 리소스와 서비스는 아직 생성하지 않았다.

## 구성과 비용

Cloud Run 서비스 1개, Cloud SQL for PostgreSQL 1개, Artifact Registry 저장소, Secret Manager 비밀값 2개(`BSER_API_KEY`, `DB_PASS`)를 사용한다. 같은 지역의 Cloud Run과 Cloud SQL을 선택한다. `asia-northeast3`(서울)은 예시이며 프로젝트와 예산에 맞춰 확정한다. [Cloud Run](https://cloud.google.com/run/pricing)은 사용량에 따라, [Cloud SQL](https://cloud.google.com/sql/pricing)은 인스턴스가 실행되는 동안 CPU·메모리·스토리지 등에 요금이 발생한다. Cloud Run을 0개 인스턴스로 축소해도 Cloud SQL 비용은 계속된다. [예산 알림](https://docs.cloud.google.com/billing/docs/how-to/budgets)은 지출을 알리지만 일반 알림만으로 과금이 자동 중단되지는 않는다.

2026-10-18 기준 신규 계정 자격이 있으면 [Google Cloud 무료 체험](https://docs.cloud.google.com/free/docs/free-cloud-features)에서 90일간 $300 크레딧을 사용할 수 있다. Cloud Run에는 별도 월별 무료 사용량이 있지만 Cloud SQL에는 상시 무료 인스턴스가 없다. [Cloud SQL 전용 무료 체험](https://docs.cloud.google.com/sql/docs/postgres/free-trial-instance)은 30일 후 요청 처리가 중단되므로, **90일 연속 시험 운영**에는 일반 Cloud SQL Enterprise 공유 코어 `db-f1-micro`를 크레딧으로 지불하는 구성을 우선 검토한다. `db-f1-micro`는 개발·시험용이며 SLA가 없다. PostgreSQL 16 이상에서 기본 에디션이 Enterprise Plus일 수 있으므로 생성 전에 에디션·머신·스토리지·백업·지역을 명시하고 [요금 계산기](https://cloud.google.com/products/calculator)로 90일 예상액을 확인한다. 크레딧이 없거나 만료되면 이 구성은 무료가 아니다.

프로젝트 전체에 크레딧보다 낮은 금액으로 [예산 알림](https://docs.cloud.google.com/billing/docs/how-to/budgets)을 설정한다. 지원되는 계정이면 [Cloud Run 지출 상한](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)도 설정할 수 있지만, 이 상한은 Cloud SQL 비용을 멈추지 않는다. 무료 체험을 유료 계정으로 전환하지 않으면 90일 만료 또는 크레딧 소진 시 프로젝트 리소스가 중지된다. 유료 전환 시 잔여 크레딧은 원래 만료일까지 유지되지만 초과 사용에는 요금이 발생할 수 있다.

첫 배포에서는 Cloud Run 서비스 최대 인스턴스를 1개, 최소를 0개로 설정한다. 이는 기존 BSER 요청 큐·동일 플레이어 갱신 공유가 프로세스 메모리에 있기 때문이다. [최대 인스턴스 제한](https://docs.cloud.google.com/run/docs/configuring/max-instances)은 일시적으로 초과될 수 있으므로 전역 호출량 보장으로 취급하지 않는다. 다중 인스턴스 확장은 공유 요청 제한과 갱신 조정을 만든 뒤 진행한다. 한 인스턴스의 PostgreSQL 풀은 최대 5개 연결이다.

## 프로젝트 준비

1. Google Cloud 무료 체험 자격, 프로젝트 ID, 결제 계정, 90일 예상 비용을 확인하고 예산 알림을 만든다. Cloud Run·Cloud SQL·Artifact Registry·Cloud Build·Secret Manager API를 활성화한다.
2. 배포 지역에 PostgreSQL 인스턴스와 별도 데이터베이스·사용자를 만든다. 사용자는 `player_history` 스키마와 테이블을 생성할 권한이 필요하다. 90일 연속 운영을 선택했다면 Cloud SQL Enterprise `db-f1-micro` 같은 작은 일반 인스턴스를 사용하고, 30일 무료 체험 인스턴스와 혼동하지 않는다.
3. 런타임 서비스 계정을 만들고 Cloud SQL Client 권한을 부여한다. `BSER_API_KEY`와 `DB_PASS`는 Secret Manager에 각각 저장하고, 이 서비스 계정에 두 비밀값에 대한 Secret Accessor 권한만 부여한다. [Cloud SQL 연결](https://docs.cloud.google.com/sql/docs/postgres/connect-run)과 [Cloud Run 비밀값](https://docs.cloud.google.com/run/docs/configuring/services/secrets) 문서를 따른다. API 키와 DB 암호를 Git, 이미지, 일반 환경변수 설정 파일에 넣지 않는다.
4. 같은 지역에 Docker 형식 Artifact Registry 저장소를 만든다. 아래 명령에서 실제 값으로 치환한다.

```sh
PROJECT_ID=your-project-id
REGION=asia-northeast3
REPOSITORY=ermeta
INSTANCE=your-project-id:asia-northeast3:your-sql-instance
DB_USER=player_api
DB_NAME=ermeta
SERVICE_ACCOUNT=ermeta-player-run@your-project-id.iam.gserviceaccount.com
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/player-api:$(git rev-parse --short HEAD)"
```

`INSTANCE`는 Cloud SQL의 **인스턴스 연결 이름**이다. [Cloud SQL 문서](https://docs.cloud.google.com/sql/docs/postgres/connect-run)에 따라 Cloud Run에 인스턴스를 연결하면 `/cloudsql/PROJECT:REGION:INSTANCE` Unix socket이 생성된다. `DATABASE_URL`은 로컬 PostgreSQL용이며, `INSTANCE_UNIX_SOCKET`을 설정하면 Cloud SQL 설정이 우선한다.

## 이미지와 마이그레이션

저장소 루트에서 다음 명령을 실행한다. `_IMAGE`는 [Cloud Build 설정 파일의 치환값](https://docs.cloud.google.com/build/docs/building/build-containers)이다.

```sh
gcloud builds submit backend \
  --project "$PROJECT_ID" --region "$REGION" \
  --config backend/cloudbuild.player-api.yaml \
  --substitutions "_IMAGE=$IMAGE"
```

이미지에는 마이그레이션 스크립트와 SQL 파일이 포함된다. 서비스 배포 전에 같은 이미지를 [Cloud Run Job](https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/deploy)으로 실행한다. Secret Manager 버전은 예시 `1` 대신 실제 생성한 버전을 사용한다.

```sh
gcloud run jobs deploy ermeta-player-migrate \
  --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
  --service-account "$SERVICE_ACCOUNT" --set-cloudsql-instances "$INSTANCE" \
  --set-env-vars "INSTANCE_UNIX_SOCKET=/cloudsql/$INSTANCE,DB_USER=$DB_USER,DB_NAME=$DB_NAME" \
  --set-secrets 'DB_PASS=ermeta-player-db-password:1' \
  --command node --args scripts/migrate-player-history.js --max-retries 0
gcloud run jobs execute ermeta-player-migrate \
  --project "$PROJECT_ID" --region "$REGION" --wait
```

마이그레이션은 적용 이력을 DB에 기록하고 재실행해도 이미 적용한 파일은 건너뛴다. 실패한 작업의 로그를 확인하고 원인을 고친 뒤 다시 실행한다. 앱 시작 시 자동 마이그레이션은 하지 않는다.

## 서비스 배포와 확인

```sh
gcloud run deploy ermeta-player-api \
  --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
  --service-account "$SERVICE_ACCOUNT" --execution-environment gen2 \
  --add-cloudsql-instances "$INSTANCE" \
  --set-env-vars "^@^INSTANCE_UNIX_SOCKET=/cloudsql/$INSTANCE@DB_USER=$DB_USER@DB_NAME=$DB_NAME@FRONTEND_ORIGINS=https://erwagg.com,https://www.erwagg.com" \
  --set-secrets 'DB_PASS=ermeta-player-db-password:1,BSER_API_KEY=ermeta-bser-api-key:1' \
  --min 0 --max 1 --concurrency 20 \
  --no-allow-unauthenticated
```

`FRONTEND_ORIGINS`는 쉼표로 구분하는 앱 설정이므로 위 명령은 `gcloud`의 환경변수 구분자를 `@`로 바꾼다. 첫 배포는 비공개로 두고 [인증된 요청](https://docs.cloud.google.com/run/docs/authenticating/developers)을 사용해 `/health/live`와 `/health/ready`가 200인지 확인한다. 이어서 닉네임 하나의 `/v1/players/:nickname/stats`, `/v1/players/compare`, `/v1/players/:nickname/refresh`를 호출해 DB 저장·재조회·로그를 확인한다. 데이터 상호 삭제 가능성이 보고된 [#320](https://github.com/BellYun/ERMeta/issues/320)을 해결하고 비용·요청 제한을 검증한 뒤 공개 여부와 프론트엔드 `PLAYER_API_BASE_URL` 연결을 결정한다.

문제가 생기면 [Cloud Run 이전 리비전으로 트래픽을 되돌리고](https://docs.cloud.google.com/run/docs/managing/revisions), DB 마이그레이션의 호환성을 확인한다. 첫 실배포가 확인된 뒤 GitHub Actions 배포 자동화는 [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)을 사용해 장기 서비스 계정 키 없이 구성한다.
