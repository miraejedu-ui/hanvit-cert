# Vercel + Supabase 배포 가이드

PC가 꺼져 있어도 동작하고, 원서·시험·파일 데이터가 유지됩니다.

## 1. Supabase 프로젝트 만들기

1. [https://supabase.com](https://supabase.com) 가입/로그인
2. **New project** 생성 (이름 예: `hanvit`, 비밀번호 저장)
3. 프로젝트 생성 완료 대기

## 2. 테이블 만들기

1. 왼쪽 **SQL Editor** → **New query**
2. 이 저장소의 `supabase/schema.sql` 내용 **전체 복사 → 붙여넣기 → Run**
3. 에러 없이 Success 확인

## 3. Storage 버킷 만들기

1. 왼쪽 **Storage** → **New bucket**
2. Name: `uploads` (정확히 이 이름)
3. **Public bucket**: 끄기 (Private)
4. Create

## 4. API 키 복사

1. **Project Settings** → **API**
2. 아래 두 값을 메모
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`  
     ⚠️ `anon` 키가 아니라 **service_role** 키입니다.

## 5. 로컬에서 먼저 확인 (선택)

프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키
```

```bash
npm install
npm run dev
```

로그인: 아이디 `seorun05` / 비밀번호 `hanvit01`  
(첫 접속 시 관리자 계정이 자동 생성됩니다)

## 6. GitHub에 코드 푸시

```bash
git add .
git commit -m "Supabase + Vercel 연동"
git push
```

`.env.local` 은 절대 커밋하지 마세요. (`.gitignore`에 포함됨)

## 7. Vercel 배포

1. [https://vercel.com](https://vercel.com) → GitHub으로 로그인
2. **Add New… → Project** → 저장소 선택
3. Framework: Next.js (자동 감지)
4. **Environment Variables**에 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Deploy**

완료되면 `https://프로젝트명.vercel.app` 주소가 생깁니다.

## 8. 이후 업데이트

코드 수정 후 `git push` 하면 Vercel이 자동 재배포합니다.

## 관리자 계정

| 아이디 | 비밀번호 |
|--------|----------|
| seorun05 | hanvit01 |
