import { Fragment, useEffect, useMemo, useState } from "react";
import { AuthUpdateEvent, LogSnapshot, SortBy, TrioRecommendation } from "../shared/types";

const SORT_OPTIONS: Array<{ label: string; value: SortBy }> = [
  { label: "게임 수", value: "totalGames" },
  { label: "승률", value: "winRate" },
  { label: "평균 RP", value: "averageRP" },
];

function formatExpiration(expUnixSeconds: number): string {
  return new Date(expUnixSeconds * 1000).toLocaleString();
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function winRateClass(value: number): string {
  if (value >= 50) return "wr-good";
  if (value >= 40) return "wr-mid";
  return "wr-bad";
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function deriveKnownCharacters(snapshot: LogSnapshot | null): number[] {
  if (!snapshot) return [];

  const merged: number[] = [];
  if (snapshot.myCharacterCode && snapshot.myCharacterCode > 0) {
    merged.push(snapshot.myCharacterCode);
  }

  for (const code of snapshot.partyCharacterCodes) {
    if (!merged.includes(code)) {
      merged.push(code);
    }
  }

  return merged.slice(0, 2);
}

export default function App() {
  const [authUser, setAuthUser] = useState<{
    steamId: string;
    personaName: string;
    expiresAt: number;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [logPath, setLogPath] = useState<string>("-");
  const [snapshot, setSnapshot] = useState<LogSnapshot | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("totalGames");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<TrioRecommendation[]>([]);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  const knownCharacters = useMemo(() => deriveKnownCharacters(snapshot), [snapshot]);

  useEffect(() => {
    const unsubscribeAuth = window.ermeta.auth.onUpdate((event: AuthUpdateEvent) => {
      if (event.status === "authenticated" && event.user) {
        setAuthError(null);
        setAuthUser(event.user);
      } else if (event.status === "logged_out") {
        setAuthUser(null);
      } else if (event.status === "error") {
        setAuthError(event.error ?? "인증 중 오류가 발생했습니다.");
      }
    });

    const unsubscribeSnapshot = window.ermeta.logs.onSnapshot((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setLogError(null);
    });

    const unsubscribeLogError = window.ermeta.logs.onError((message) => {
      setLogError(message);
    });

    void window.ermeta.auth.me().then((user) => {
      setAuthUser(user);
    });

    void window.ermeta.logs.start().then((result) => {
      setLogPath(result.path);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
      unsubscribeLogError();
      void window.ermeta.logs.stop();
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setRecommendations([]);
      setRecommendationError("Steam 로그인 후 추천을 조회할 수 있습니다.");
      return;
    }

    if (knownCharacters.length === 0) {
      setRecommendations([]);
      setRecommendationError("로그에서 캐릭터/파티 정보를 감지하면 추천이 표시됩니다.");
      return;
    }

    const [character1, character2] = knownCharacters;
    setLoading(true);
    setRecommendationError(null);

    void window.ermeta.recommendation
      .get({
        character1,
        character2,
        sortBy,
        limit: 20,
      })
      .then((items) => {
        setRecommendations(items);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "추천을 가져오지 못했습니다.";
        setRecommendationError(message);
        setRecommendations([]);
      })
      .finally(() => setLoading(false));
  }, [authUser, knownCharacters, sortBy]);

  const handleLogin = async () => {
    setAuthError(null);
    await window.ermeta.auth.login();
  };

  const handleLogout = async () => {
    await window.ermeta.auth.logout();
    setRecommendations([]);
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>ERMeta Desktop</h1>
          <p>Steam 로그인 + 실시간 로그 기반 조합 추천</p>
        </div>

        <div className="auth-box">
          {authUser ? (
            <div className="auth-user-card">
              <strong>{authUser.personaName}</strong>
              <span>{authUser.steamId}</span>
              <span>만료: {formatExpiration(authUser.expiresAt)}</span>
              <button onClick={handleLogout}>로그아웃</button>
            </div>
          ) : (
            <>
              <span>Steam 계정으로 로그인 필요</span>
              <button className="primary" onClick={handleLogin}>Steam 로그인</button>
            </>
          )}
        </div>
      </header>

      {(authError || logError || recommendationError) && (
        <section className="panel error-panel">
          {authError && <p>[인증] {authError}</p>}
          {logError && <p>[로그] {logError}</p>}
          {recommendationError && <p>[추천] {recommendationError}</p>}
        </section>
      )}

      <section className="panel">
        <h2>실시간 로그 상태</h2>
        <div className="grid two-cols">
          <div>
            <label>로그 경로</label>
            <code>{logPath}</code>
          </div>
          <div>
            <label>매치 상태</label>
            <span className={`status-badge badge-${snapshot?.matchState ?? "idle"}`}>
              <span className="status-dot" />
              {snapshot?.matchState ?? "idle"}
            </span>
          </div>
          <div>
            <label>내 캐릭터 코드</label>
            <strong>{snapshot?.myCharacterCode ?? "-"}</strong>
          </div>
          <div>
            <label>파티 캐릭터 코드</label>
            <strong>
              {snapshot?.partyCharacterCodes.length
                ? snapshot.partyCharacterCodes.join(", ")
                : "-"}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h2>조합 추천</h2>
          <div className="pill-tabs">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={sortBy === option.value ? "active" : ""}
                onClick={() => setSortBy(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="known-allies">
          <label>현재 추천 기준 캐릭터</label>
          {knownCharacters.length > 0 ? (
            <div className="char-chips">
              {knownCharacters.map((code, i) => (
                <Fragment key={code}>
                  {i > 0 && <span className="char-plus">+</span>}
                  <span className="char-chip">{code}</span>
                </Fragment>
              ))}
            </div>
          ) : (
            <span className="waiting-pulse">감지 대기 중...</span>
          )}
        </div>

        {loading ? (
          <p className="loading">추천 데이터 로딩 중...</p>
        ) : recommendations.length === 0 ? (
          <p className="empty">표시할 추천 결과가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>조합(코드)</th>
                  <th>승률</th>
                  <th>평균 RP</th>
                  <th>게임 수</th>
                  <th>평균 순위</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((item, index) => (
                  <tr key={`${item.character1}-${item.character2}-${item.character3}-${index}`}>
                    <td>
                      {index < 3 ? (
                        <span className="rank-medal">{RANK_MEDALS[index]}</span>
                      ) : (
                        <span className="rank-num">{index + 1}</span>
                      )}
                    </td>
                    <td>
                      {item.character1} + {item.character2} + {item.character3}
                    </td>
                    <td>
                      <span className={winRateClass(item.winRate)}>
                        {formatPercentage(item.winRate)}
                      </span>
                    </td>
                    <td>{item.averageRP.toFixed(1)}</td>
                    <td>{item.totalGames.toLocaleString()}</td>
                    <td>{item.averageRank.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
