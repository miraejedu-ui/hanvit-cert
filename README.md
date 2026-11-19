# 한빛인증평가원 (HCAI)

Hanvit Certification & Assessment Institute  
자격증 정보 안내 및 시험 응시 사이트입니다.

- 사이트: [https://hcai.vercel.app](https://hcai.vercel.app)

## 실행 (로컬)

1. Supabase 설정은 [`DEPLOY.md`](./DEPLOY.md) 참고
2. `.env.local`에 Supabase URL / service_role 키 입력

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## 배포

**Vercel + Supabase** — 자세한 순서: [`DEPLOY.md`](./DEPLOY.md)

## 관리자 계정

| 아이디 | 비밀번호 |
|--------|----------|
| seorun05 | hanvit01 |

응시자는 회원가입 후 이용합니다.

## 주요 기능

### 공통
- 자격증 정보 검색 / 주관교육기관별 / 직무능력별 조회
- 응시자격 확인, 공지, 출제기준, 진위확인
- 관리자 1:1 상담

### 응시(예정)자
- 응시자격 자가진단
- 원서 접수 (로그인 필수)
- 마이페이지에서 접수 결과·시험·자격증 확인
- 기간 내 온라인 시험 응시
- 합격 후 자격증 발급 신청, 합격증/수료증 다운로드

### 관리자
- 자가진단 기초정보·자격증·공지·출제기준 등록
- 원서 검토 (응시가능 / 서류보완 / 응시불가)
- 시험 제작·배포 (부정행위 감시, 문제유형, 시간 설정)
- 채점 및 결과 전송
- 합격증·수료증 수동 전송
- 진위확인 정보 등록
