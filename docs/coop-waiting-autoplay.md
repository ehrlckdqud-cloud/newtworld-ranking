# 대기음악 자동재생 — 2026-11-02

회원 세션 확인 직후 엔진 다운로드 전에 대기음악 재생을 시도한다. 음원 canplay, pageshow 및 탭 복귀에서도 재시도한다. pagehide에서는 재생만 일시정지해 bfcache 복귀 시 대기/게임 상태를 유지한다. 게임 중 또는 사용자가 음악을 끈 상태에서는 자동 재개하지 않는다.

node tests/coop-waiting-autoplay.mjs 통과. 초기 테스트 스텁의 base 누락을 수정한 뒤 정상 통과했다.

브라우저의 유음 자동재생 차단 정책을 우회하지 않는다. Firefox에서 해당 사이트 자동재생을 허용하지 않았다면 클릭 없이 소리를 재생하는 것은 보장할 수 없다. 사이트별 오디오 및 비디오 자동재생 허용이 필요할 수 있다.

변경 파일: coop/lobby-audio.mjs, coop/newtworld-entry.mjs, coop/index.html. 인증과 결제는 변경하지 않았다.

## 배포

PR #135 병합, main 커밋 088b4c0c56060ca1d1e63310c8e3aa2c4498fe4b.
Pages 실행 41434637911 completed/success 확인: https://github.com/ehrlckdqud-cloud/newtworld-ranking/actions/runs/41434637911
사용자 Firefox의 사이트별 자동재생 권한 및 실제 무클릭 오디오 출력은 이 실행에서 확인하지 못했다.
