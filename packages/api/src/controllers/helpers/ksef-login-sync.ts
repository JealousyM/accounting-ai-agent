import { credentialsService } from '../../services/credentials.instance';
import { ksefContractorService } from '../../services/ksef/contractor.instance';
import { logger } from '../../utils/logger';

export function scheduleKsefContractorSync(userId: string): void {
  credentialsService.hasWFirmaEnabled(userId).then(enabled => {
    if (!enabled) return;
    ksefContractorService.syncFromWFirma(userId)
      .then(result => logger.info('KSeF contractor sync on login', { userId, synced: result.synced }))
      .catch(err => logger.warn('KSeF contractor sync failed (non-fatal)', { userId, error: (err as Error).message }));
  }).catch(() => {});
}
