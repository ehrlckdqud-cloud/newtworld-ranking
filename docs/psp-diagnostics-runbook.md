# 메탈슬러그 6 PSP 진단 실행

**현재는 개발·진단 전용이며, 뉴트월드 운영 사이트에 배포된 게임이 아닙니다.**

## PC에서 PSP 실행 환경 검증

1. Node.js 22 이상을 준비합니다.
2. 저장소를 다운로드하거나 체크아웃합니다.
3. 프로젝트 루트에서 `node tools/psp-diagnostics-server.mjs` 실행.
4. Chromium/Edge/Firefox에서 `http://127.0.0.1:4176/psp/` 열기.
5. 직접 이용 권한이 있는 PSP ISO를 선택하고 **환경 검사 → PSP 실행 테스트**를 누릅니다.

ISO는 브라우저 안에서만 Blob URL로 읽으며 이 서버로 전송되지 않습니다. 젬 결제, 회원 인증 또는 게임 ISO 배포 API를 일절 제공하지 않습니다.

## 기술적 제한

- 개발 서버는 localhost 전용이며 실제 외부 서비스 제공용 TLS/인증/리버스 프록시가 없습니다.
- PSP 코어는 `EJS_threads=true`와 `SharedArrayBuffer`를 요구하므로 별도 격리 페이지에 COOP/COEP 헤더를 설정했습니다.
- 외부 CDN의 EmulatorJS 코어/워커 파일이 COEP에 의해 차단될 수 있습니다. 이 경우 CDN 응답 헤더 검증 뒤 적절한 권리와 라이선스에 따라 EmulatorJS 런타임을 격리 호스트에 자체 호스팅해야 합니다.
- 진단 페이지에서 게임 시작 콜백이 발생해도 **미션 1, 영상, 음향, 키 입력** 정상 동작을 보장하지 않습니다.
- PSP용 500젬 유료 입장 기능과 개인/서버 ROM 스트리밍 연결은 구현되지 않았습니다.

## 계약 및 서버 테스트

```sh
node --test tests/psp-contract.test.mjs tests/psp-diagnostics-server.test.mjs
```

운영 배포 전 체크리스트는 `docs/psp-mslug6-handoff.md`를 참고하세요.
