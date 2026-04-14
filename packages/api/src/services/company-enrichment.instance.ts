import { CompanyEnrichmentService } from './company-enrichment.service';
import { wfirmaCacheService } from './wfirma-cache.instance';

export const companyEnrichmentService = new CompanyEnrichmentService(wfirmaCacheService);
