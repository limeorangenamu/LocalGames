# Random Defense

웹 전용 스타 유즈맵식 랜덤 디펜스 게임의 토대 프로젝트입니다.

## 기술 스택

- Vite
- TypeScript
- Phaser 3
- Vite 서버 API 기반 공유 랭킹 저장

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 표시되는 주소로 접속하면 됩니다. 같은 학원 네트워크에서 보여주려면 실행 PC의 IP와 Vite 포트 `3001`을 이용하면 됩니다.

예시:

```text
http://192.168.x.x:3001
```

같은 서버 주소로 접속한 사람들은 `data/rankings.json`에 저장되는 같은 랭킹을 봅니다.

## 현재 들어간 기능

- 닉네임 입력 및 로컬 저장
- 메인화면 서버 공유 랭킹 TOP 10
- 정사각형 몬스터 순환 경로
- 내부 정사각형 유닛 자유 배치판
- 랜덤 소환
- 소환 확률 업그레이드
- 시너지별 공격력 업그레이드
- 같은 유닛 3마리 선택 합성
- 선택 유닛 판매
- 좌클릭 단일 선택
- 드래그 다중 선택
- 더블클릭 같은 유닛 전체 선택
- 우클릭 이동
- 이동 표시 이펙트
- A키 공격 지정 모드
- 보스 제한시간 패배 조건
- 몬스터 100마리 이상 누적 시 라이프 감소
- P/Space 일시정지
- 시너지별 딜량 TOP 3 기록

## 조작법

| 조작 | 기능 |
|---|---|
| 좌클릭 | 유닛 선택 |
| 드래그 | 영역 안 유닛 전체 선택 |
| 더블클릭 | 같은 유닛 전체 선택 |
| 우클릭 | 선택 유닛 이동 |
| A + 적 좌클릭 | 집중 공격 지정 |
| ESC | 선택 해제 / 공격 지정 취소 |
| P 또는 Space | 일시정지 / 재개 |

## 주요 파일

```text
src/main.ts
src/scenes/MenuScene.ts
src/scenes/GameScene.ts
src/game/balance.ts
src/game/types.ts
src/game/utils.ts
src/game/storage.ts
CODEX_HANDOFF.md
```

## 개발 방향

이 프로젝트는 최종 완성본이 아니라 Codex가 이어받기 좋은 `작동 가능한 토대`입니다. 다음 단계는 `CODEX_HANDOFF.md`를 기준으로 개선하면 됩니다.
