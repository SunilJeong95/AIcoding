import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_STEPS = [
  {
    order: 1,
    textContent:
      "1단계: 개발 환경을 준비합니다.\n\nAI 도구를 실행하고 실습에 사용할 프로젝트 폴더를 엽니다. 준비가 끝나면 화면을 캡처하여 업로드하세요.",
  },
  {
    order: 2,
    textContent:
      "2단계: 첫 번째 프롬프트를 작성합니다.\n\nAI 도구에게 간단한 함수를 작성해 달라고 요청하고, 생성된 코드를 확인합니다. 결과 화면을 캡처하여 업로드하세요.",
  },
  {
    order: 3,
    textContent:
      "3단계: 코드를 수정하고 검증합니다.\n\nAI가 생성한 코드를 실행하고, 필요한 경우 수정합니다. 정상 동작하는 결과 화면을 캡처하여 업로드하세요.",
  },
];

async function main() {
  await prisma.course.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, title: "실습 교육" },
  });

  for (const step of SAMPLE_STEPS) {
    await prisma.step.upsert({
      where: { courseId_order: { courseId: 1, order: step.order } },
      update: { textContent: step.textContent },
      create: {
        courseId: 1,
        order: step.order,
        textContent: step.textContent,
      },
    });
  }

  const count = await prisma.step.count({ where: { courseId: 1 } });
  console.log(`Seed complete: Course(id=1) + ${count} steps.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
