# 메탈슬러그 6 PSP 혼자하기 — 서버 인계 / 배포 차단 조건

**상태: 프런트엔드 초안만 있음. 실제 운영 배포 금지.**

기존 게임 1~5편은 FBNeo 기반이나 6편은 EmulatorJS 4.2.3 + PPSSPP입니다.
기존 코어 및 /api/game-package의 80 MiB 제한에 ISO를 억지로 연결하지 마세요.

## 별도 PSP 실행 호스트
- EmulatorJS 공식 PSP 문서는 **EJS_threads = true** 요구.
- PSP 실행 문서는 HTTPS / COOP: same-origin / COEP: require-corp 조건이 있어야
  crossOriginIsolated === true, SharedArrayBuffer 사용 가능.
- CDN 의 loader.js, wasm, 추가 리소스는 COEP하에 로드 가능한 CORS/CORP 응답이어야 함.
  CDN이 해당 헤더를 제공하지 않으면 관련 런타임은 자체 호스팅 필요.
- 기존 메인 뉴트월드 사이트 전체에 COOP/COEP 헤더를 무작정 추가하지 마세요.
  구글 회원 인증 / 외부 음악 / 소셜 연동이 깨질 수 있습니다.
  격리 가능한 **전용 PSP 실행 문서**(최종적으로 별도 origin/새 창)를 권장합니다.
  현재 프런트 코드는 임시 통합 코드이므로 별도 실행 문서 구성 후 E2E 확인 필요.

## 필요한 서버 API (아직 구현되지 않음)
1. POST /api/psp-package {member:{token,device}, game:'mslug6'}
   - 서버 측 회원·자산 접근 권한 검증 및 rate limit.
   - {game:'mslug6',url:'/api/psp-package/stream/<opaque-ticket>'}
   - URL은 API 서버와 동일 origin, 유효기간 짧은 서명 티켓.
   - 파일은 별도 비공개 저장소에 두고 80 MiB 기존 제한과 독립적으로 HTTP Range 지원.
   - 공개 GitHub나 정적 페이지에 ISO를 커밋하지 않음; 사용 권리 확인 선행.
   - 소비자가 소유한 원본 ISO 로컬 선택 방식은 배포형 다운로드와 별도 설계.
2. POST /api/arcade-entry {member, game:'mslug6', launch:<UUID>}
   - 기존 500젬 차감 처리와 통합하되 (member,game,launch) 기준 멱등성 보장.
   - 정확히 {ok:true,launch,game:'mslug6',cost:500} 응답.
   - 잔액 부족, 회원 재인증, 중복 요청, 네트워크 타임아웃 시 이중 차감 금지.
3. 실행 실패 복구: 결제 승인 후 PPSSPP 로더/코어/게임 실행 실패 시
   서버 검증 가능한 1회성 반환 엔드포인트 또는 미션 시작 확인 기반 차감 확정 필요.
   브라우저 주장만으로 임의 환불하면 악용 가능하므로 서버가 세션/시간/중복을 검증.
   현재 프런트엔드는 실제 미션 시작 신호/환불까지 제공하지 않습니다.

## 프런트 배포 전 확인
- 전용 PSP 실행 문서 / 교차 출처 격리 / 초기 인증 이동 방식 검증
- 최소 Chromium 1P, 미션 1 진입, 키보드 조작, 영상/오디오, 전체화면/ESC
- 500젬 차감 1회, 취소 무차감, 잔액 부족, 다운로드 실패 무차감, 네트워크 재시도 멱등성,
  실행 실패 정산, 종료 후 재입장 신규 500젬
- 회원 재인증 및 다른 탭 충돌 처리
- 정식 6편 로고/게임 사진 에셋 확보 및 이미지 라이선스 확인
- PR #172의 서버 연동 대기 카드 활성화는 이 검증들이 끝난 뒤에만 수행

## 로컬 계약 테스트
`node --test tests/psp-contract.test.mjs`

이 PR은 `feat/mslug5-solo` 기반의 **초안 PR**입니다.
운영 `main` 및 서버에 직접 반영하지 마세요.


## 구현된 서버측 통합 어댑터 (운영 서버 미연결)
`server/psp-integration-adapter.mjs`는 서버 이식용 코드이며 HTTP 서버가 아닙니다.
- `packageManifest`: 회원 검증 후 짧은 수명의 HMAC 서명 파일 접근 티켓 발급
- `resolveTicket`: 서명/만료/회원 일치 확인. 실제 ISO 바이트/Range 스트림은 운영 호스트가 제공
- `arcadeEntry`: 기존 500젬 원자적 장부 차감 함수 `chargeOnce`로 위임하고 결과 검증
- `chargeStatus`: 오류/타임아웃 시 결제 여부 조회용 기능

**필수 서버 주의사항:**
- `chargeOnce` 구현은 DB 고유 제약과 트랜잭션으로 재호출을 한 번만 차감하도록 보장해야 함. 어댑터만으로 멱등성 보장되지 않음.
- /api/psp-package/stream/{ticket} 접근 시, 요청자의 세션을 안전한 HTTP-only 쿠키 또는 서버 세션에 바인딩하여 `resolveTicket`에 전달해야 함. URL 자체만으로 인증을 통과시키지 말 것.
- 서명 티켓은 재사용 방지 / Range 요청 재개 정책과 회원별 접근 제한, 사용 횟수·동시접속 제한이 필요. 이 정책은 서버에서 구현되지 않았음.
- 상태 조회 API는 특정 회원 소유의 launch만 조회할 것.
- 실패 환불은 신뢰 가능한 서버 측 실행 증거가 확보될 때만 진행해야 함.
- API와 전용 격리 호스트의 CORS 및 인증/쿠키 설정은 실제 운영 구성을 보고 결정해야 함.

테스트:
`node --test tests/psp-contract.test.mjs tests/psp-diagnostics-server.test.mjs tests/psp-integration-adapter.test.mjs`
