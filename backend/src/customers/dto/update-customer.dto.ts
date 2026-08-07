import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

// PartialType, CreateCustomerDto'daki tüm alanları opsiyonel yapar.
// Not: bu paket için backend/package.json'a @nestjs/mapped-types eklenmelidir.
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
