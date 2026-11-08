# 메탈슬러그 6 PSP 혼자하기

회원은 뉴트월드 온라인게임의 03 혼자하기에서 메탈슬러그 6을 선택한다. 기존 Sites 서버 `newtworld-ms3-coop-5p`의 `/psp6/`가 별도 창에서 실행된다. GitHub Pages에는 회원 진입 폼만 있다.

- 폼은 기존 회원 토큰·기기 식별값과 사이트 세션을 POST 본문으로 전달한다. 기존 게이트웨이가 회원과 세션을 대조한 후 해당 입장에만 유효한 암호화된 HttpOnly 쿠키를 발급한다.
- 서버는 PSP 실행 문서에 COOP와 COEP를 적용한다. EmulatorJS 4.2.3 및 PPSSPP 스레드 코어는 같은 서버에서 제공한다. 메탈슬러그 1~5·협동전의 문서와 코어는 기존 경로를 사용한다.
- 회원의 게임 준비 요청으로 6편 전용 암호화 조각을 받고 gzip을 푼다. 실제 PSP 화면이 나타난 후 게임을 일시정지한다. 게임 시작을 확인하면 기존 Apps Script의 `contentArcadeEntry`가 회원과 입장 ID로 500젬을 한 번 처리한다. 응답이 끊기면 같은 창의 같은 ID로 다시 확인한다.
- 실제 Worker 구현은 Sites의 `worker/index.ts`, `lib/game/psp-solo.mjs`, `lib/game/arcade-entry.mjs`에 있다. 배포된 게임 패키지와 대응하는 `NW_PSP6_MASTER`를 Sites 비밀 설정에서 사용한다. 교체하려면 새로운 키로 전체 조각과 목록을 함께 재생성한다.
- 키는 WASD 또는 방향키로 이동, J로 사격, K로 선택과 점프, U로 수류탄, Enter로 시작한다. 전체화면에서 Esc로 복귀한다.

기존 `server/psp-integration-adapter.mjs`와 로컬 진단 페이지는 독립 테스트용이다.
