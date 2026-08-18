import { IsNumber, Max, Min } from 'class-validator';

// Islemin agentId (sahip) tarafina ait pay yuzdesi -- diger taraf
// (collaboratorAgentId) otomatik olarak (100 - bu) alir.
export class UpdateSplitDto {
  @IsNumber({}, { message: 'Paylaşım oranı geçerli bir sayı olmalıdır' })
  @Min(0, { message: 'Paylaşım oranı 0-100 arasında olmalıdır' })
  @Max(100, { message: 'Paylaşım oranı 0-100 arasında olmalıdır' })
  commissionSplitPercentage: number;
}
