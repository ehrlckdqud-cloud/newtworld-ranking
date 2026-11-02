# 메탈슬러그3 인원별 체력 적용

2026-11-02 사용자 요청: 첨부 `메탈슬러그3_체력입력_초안(2).xlsx`의 1P/2P 차이를 기준으로 몬스터와 구조물 체력을 확장한다. 수동 3~5인 입력 계획을 대체한다.

## 확정 규칙

- 증가: `H(N) = H1 + (N-1) * (H2-H1)`.
- 동일: 1~5인 동일.
- 감소 예외 `MS3-T444900-I2`: 1인 30, 2~5인 10. 해저 소형 갑각류 이동 자세, 미션3/구간1, HP 저장 PC `0xc9e52`.
- 현재 참가 좌석 수를 기준으로 새 HP 초기화에 적용한다. 일시적 사망/컨티뉴는 인원 감소로 세지 않고, 이탈은 제외한다. 이미 등장한 적의 잔여 HP를 덮어쓰지 않는다.

## 실제 게임 연결

`coop/native/prepare-coop.mjs`에서 기존 ROM 준비 후 `hp-scaling.mjs`를 실행한다. HP 전용 `JSR 0x781e; MOVE.W D0,0x4e(A6)` 157개 지점만 새 래퍼로 연결한다. 공용 reader의 타이밍 등 다른 사용처와 플레이어 체력에는 전역 배율을 적용하지 않는다.

1P/2P 원본 reader를 사용자가 설치한 ROM에서 실행 시 복사하고 모드 선택만 고정해 차이를 계산한다. 저장소에는 ROM 원문을 추가하지 않는다. 원본 호출 opcode, BIOS 빈 공간을 확인하고 불일치 시 로딩을 중단한다. BIOS checksum을 보존한다. 인원 바이트는 BIOS RAM 검사 후 playing 상태에서만 기록한다. 래퍼 생성 소스는 `tests/build-hp-wrapper.py`다.

기존 게임 설치 데이터는 그대로 이용한다. 실행 시 메모리의 ROM에 적용하므로 재설치가 필요하지 않다. 새 hello 버전 `-hp1`으로 구/신 버전 연결을 차단한다. 참가자 전원이 새로고침하고 새 게임으로 시작한다. 기존 스냅샷 게임을 새 버전으로 이어서 실행하는 용도로 검증하지 않았다.

## 데이터 범위와 검증

고정 ID 927행 중 단일 숫자 쌍 882행(증가395/동일486/감소1), 동일 후보 목록 6행, 원래 2P 미확정으로 표시된 직접 상수 저장 39행이다. 행 수는 적 종류 수가 아니다.

- 원본 WASM에서 888개 표/인덱스 × 1~5인 = **4,440건** 대조 통과. 감소 예외도 30/10/10/10/10 확인.
- 후보 목록 6행은 기존 난수 reader를 그대로 사용한다. 후보가 여러 개인 항목은 반복 표본이 원래 목록 안에 있는지 검사한다.
- 39개 직접 상수 저장은 1P/2P 테이블을 읽지 않는 경로다. 32767 등의 판정/특수값까지 배율 처리하지 않고 원래 opcode/상수를 유지한다. 모든 해당 개체의 실전 출현을 확인했다는 의미는 아니다.
- 1~5인 각각 실제 부팅·코인·선택·등장 성공. 각 인원수에서 미션1~5의 통제된 진입 검사 통과, 없는 좌석의 유령 플레이어 없음.
- 표의 0/0 정적 후보 6행은 0을 유지하지만 실제 HP0 개체로 확인한 것은 아니다.

검증 기준은 원본 표와 같은 **difficulty byte 3 / game mode 2**다. 다른 난이도는 검증하지 않았다. 일부 다른 난이도에서 산술 결과가 32767을 넘을 수 있어 그 설정까지 안전하다고 보증하지 않는다. 전체 루트의 모든 몬스터를 눈으로 완주 확인한 검사가 아니라 원본 코어 호출 및 미션 진입 검사다. 검증 결과는 `hp-native-validation.json`에 기록한다.

## 재현

Node에서 다음 환경변수를 지정한다. ROM 및 core.js/core.wasm은 별도 승인된 개발 환경에서 제공하고 저장소에 추가하지 않는다.

```
MS3_ROM_ZIP=/absolute/path/to/authorized-package.zip
MS3_CORE_JS=/absolute/path/to/core.js
MS3_HP_CATALOG=/absolute/path/to/private/photo-data.json
MS3_TEST_OUTPUT=/absolute/path/to/output-directory
node tests/ms3-hp-native.cjs
node tests/ms3-hp-player-count.cjs
```

체력 원자료 카탈로그는 공개 저장소에 포함하지 않는다. 자동 승인 검토가 대규모 분석 데이터의 공개를 거부해, 로컬 원자료를 환경변수로 제공하는 방식으로 변경했다. 실행 코드는 해당 카탈로그 없이 작동한다.

테스트용 JSZip/engine/profile은 저장소의 coop 경로를 사용한다. 실제 공개 배포 상태와 커밋은 PR 및 Pages 실행 결과로 기록한다.


## 공개 배포 확인

2026-11-02: [PR #137](https://github.com/ehrlckdqud-cloud/newtworld-ranking/pull/137) main 병합 완료. 배포 커밋 `bf527597b21bcd30e1cd2e5b4ac716a64183826d`.

[Pages 실행 41445167969](https://github.com/ehrlckdqud-cloud/newtworld-ranking/actions/runs/41445167969): build/deploy success. 공개 주소에서 index.html, newtworld-entry.mjs, play.mjs, native/prepare-coop.mjs, native/five-session.mjs, native/hp-scaling.mjs 여섯 파일을 다시 내려받아 검증한 로컬 파일과 바이트 단위 일치 확인. 구/신 hello 호환성 검사 통과. 재설치 없이 참가자 전원 Ctrl+F5 후 새 게임 시작.

이 배포 확인 메모는 불필요한 재배포를 피하기 위해 기록 브랜치에만 추가했다.
