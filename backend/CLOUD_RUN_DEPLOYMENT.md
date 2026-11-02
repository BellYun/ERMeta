# 플레이어 API Google Cloud 배포

## 현재 상태

`Dockerfile.player-api`는 전적·개인 통계·공식 통계 비교·명시적 갱신을 제공하는 NestJS 앱을 실행한다. 기존 `Dockerfile`과 `main.ts`는 기존 전체 백엔드용으로 유지한다. 플레이어 앱은 Supabase와 Redis 설정 없이 시작하며 아래 상태 경로를 제공한다. 프론트엔드의 멀티서치는 `PLAYER_API_BASE_URL`을 설정하면 새 플레이어 API를 사용한다.

| 경로 | 확인하는 항목 |
| --- | --- |
| `/health/live` | 프로세스 기동 |
| `/health/database` | PostgreSQL 연결과 전적 테이블 4개. BSER 키는 확인하지 않음 |
| `/health/ready` | BSER 키 설정과 DB 준비 상태. 키의 실제 유효성·외부 API 응답까지 검증하지는 않음 |

이 문서는 실제 프로젝트 ID와 예산이 정해지면 실행할 첫 수동 배포 절차다. Google Cloud 리소스와 서비스는 아직 생성하지 않았다.

## 운영 키 발급 전 비공개 프리뷰 (#332)

기존 BSER 키는 데이터 수집 전용이며 배포 환경에서 사용하지 않는다. 아래 프리뷰에는 BSER 비밀값이나 가짜 키를 넣지 않는다. 별도 서비스 `ermeta-player-preview`를 사용하고 프론트엔드의 운영 API 주소는 이 서비스로 변경하지 않는다.

