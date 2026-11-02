# 3번 회원 접근 클라이언트 전환 — 2026-11-02

사용자가 3번 완료를 Work에 지시하여 남은 클라이언트 수정·배포를 Work가 이어받는다. 시작 main은 bd20f2284161414a6676f64b20152ef251001509이며 4번 사진 재사용 변경을 보존한다.

## 변경

- coop/newtworld-entry.mjs: 테스트 비밀번호 요청 제거. profileData 회원 인증과 claimSiteSession 유지. 세션은 1회 확보하며 엔진 로드 성공 후 대기실을 표시한다.
- coop/index.html: 운영진 테스트 비밀번호 모달 제거, 설치 안내를 회원식별 기준으로 변경, entry 모듈 캐시 버전 갱신.
- coop/test-access.mjs: 기존 호출자의 testHeaders 이름은 유지하되 회원 세션 헤더만 반환. 이전 entry와의 호환 함수는 모달 없이 기존 회원 확인 API를 호출한다.
- 좌석 인증, 구매 requestId, 뉴트젬 가격·차감·정산 코드 및 공통 미디어는 변경하지 않는다.

## 검증

JavaScript 구문 검사 및 jsdom 기반 tests/coop-member-entry.cjs 통과. 인증 회원의 비밀번호 없는 입장, 세션 1회 확보, 비회원/미인증/모바일 차단, 중복·만료·검증 불가 세션 차단, 엔진 로드 실패 시 대기실 비노출을 확인했다. 테스트 실행에 jsdom이 필요하며 회원 인증·게임 엔진은 테스트 대역이다.

이전 Work 검증에서 Sites 서버 버전 33의 비밀번호 검사 제거와 배포 성공, 서버 테스트 72개 통과를 확인했다. 해당 상세 증거는 docs/work-cloud-task-boundaries 브랜치의 docs/work-task3-server-verification-20261102.md에 있다.

## 실제 운영 검증

실제 회원 로그인 세션이 없어 정상 회원 입장·코인 구매·장부·정산 실거래 검증은 아직 수행하지 못했다. 이 항목을 완료로 표시하지 않는다. 임의의 회원 인증을 만들거나 실제 젬 잔액을 보정하지 않는다.

배포 결과는 아래에 기록한다.

## 배포 결과

- PR #134: https://github.com/ehrlckdqud-cloud/newtworld-ranking/pull/134
- main 병합 커밋: 15ec23527b288390e7a60ba38eec6cc91a91572d
- Pages 실행 41430681254: completed / success 확인.
- 실행: https://github.com/ehrlckdqud-cloud/newtworld-ranking/actions/runs/41430681254
- 코드 변경 및 배포 완료. 실제 회원 검증은 검증 브라우저에 기존 회원의 일회용 기기 연결이 필요한 상태다. 회원 입장·실거래·정산 검증 완료로 보고하지 않는다.
