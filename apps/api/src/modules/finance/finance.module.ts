import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { PayablesService } from './payables.service';
import { FinanceController } from './finance.controller';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, PayablesService],
  exports: [FinanceService],
})
export class FinanceModule {}
