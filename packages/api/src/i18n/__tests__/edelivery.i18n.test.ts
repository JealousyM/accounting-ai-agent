import { getEDeliveryTranslations } from '../index';

describe('edelivery i18n', () => {
  it('has the alert title in all three locales', () => {
    expect(getEDeliveryTranslations('pl').alertTitle).toBeTruthy();
    expect(getEDeliveryTranslations('en').alertTitle).toBeTruthy();
    expect(getEDeliveryTranslations('ru').alertTitle).toBeTruthy();
  });
  it('falls back to pl for unknown locale', () => {
    // @ts-expect-error testing fallback
    expect(getEDeliveryTranslations('xx').alertTitle).toBe(getEDeliveryTranslations('pl').alertTitle);
  });
});
