import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

interface GoogleAdminConfig {
  serviceAccountKeyPath: string;
  adminEmail: string;
  customerId: string;
}

function getConfig(): GoogleAdminConfig {
  return {
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? './service-account.json',
    adminEmail: process.env.GOOGLE_ADMIN_EMAIL ?? '',
    customerId: process.env.GOOGLE_CUSTOMER_ID ?? '',
  };
}

function buildAdminClient() {
  const config = getConfig();
  const keyPath = path.resolve(config.serviceAccountKeyPath);

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account key not found at: ${keyPath}`);
  }

  const key = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.device.chromeos',
      'https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly',
      'https://www.googleapis.com/auth/chrome.management.policy',
    ],
    subject: config.adminEmail,
  });

  return google.admin({ version: 'directory_v1', auth });
}

function buildChromeManagementClient() {
  const config = getConfig();
  const keyPath = path.resolve(config.serviceAccountKeyPath);
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      'https://www.googleapis.com/auth/chrome.management.policy',
    ],
    subject: config.adminEmail,
  });

  return google.chromemanagement({ version: 'v1', auth });
}

export interface ChromeDevice {
  deviceId: string;
  serialNumber: string;
  status: string;
  orgUnitPath: string;
  annotatedUser?: string;
  lastSync?: string;
  model?: string;
}

/**
 * List Chromebook devices in a given OU.
 */
export async function listDevices(orgUnit?: string): Promise<ChromeDevice[]> {
  const admin = buildAdminClient();
  const config = getConfig();

  const response = await admin.chromeosdevices.list({
    customerId: config.customerId,
    orgUnitPath: orgUnit,
    maxResults: 500,
    projection: 'BASIC',
  });

  return (response.data.chromeosdevices ?? []).map((d) => ({
    deviceId: d.deviceId ?? '',
    serialNumber: d.serialNumber ?? '',
    status: d.status ?? 'unknown',
    orgUnitPath: d.orgUnitPath ?? '/',
    annotatedUser: d.annotatedUser ?? undefined,
    lastSync: d.lastSync ?? undefined,
    model: d.model ?? undefined,
  }));
}

/**
 * Lock a Chromebook device via Admin SDK.
 */
export async function lockDevice(deviceId: string): Promise<void> {
  const admin = buildAdminClient();
  const config = getConfig();

  await admin.chromeosdevices.action({
    customerId: config.customerId,
    resourceId: deviceId,
    requestBody: {
      action: 'disable',
    },
  });
}

/**
 * Unlock (re-enable) a Chromebook device.
 */
export async function unlockDevice(deviceId: string): Promise<void> {
  const admin = buildAdminClient();
  const config = getConfig();

  await admin.chromeosdevices.action({
    customerId: config.customerId,
    resourceId: deviceId,
    requestBody: {
      action: 'reenable',
    },
  });
}

/**
 * Apply a Chrome policy to an OU via the Chrome Management Policy API.
 *
 * @param orgUnit - OU path, e.g. "/Schools/Room101"
 * @param policyNamespace - e.g. "chrome.users.SafeBrowsingEnabled"
 * @param value - policy value object, structure depends on the policy
 */
export async function applyPolicy(
  orgUnit: string,
  policyNamespace: string,
  value: Record<string, unknown>
): Promise<void> {
  const config = getConfig();
  const chromeManagement = buildChromeManagementClient();

  const customerPath = `customers/${config.customerId}`;

  await chromeManagement.customers.policies.orgunits.batchModify({
    customer: customerPath,
    requestBody: {
      orgUnitId: orgUnit,
      requests: [
        {
          policyValue: {
            policySchema: policyNamespace,
            value,
          },
          updateMask: Object.keys(value).join(','),
        },
      ],
    },
  });
}

/**
 * Move a device to a different OU.
 */
export async function moveDeviceToOrgUnit(
  deviceId: string,
  orgUnitPath: string
): Promise<void> {
  const admin = buildAdminClient();
  const config = getConfig();

  await admin.chromeosdevices.moveDevicesToOu({
    customerId: config.customerId,
    orgUnitPath,
    requestBody: {
      deviceIds: [deviceId],
    },
  });
}
