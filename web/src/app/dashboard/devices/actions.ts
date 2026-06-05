'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function moveDevicesToOU(deviceIds: string[], ouPath: string) {
  await prisma.device.updateMany({
    where: { id: { in: deviceIds } },
    data: { orgUnitPath: ouPath },
  });
  revalidatePath('/dashboard/devices');
  return { message: `${deviceIds.length} устройства преместени в ${ouPath}` };
}