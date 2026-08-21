# 로컬 오목 게임

학원 같은 같은 와이파이/LAN 환경에서 여러 사람이 브라우저로 접속해 오목을 둘 수 있는 간단한 실시간 게임입니다.

## 사용 기술

- Node.js
- Express
- Socket.IO
- HTML/CSS/JavaScript

## 실행 방법

### 1. Node.js 설치 확인

터미널에서 아래 명령어를 입력합니다.

```bash
node -v
npm -v
```

Node.js가 없다면 Node.js LTS 버전을 설치하세요.

### 2. 프로젝트 폴더에서 패키지 설치

```bash
npm install
```

### 3. 서버 실행

```bash
npm start
```

성공하면 아래와 비슷하게 나옵니다.

```bash
Omok server running on http://localhost:3000
Other devices on the same Wi-Fi/LAN can connect with http://YOUR_PC_IP:3000
```

### 4. 접속

서버를 실행한 컴퓨터에서는 아래 주소로 접속합니다.

```text
http://localhost:3000
```

같은 네트워크에 있는 다른 사람은 서버 컴퓨터의 IP 주소로 접속합니다.

```text
http://서버PC_IP:3000
```

예시:

```text
http://192.168.0.23:3000
```

## 서버 PC의 IP 확인 방법

Windows 명령 프롬프트에서:

```bash
ipconfig
```

`IPv4 주소`를 찾으면 됩니다.

예시:

```text
IPv4 주소 . . . . . . . . . : 192.168.0.23
```

## 규칙

- 15 x 15 오목판입니다.
- 먼저 참가한 사람은 흑돌, 두 번째 참가자는 백돌입니다.
- 세 번째 사람부터는 관전자가 됩니다.
- 흑돌부터 시작합니다.
- 가로, 세로, 대각선 중 5개 이상 이어지면 승리합니다.
- 플레이어가 나가면 게임판은 초기화됩니다.

## IntelliJ에서 실행하기

1. IntelliJ에서 이 폴더를 Open합니다.
2. 하단 Terminal을 엽니다.
3. `npm install` 입력
4. `npm start` 입력
5. 브라우저에서 `http://localhost:3000` 접속

## 파일 구조

```text
omok-local/
├─ server.js
├─ package.json
├─ README.md
└─ public/
   ├─ index.html
   ├─ style.css
   └─ client.js
```
