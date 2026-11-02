// Run against the local gcloud Cloud Run proxy. Never loads .env or calls BSER.
async function main() {
  const flags = process.argv.slice(3);
  if (flags.some((flag) => flag !== '--without-database')) {
    throw new Error('지원하는 옵션은 --without-database입니다.');
  }
  const withoutDatabase = flags.includes('--without-database');
  const baseUrl = new URL(process.argv[2] ?? 'http://127.0.0.1:8085');
  if (baseUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(baseUrl.hostname)
      || baseUrl.username || baseUrl.password || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
    throw new Error('인증된 gcloud 프록시의 로컬 HTTP 주소만 입력해주세요. 예: http://127.0.0.1:8085');
  }
  const checks = [
    { path: '/health/live', status: 200, key: 'status', value: 'ok' },
    withoutDatabase
      ? { path: '/health/database', status: 503, key: 'code', value: 'PLAYER_DATABASE_NOT_READY' }
      : { path: '/health/database', status: 200, key: 'status', value: 'ok' },
    { path: '/health/ready', status: 503, key: 'code', value: 'BSER_API_KEY_NOT_CONFIGURED' },
  ];
  for (const check of checks) {
    const response = await fetch(new URL(check.path, baseUrl), {
      redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json();
    if (response.status !== check.status || body[check.key] !== check.value) {
      throw new Error(`${check.path}: 예상한 HTTP ${check.status} / ${check.value} 응답이 아닙니다 (HTTP ${response.status}).`);
    }
    console.log(`PASS ${check.path}: HTTP ${response.status} / ${check.value}`);
  }
  console.log(withoutDatabase
    ? '키·DB 없는 프리뷰의 기동만 확인했습니다. DB 연결과 전적 서비스는 아직 검증하지 않았습니다.'
    : '키 없는 프리뷰의 서버·DB 상태를 확인했습니다. 실제 전적 서비스 준비 완료를 의미하지 않습니다.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
