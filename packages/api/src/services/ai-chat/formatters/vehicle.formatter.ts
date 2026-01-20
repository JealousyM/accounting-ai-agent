/**
 * Vehicle Data Formatter
 * Formats vehicle information for AI responses (localized)
 */

import { WFirmaVehicle } from '../../../types/wfirma.types';
import { getVehicleTranslations, Locale } from '../../../i18n';

/**
 * Format vehicle type for display
 */
export function formatVehicleType(type: string, locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);
  switch (type) {
    case 'truck':
      return t.typeTruck;
    case 'car':
      return t.typeCar;
    case 'motor':
      return t.typeMotor;
    case 'motor-bike':
      return t.typeMotorBike;
    default:
      return type;
  }
}

/**
 * Format ownership for display
 */
export function formatOwnership(ownership: string, locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);
  switch (ownership) {
    case 'leasing':
      return t.ownershipLeasing;
    case 'private':
      return t.ownershipPrivate;
    case 'other':
      return t.ownershipOther;
    default:
      return ownership;
  }
}

/**
 * Format truck type for display
 */
export function formatTruckType(type: string | undefined, locale: Locale = 'pl'): string {
  if (!type) return '-';
  const t = getVehicleTranslations(locale);
  switch (type) {
    case 'normal':
      return t.truckTypeNormal;
    case 'quasi':
      return t.truckTypeQuasi;
    default:
      return type;
  }
}

/**
 * Format tax purpose for display
 */
export function formatTaxPurpose(purpose: string | undefined, locale: Locale = 'pl'): string {
  if (!purpose) return '-';
  const t = getVehicleTranslations(locale);
  switch (purpose) {
    case 'mixed':
      return t.taxPurposeMixed;
    case 'company':
      return t.taxPurposeCompany;
    default:
      return purpose;
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | undefined, locale: Locale = 'pl'): string {
  if (!date) return '-';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Format number for display
 */
export function formatNumber(num: number | undefined): string {
  if (num === undefined) return '-';
  return num.toFixed(2);
}

/**
 * Format list of vehicles
 */
export function formatVehiclesList(vehicles: WFirmaVehicle[], locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);

  if (vehicles.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.vehiclesTitle} (${vehicles.length})\n\n`;
  result += `| # | ${t.name} | ${t.register} | ${t.type} | ${t.ownership} | ${t.taxPurpose} |\n`;
  result += '|---|------|----------|------|-----------|-------------|\n';

  vehicles.forEach((v, i) => {
    result += `| ${i + 1} | **${v.name}** | ${v.register} | ${formatVehicleType(v.type, locale)} | ${formatOwnership(v.ownership, locale)} | ${formatTaxPurpose(v.taxPurpose, locale)} |\n`;
  });

  result += `\n> ${t.updateDeleteHint}`;

  return result;
}

/**
 * Format vehicle details
 */
export function formatVehicleDetails(vehicle: WFirmaVehicle, locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);

  let result = `## ${t.vehicleDetails}: ${vehicle.name}\n\n`;

  // Basic info
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.id}** | \`${vehicle.id}\` |\n`;
  result += `| **${t.name}** | ${vehicle.name} |\n`;
  result += `| **${t.register}** | ${vehicle.register} |\n`;
  result += `| **${t.type}** | ${formatVehicleType(vehicle.type, locale)} |\n`;
  result += `| **${t.ownership}** | ${formatOwnership(vehicle.ownership, locale)} |\n`;
  result += `| **${t.truckType}** | ${formatTruckType(vehicle.truckType, locale)} |\n`;
  result += `| **${t.taxPurpose}** | ${formatTaxPurpose(vehicle.taxPurpose, locale)} |\n`;

  // Leasing info (if applicable)
  if (vehicle.ownership === 'leasing' || vehicle.vatLeasingDate || vehicle.vatLeasingValue !== undefined) {
    result += `\n### ${t.leasingInfo}\n\n`;
    result += `| ${t.field} | ${t.value} |\n`;
    result += '|------|----------|\n';
    result += `| **${t.vatLeasingBelowLimit}** | ${vehicle.vatLeasingBelowLimit ? t.yes : t.no} |\n`;
    result += `| **${t.vatLeasingDate}** | ${formatDate(vehicle.vatLeasingDate, locale)} |\n`;
    result += `| **${t.vatLeasingValue}** | ${formatNumber(vehicle.vatLeasingValue)} PLN |\n`;
  }

  return result;
}

/**
 * Format vehicle creation confirmation
 */
export function formatVehicleCreated(vehicle: WFirmaVehicle, locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);
  return `## ✅ ${t.created}

${formatVehicleDetails(vehicle, locale)}

> ${t.createdHint}`;
}

/**
 * Format vehicle update confirmation
 */
export function formatVehicleUpdated(vehicle: WFirmaVehicle, locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);
  return `## ✅ ${t.updated}

${formatVehicleDetails(vehicle, locale)}

> ${t.updatedHint}`;
}

/**
 * Format vehicle deletion confirmation
 */
export function formatVehicleDeleted(vehicle: WFirmaVehicle, locale: Locale = 'pl'): string {
  const t = getVehicleTranslations(locale);
  return `## ❌ ${t.deleted}

- **${t.id}:** \`${vehicle.id}\`
- **${t.name}:** ${vehicle.name}
- **${t.register}:** ${vehicle.register}

> ⚠️ ${t.deletedWarning}`;
}
