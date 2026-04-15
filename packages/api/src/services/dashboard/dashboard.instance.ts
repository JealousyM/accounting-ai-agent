/**
 * Dashboard Service Singleton Instance
 */

import { DashboardService } from './dashboard.service';
import { wfirmaServiceFactory } from '../wfirma-integration-factory.instance';
import { ksefService } from '../ksef/ksef.instance';

export const dashboardService = new DashboardService(
  wfirmaServiceFactory,
  ksefService,
);
