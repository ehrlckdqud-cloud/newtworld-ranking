# 3번 Work 서버 검증 및 인계 — 2026-11-02

사용자 승인에 따라 기존 작업 분담 문서와 같은 문서 브랜치에 기록한다. 운영 코드 및 배포 변경은 없다.

## 확인 기준

- ranking main: `652ebad429d051d94a293f85986e157208b83642`.
- Sites project: `appgprj_6ae21ef338948191bb1fb041b946beda`.
- Sites 소스 및 저장 버전 33 커밋: `1955cac91d56017899e527bc94390038012d9dfd`.
- 저장 버전 ID: `appgprj_6ae21ef338948191bb1fb041b946beda~appgver_553d908a2ca88191a2c52b14494aaff5`.
- 배포 ID: `appgdep_6ae63b99f0548191a3f34488c4f74445`.
- 배포 조회 결과: `succeeded`.
- 운영 URL: https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site

## 결과

Sites 서버의 테스트 비밀번호 검사는 기존 소스에서 이미 제거되어 있으며 해당 버전 33의 배포 성공을 확인했다. 이번 작업에서 서버 소스나 설정을 변경하거나 같은 버전을 중복 배포하지 않았다.

`lib/game/newtworld-gateway.mjs`는 NW_TEST_PASSWORD를 비교하지 않는다. X-NW-Test-Password는 이전 클라이언트 호환용 CORS 허용 헤더로 남아 있지만 입장 조건으로 사용하지 않는다.

회원 인증, 세션 검사, PC 전용 및 Origin 제한은 유지된다. POST /api/site-session의 claim은 member.token/device를 profileData로 확인한 뒤 검증된 memberId로 세션을 확보한다. X-NW-Site-Session 및 X-NW-Site-Connection 헤더와 주기적 renew 계약은 유지해야 한다. /api/test-access는 세션과 회원 인증 후 응답하며 비밀번호를 요구하지 않는다. /coin의 좌석 Bearer 인증, 검증된 billingMember 일치 및 requestId 중복 방지 계약도 유지된다. 현재 클라이언트와 맞추기 위한 서버 API 변경 필요는 발견하지 못했다.

## 검증

다음 4개 파일에서 총 72개 테스트 통과:

- tests/newtworld-gateway.test.mjs
- tests/relay.test.mjs
- tests/turn-config.test.mjs
- tests/worker-routing.test.mjs

최초 실행에서 71개는 통과했고 worker-routing 파일만 typescript 의존성 미설치로 실행 실패했다. 공식 의존성 설치 후 해당 파일의 테스트 1개를 재실행하여 통과했다.

범위에는 회원 인증 허용/거절, 회원 ID 위조 차단, 세션 누락/불일치, 비밀번호 없는 회원 세션, 구매 재시도 시 1회 지급, 코인 중복 사용 방지 및 컨티뉴 관련 회귀가 포함된다. 인증·결제 테스트 대역과 로컬 DB를 사용한 결과이며 운영 계정의 실제 거래 검증과 구분한다.

운영 /health 직접 조회와 브라우저에서 build=nw-ms3-input-lockstep-v72, mode=local-input-lockstep, realInternetVerified=false, realGems=true 응답을 확인했다. 이 응답은 실결제 성공 증거가 아니다.

회원 로그인 없는 브라우저에서 https://ehrlckdqud-cloud.github.io/newtworld-ranking/coop/ 접근 시 회원 확인 실패 안내와 회원식별 링크가 표시되었다.

실행 환경에서 서버 POST 직접 검증은 HTTP 403 및 `error code: 1010` 응답을 받았다. 애플리케이션 JSON 응답이 아니므로 회원 인증 거절 성공으로 계산하지 않았다. 검증 브라우저에는 유효한 회원 로그인이 없어 실제 회원 입장·구매·장부·정산 검증은 수행하지 못했다. 실제 젬 증감이나 보정 집계는 실행하지 않았다.

## 남은 작업과 담당

3번 전체 완료 또는 실제 회원 공개 검증 완료로 간주하지 않는다.

1. Work: 실제 회원의 현재 서버 입장·구매·정산 검증.
2. Cloud: 최신 main에서 클라이언트 비밀번호 모달/호출 제거, 검증 및 Pages 배포.
3. Work: 실제 계정 최종 확인.

현재 main의 coop/newtworld-entry.mjs는 claimSiteSession 후 requestTestAccess를 호출하며 운영진 테스트 비밀번호 문구를 표시한다. coop/test-access.mjs는 비밀번호 모달 입력을 요구한다. 화면 비밀번호 요구와 서버 비밀번호 검사는 별개다. 클라이언트에서 모달을 제거해도 회원 인증·claimSiteSession·세션 헤더·코인 requestId 계약은 유지해야 한다.

과거 후보 25067bc나 이전 체크아웃으로 전체 파일을 덮어쓰지 않는다. 이번 Work 작업에서 ranking 소스·공통 미디어·Pages 및 automation 소스는 변경하지 않았다. 담당 변경은 기존 작업 분담 문서의 인계 절차에 따른다. 본 기록은 다른 대화에 자동 전달되지 않는다.
