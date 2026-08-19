import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChequeNote } from './cheque-note.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { ChequeNotesService } from './cheque-notes.service';
import { ChequeNotesController } from './cheque-notes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChequeNote, BankTransaction])],
  providers: [ChequeNotesService],
  controllers: [ChequeNotesController],
  exports: [ChequeNotesService],
})
export class ChequeNotesModule {}
