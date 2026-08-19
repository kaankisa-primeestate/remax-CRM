import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

// Broker, o ayin net karini KENDI hesaplayip (muhasebesine gore) buraya
// TEK bir rakam olarak girer -- sistem "gercek muhasebe kari"ni otomatik
// hesaplamaya CALISMAZ (bu, gercek bir isletmede cok fazla nuans
// icerdigi icin hataya acik olurdu). Sistemin isi SADECE bu rakami
// ortaklarin hisselerine dogru sekilde bolustur mektir.
export class DistributeProfitDto {
  @IsNotEmpty()
  @IsString()
  period: string; // 'YYYY-MM'

  @IsNumber()
  netProfitAmount: number;
}
