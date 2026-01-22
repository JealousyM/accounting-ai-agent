import { credentialsService } from './credentials.instance';
import { WFirmaServiceFactory } from './wfirma-integration.factory';

export const wfirmaServiceFactory = new WFirmaServiceFactory(credentialsService);
