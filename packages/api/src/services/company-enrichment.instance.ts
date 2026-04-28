import { CompanyEnrichmentService } from './company-enrichment.service';
import { wfirmaCacheService } from './wfirma-cache.instance';
import { gusService } from './gus/gus.instance';

export const companyEnrichmentService = new CompanyEnrichmentService(wfirmaCacheService, gusService);
