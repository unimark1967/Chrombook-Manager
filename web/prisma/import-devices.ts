import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();

async function importDevices() {
  console.log('Свързване с Google Admin SDK...');

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly'],
    clientOptions: {
      subject: 'm.s.denchev@yovkovschoolvarna.bg',
    },
  });

  const admin = google.admin({ version: 'directory_v1', auth });

  const org = await prisma.organization.findFirst({
    where: { domain: 'yovkovschoolvarna.bg' },
  });

  if (!org) {
    console.error('Организацията не е намерена! Влез в приложението първо.');
    return;
  }

  console.log(`Организация: ${org.name}`);

  let pageToken: string | undefined;
  let totalImported = 0;
  let totalUpdated = 0;
  let page = 1;

  do {
    console.log(`Зареждане на страница ${page}...`);

    const response = await admin.chromeosdevices.list({
      customerId: 'my_customer',
      maxResults: 100,
      pageToken,
      projection: 'FULL',
    });

    const devices = response.data.chromeosdevices ?? [];
    console.log(`Намерени ${devices.length} устройства`);

    for (const device of devices) {
      if (!device.deviceId || !device.serialNumber) continue;

      const existing = await prisma.device.findFirst({
        where: { googleDeviceId: device.deviceId },
      });

      if (existing) {
        await prisma.device.update({
          where: { id: existing.id },
          data: {
            serialNumber: device.serialNumber,
            status: device.status === 'ACTIVE' ? 'active' : 'offline',
            lastSeen: device.lastSync ? new Date(device.lastSync) : null,
            orgUnitPath: device.orgUnitPath ?? null,
          },
        });
        totalUpdated++;
      } else {
        await prisma.device.create({
          data: {
            orgId: org.id,
            googleDeviceId: device.deviceId,
            serialNumber: device.serialNumber,
            status: device.status === 'ACTIVE' ? 'active' : 'offline',
            lastSeen: device.lastSync ? new Date(device.lastSync) : null,
            orgUnitPath: device.orgUnitPath ?? null,
          },
        });
        totalImported++;
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
    page++;
  } while (pageToken);

  console.log(`\n✓ Импорт завърши!`);
  console.log(`  Нови: ${totalImported}`);
  console.log(`  Обновени: ${totalUpdated}`);
  console.log(`  Общо: ${totalImported + totalUpdated}`);
}

importDevices()
  .catch((err) => {
    console.error('Грешка:', err.message);
    if (err.message?.includes('unauthorized_client')) {
      console.error('Проблем с Domain-wide Delegation!');
    }
  })
  .finally(() => prisma.$disconnect());