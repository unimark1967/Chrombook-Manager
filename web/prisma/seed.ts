import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) { console.error('Влез в приложението първо!'); return; }

  const teacher = await prisma.user.findFirst();
  if (!teacher) { console.error('Няма потребител.'); return; }

  console.log(`Организация: ${org.name}`);
  console.log(`Учител: ${teacher.email}`);

  // Устройства
  const devices = await Promise.all([
    prisma.device.upsert({ where: { serialNumber: 'CB-2024-001' }, update: {}, create: { orgId: org.id, googleDeviceId: 'gdev-001', serialNumber: 'CB-2024-001', status: 'active' } }),
    prisma.device.upsert({ where: { serialNumber: 'CB-2024-002' }, update: {}, create: { orgId: org.id, googleDeviceId: 'gdev-002', serialNumber: 'CB-2024-002', status: 'active' } }),
    prisma.device.upsert({ where: { serialNumber: 'CB-2024-003' }, update: {}, create: { orgId: org.id, googleDeviceId: 'gdev-003', serialNumber: 'CB-2024-003', status: 'offline' } }),
    prisma.device.upsert({ where: { serialNumber: 'CB-2024-004' }, update: {}, create: { orgId: org.id, googleDeviceId: 'gdev-004', serialNumber: 'CB-2024-004', status: 'active' } }),
    prisma.device.upsert({ where: { serialNumber: 'CB-2024-005' }, update: {}, create: { orgId: org.id, googleDeviceId: 'gdev-005', serialNumber: 'CB-2024-005', status: 'offline' } }),
  ]);
  console.log(`Устройства: ${devices.length}`);

  // Класна стая
  const classroom = await prisma.classroom.upsert({
    where: { id: 'classroom-10a' },
    update: {},
    create: { id: 'classroom-10a', name: '10А — Информатика', orgId: org.id, teacherId: teacher.id },
  });
  console.log(`Класна стая: ${classroom.name}`);

  // Сцени
  const s1 = await prisma.scene.upsert({
    where: { id: 'scene-kontrolno' },
    update: {},
    create: { id: 'scene-kontrolno', name: 'Контролно', orgId: org.id, createdBy: teacher.id, isGlobal: true },
  });
  await prisma.sceneRule.deleteMany({ where: { sceneId: s1.id } });
  await prisma.sceneRule.createMany({ data: [
    { sceneId: s1.id, ruleType: 'lock', value: { enabled: true }, priority: 1 },
    { sceneId: s1.id, ruleType: 'url_allow', value: { url: 'docs.google.com' }, priority: 2 },
  ]});

  const s2 = await prisma.scene.upsert({
    where: { id: 'scene-svobodna' },
    update: {},
    create: { id: 'scene-svobodna', name: 'Свободна работа', orgId: org.id, createdBy: teacher.id, isGlobal: false },
  });
  await prisma.sceneRule.deleteMany({ where: { sceneId: s2.id } });
  await prisma.sceneRule.createMany({ data: [
    { sceneId: s2.id, ruleType: 'url_block', value: { url: 'youtube.com' }, priority: 1 },
    { sceneId: s2.id, ruleType: 'url_block', value: { url: 'tiktok.com' }, priority: 2 },
    { sceneId: s2.id, ruleType: 'tab_limit', value: { max: 5 }, priority: 3 },
  ]});

  console.log('Сцени: 2');
  console.log('✓ Готово!');
}

main().catch(console.error).finally(() => prisma.$disconnect());