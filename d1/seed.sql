-- Local-only dev seed data (mirrors the old prisma/seed.ts). Apply via:
--   npx wrangler d1 execute aicoding --local --file=d1/seed.sql
-- Never run this against --remote; production data is imported separately.

INSERT INTO "Course" ("id", "title") VALUES (1, '실습 교육')
  ON CONFLICT ("id") DO UPDATE SET "title" = excluded."title";

INSERT INTO "Step" ("id", "courseId", "order", "topic", "textContentByTool", "requiresUpload")
VALUES (
  'seed-step-1', 1, 1, '',
  '{"Cursor":"1단계: 개발 환경을 준비합니다.\n\nAI 도구를 실행하고 실습에 사용할 프로젝트 폴더를 엽니다. 준비가 끝나면 화면을 캡처하여 업로드하세요.","GitHub Copilot":"1단계: 개발 환경을 준비합니다.\n\nAI 도구를 실행하고 실습에 사용할 프로젝트 폴더를 엽니다. 준비가 끝나면 화면을 캡처하여 업로드하세요.","Claude":"1단계: 개발 환경을 준비합니다.\n\nAI 도구를 실행하고 실습에 사용할 프로젝트 폴더를 엽니다. 준비가 끝나면 화면을 캡처하여 업로드하세요."}',
  true
) ON CONFLICT ("courseId", "order") DO UPDATE SET "textContentByTool" = excluded."textContentByTool";

INSERT INTO "Step" ("id", "courseId", "order", "topic", "textContentByTool", "requiresUpload")
VALUES (
  'seed-step-2', 1, 2, '',
  '{"Cursor":"2단계: 첫 번째 프롬프트를 작성합니다.\n\nAI 도구에게 간단한 함수를 작성해 달라고 요청하고, 생성된 코드를 확인합니다. 결과 화면을 캡처하여 업로드하세요.","GitHub Copilot":"2단계: 첫 번째 프롬프트를 작성합니다.\n\nAI 도구에게 간단한 함수를 작성해 달라고 요청하고, 생성된 코드를 확인합니다. 결과 화면을 캡처하여 업로드하세요.","Claude":"2단계: 첫 번째 프롬프트를 작성합니다.\n\nAI 도구에게 간단한 함수를 작성해 달라고 요청하고, 생성된 코드를 확인합니다. 결과 화면을 캡처하여 업로드하세요."}',
  true
) ON CONFLICT ("courseId", "order") DO UPDATE SET "textContentByTool" = excluded."textContentByTool";

INSERT INTO "Step" ("id", "courseId", "order", "topic", "textContentByTool", "requiresUpload")
VALUES (
  'seed-step-3', 1, 3, '',
  '{"Cursor":"3단계: 코드를 수정하고 검증합니다.\n\nAI가 생성한 코드를 실행하고, 필요한 경우 수정합니다. 정상 동작하는 결과 화면을 캡처하여 업로드하세요.","GitHub Copilot":"3단계: 코드를 수정하고 검증합니다.\n\nAI가 생성한 코드를 실행하고, 필요한 경우 수정합니다. 정상 동작하는 결과 화면을 캡처하여 업로드하세요.","Claude":"3단계: 코드를 수정하고 검증합니다.\n\nAI가 생성한 코드를 실행하고, 필요한 경우 수정합니다. 정상 동작하는 결과 화면을 캡처하여 업로드하세요."}',
  true
) ON CONFLICT ("courseId", "order") DO UPDATE SET "textContentByTool" = excluded."textContentByTool";