로컬에 `gcloud`가 없으면 [Cloud Shell](https://docs.cloud.google.com/shell/docs/using-cloud-shell)의 CLI를 사용할 수 있다. 프로젝트 ID·무료 체험/결제 상태·배포 지역을 확인하고 아래 명령의 값을 먼저 정한다. 단계 A는 Cloud SQL 없이 기동을 확인하며, DB 연결은 단계 B에서 검증한다. Cloud Build·Artifact Registry·Cloud Run 사용량과 저장 비용은 발생할 수 있다. Cloud SQL의 지속 비용은 DB를 만들기로 결정한 뒤 시작한다.

### A. DB 없이 기동만 확인

프로젝트에서 Cloud Run·Artifact Registry·Cloud Build API를 사용할 수 있어야 한다. Docker 형식 Artifact Registry 저장소와 프리뷰 전용 런타임 서비스 계정이 필요하다. 이 단계의 런타임에는 Cloud SQL Client나 BSER Secret Accessor 권한이 필요 없다. 프로젝트 리소스 생성과 비용 설정을 끝낸 뒤 저장소 루트에서 진행한다.

```sh
PROJECT_ID=your-project-id
REGION=asia-northeast3
REPOSITORY=ermeta
PREVIEW_SERVICE=ermeta-player-preview
SERVICE_ACCOUNT=ermeta-player-preview@your-project-id.iam.gserviceaccount.com
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/player-api:$(git rev-parse --short HEAD)"

gcloud builds submit backend \
  --project "$PROJECT_ID" --region "$REGION" \
  --config backend/cloudbuild.player-api.yaml \
  --substitutions "_IMAGE=$IMAGE"

gcloud run deploy "$PREVIEW_SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
  --service-account "$SERVICE_ACCOUNT" --execution-environment gen2 \
  --cpu 1 --memory 512Mi --port 8080 \
  --min 0 --max 1 --concurrency 20 \
  --clear-secrets --clear-cloudsql-instances \
  --set-env-vars FRONTEND_ORIGINS=http://localhost:3000 \
  --startup-probe 'httpGet.path=/health/live,httpGet.port=8080,periodSeconds=5,timeoutSeconds=2,failureThreshold=12' \
  --no-allow-unauthenticated --invoker-iam-check
```

Cloud Build에서 기존 Dockerfile로 이미지를 빌드한다. `.gcloudignore`와 `.dockerignore`는 `.env*` 파일을 업로드·이미지 복사 대상에서 제외한다. [Cloud Run 컨테이너 계약](https://docs.cloud.google.com/run/docs/container-contract)에 따라 Linux x86_64 이미지를 사용해야 하므로 ARM Mac에서 만든 로컬 이미지를 그대로 올리지 않는다. [배포 명령](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)의 `--set-env-vars`와 `--clear-secrets`는 기존 설정을 교체/제거하므로 과거 BSER 키를 프리뷰에 남기지 않는다. 기동 검사는 `/health/live`를 사용한다. 키 없는 프리뷰에서 `/health/ready`를 기동 성공 조건으로 설정하면 안 된다.

[인증된 개발자 호출](https://docs.cloud.google.com/run/docs/authenticating/developers)에 필요한 `roles/run.invoker`가 있는 계정으로 아래 프록시를 실행한다. 서비스 IAM과 프로젝트에서 상속된 권한에 `allUsers`나 `allAuthenticatedUsers`가 없고 Invoker IAM 검사가 활성화되어 있는지도 확인한다. 기존 설정이 있다면 해소한 뒤 검증한다. 프록시 주소는 외부에 공유하지 않는다.

```sh
gcloud run services get-iam-policy "$PREVIEW_SERVICE" \
  --project "$PROJECT_ID" --region "$REGION"
gcloud run services describe "$PREVIEW_SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --format=export
gcloud run services proxy "$PREVIEW_SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --port 8085
```

별도 터미널에서 인증 없이 서비스의 실제 URL을 요청하면 성공하지 않아야 한다. 프록시를 통한 확인은 저장소의 Node.js 22 환경에서 실행한다.

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://YOUR_PRIVATE_SERVICE_URL/health/live
npm --prefix backend run check:player-preview -- http://127.0.0.1:8085 --without-database
```

외부 무인증 요청의 401/403과, 프록시를 통한 `/health/live` 200·`/health/database` 503(`PLAYER_DATABASE_NOT_READY`)·`/health/ready` 503(`BSER_API_KEY_NOT_CONFIGURED`)를 확인한다. 이 단계는 서버 기동만 확인한 것이며 DB 연결과 전적 기능은 미검증 상태다.

### B. DB 연결 확인

DB 인스턴스·계정·예산을 확정한 뒤 이 문서의 프로젝트 준비와 마이그레이션 절차를 진행한다. 프리뷰 서비스 계정에 Cloud SQL Client와 **DB 암호 비밀값만** 읽을 권한을 부여한다. 수집용 BSER 키에는 접근 권한을 주지 않는다. 아래 변수는 생성한 값으로 치환한다.

```sh
INSTANCE=your-project-id:asia-northeast3:your-sql-instance
DB_USER=player_api
DB_NAME=ermeta
DB_SECRET=ermeta-player-db-password:1

gcloud run deploy "$PREVIEW_SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
  --service-account "$SERVICE_ACCOUNT" --execution-environment gen2 \
  --cpu 1 --memory 512Mi --port 8080 \
  --set-cloudsql-instances "$INSTANCE" \
  --set-env-vars "INSTANCE_UNIX_SOCKET=/cloudsql/$INSTANCE,DB_USER=$DB_USER,DB_NAME=$DB_NAME,FRONTEND_ORIGINS=http://localhost:3000" \
  --set-secrets "DB_PASS=$DB_SECRET" \
  --min 0 --max 1 --concurrency 20 \
  --startup-probe 'httpGet.path=/health/live,httpGet.port=8080,periodSeconds=5,timeoutSeconds=2,failureThreshold=12' \
  --no-allow-unauthenticated --invoker-iam-check

npm --prefix backend run check:player-preview -- http://127.0.0.1:8085
```

`--set-secrets`는 기존 비밀값 연결을 모두 교체하여 DB 암호만 설정한다. 마이그레이션 Job이 성공한 뒤 상태 검증 스크립트가 `/health/live` 200·`/health/database` 200·`/health/ready` 503(`BSER_API_KEY_NOT_CONFIGURED`)를 확인해야 한다. 스크립트는 `.env`를 읽지 않고 이 세 경로만 호출한다. 실제 전적 검색이나 BSER 호출은 수행하지 않는다.

이 단계에서도 서비스는 비공개이며 실제 전적 검색은 검증하지 않는다. 운영 키 발급 후 별도의 Secret Manager 비밀값과 최소 접근 권한을 설정하고, 실제 API 소량 확인을 마친 뒤 공개 전환을 검토한다.

## 구성과 비용

운영 키 발급 후의 구성은 Cloud Run 서비스 1개, Cloud SQL for PostgreSQL 1개, Artifact Registry 저장소, Secret Manager 비밀값 2개(`BSER_API_KEY`, `DB_PASS`)다. 키 없는 DB 프리뷰에서는 `DB_PASS`만 사용한다. 같은 지역의 Cloud Run과 Cloud SQL을 선택한다. `asia-northeast3`(서울)은 예시이며 프로젝트와 예산에 맞춰 확정한다. [Cloud Run](https://cloud.google.com/run/pricing)은 사용량에 따라, [Cloud SQL](https://cloud.google.com/sql/pricing)은 인스턴스가 실행되는 동안 CPU·메모리·스토리지 등에 요금이 발생한다. Cloud Run을 0개 인스턴스로 축소해도 Cloud SQL 비용은 계속된다. [예산 알림](https://docs.cloud.google.com/billing/docs/how-to/budgets)은 지출을 알리지만 일반 알림만으로 과금이 자동 중단되지는 않는다.

2026-10-18 기준 신규 계정 자격이 있으면 [Google Cloud 무료 체험](https://docs.cloud.google.com/free/docs/free-cloud-features)에서 90일간 $300 크레딧을 사용할 수 있다. Cloud Run에는 별도 월별 무료 사용량이 있지만 Cloud SQL에는 상시 무료 인스턴스가 없다. [Cloud SQL 전용 무료 체험](https://docs.cloud.google.com/sql/docs/postgres/free-trial-instance)은 30일 후 요청 처리가 중단되므로, **90일 연속 시험 운영**에는 일반 Cloud SQL Enterprise 공유 코어 `db-f1-micro`를 크레딧으로 지불하는 구성을 우선 검토한다. `db-f1-micro`는 개발·시험용이며 SLA가 없다. PostgreSQL 16 이상에서 기본 에디션이 Enterprise Plus일 수 있으므로 생성 전에 에디션·머신·스토리지·백업·지역을 명시하고 [요금 계산기](https://cloud.google.com/products/calculator)로 90일 예상액을 확인한다. 크레딧이 없거나 만료되면 이 구성은 무료가 아니다.

프로젝트 전체에 크레딧보다 낮은 금액으로 [예산 알림](https://docs.cloud.google.com/billing/docs/how-to/budgets)을 설정한다. 지원되는 계정이면 [Cloud Run 지출 상한](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)도 설정할 수 있지만, 이 상한은 Cloud SQL 비용을 멈추지 않는다. 무료 체험을 유료 계정으로 전환하지 않으면 90일 만료 또는 크레딧 소진 시 프로젝트 리소스가 중지된다. 유료 전환 시 잔여 크레딧은 원래 만료일까지 유지되지만 초과 사용에는 요금이 발생할 수 있다.

첫 배포에서는 Cloud Run 서비스 최대 인스턴스를 1개, 최소를 0개로 설정한다. 이는 기존 BSER 요청 큐·동일 플레이어 갱신 공유가 프로세스 메모리에 있기 때문이다. [최대 인스턴스 제한](https://docs.cloud.google.com/run/docs/configuring/max-instances)은 일시적으로 초과될 수 있으므로 전역 호출량 보장으로 취급하지 않는다. 다중 인스턴스 확장은 공유 요청 제한과 갱신 조정을 만든 뒤 진행한다. 한 인스턴스의 PostgreSQL 풀은 최대 5개 연결이다.

## 프로젝트 준비

1. Google Cloud 무료 체험 자격, 프로젝트 ID, 결제 계정, 90일 예상 비용을 확인하고 예산 알림을 만든다. Cloud Run·Cloud SQL·Artifact Registry·Cloud Build·Secret Manager API를 활성화한다.
2. 배포 지역에 PostgreSQL 인스턴스와 별도 데이터베이스·사용자를 만든다. 사용자는 `player_history` 스키마와 테이블을 생성할 권한이 필요하다. 90일 연속 운영을 선택했다면 Cloud SQL Enterprise `db-f1-micro` 같은 작은 일반 인스턴스를 사용하고, 30일 무료 체험 인스턴스와 혼동하지 않는다.
3. 런타임 서비스 계정을 만들고 Cloud SQL Client 권한을 부여한다. `DB_PASS`를 Secret Manager에 저장하고 해당 비밀값의 Secret Accessor 권한만 부여한다. 별도 운영 키가 발급된 뒤에만 `BSER_API_KEY`를 등록하고 읽기 권한을 추가한다. 수집용 키는 이 절차에서 사용하지 않는다. [Cloud SQL 연결](https://docs.cloud.google.com/sql/docs/postgres/connect-run)과 [Cloud Run 비밀값](https://docs.cloud.google.com/run/docs/configuring/services/secrets) 문서를 따른다. API 키와 DB 암호를 Git, 이미지, 일반 환경변수 설정 파일에 넣지 않는다.
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

`FRONTEND_ORIGINS`는 쉼표로 구분하는 앱 설정이므로 위 명령은 `gcloud`의 환경변수 구분자를 `@`로 바꾼다. 이 절차는 별도 운영 BSER 키를 발급받은 뒤 사용한다. 첫 배포는 비공개로 두고 [인증된 요청](https://docs.cloud.google.com/run/docs/authenticating/developers)을 사용해 `/health/live`와 `/health/ready`가 200인지 확인한다. 이어서 닉네임 하나의 `/v1/players/:nickname/stats`, `/v1/players/compare`, `/v1/players/:nickname/refresh`를 호출해 DB 저장·재조회·로그를 확인한다. #320의 상호 삭제 방지는 #324로 반영되어 있다. 비용·요청 제한을 검증한 뒤 공개 여부와 프론트엔드 `PLAYER_API_BASE_URL` 연결을 결정한다.

문제가 생기면 [Cloud Run 이전 리비전으로 트래픽을 되돌리고](https://docs.cloud.google.com/run/docs/managing/revisions), DB 마이그레이션의 호환성을 확인한다. 첫 실배포가 확인된 뒤 GitHub Actions 배포 자동화는 [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)을 사용해 장기 서비스 계정 키 없이 구성한다.
