import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('properties')
@UseGuards(JwtAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Post()
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: CurrentUserPayload) {
    return this.portfoliosService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('propertyType') propertyType?: string,
    @Query('listingType') listingType?: string,
    @Query('status') status?: string,
    @Query('district') district?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minArea') minArea?: string,
    @Query('maxArea') maxArea?: string,
    @Query('agentId') agentId?: string,
    @Query('scope') scope?: string,
    @Query('rooms') rooms?: string,
    @Query('minBuildingAge') minBuildingAge?: string,
    @Query('maxBuildingAge') maxBuildingAge?: string,
    @Query('heatingType') heatingType?: string,
    @Query('view') view?: string,
    @Query('hasPool') hasPool?: string,
    @Query('hasGym') hasGym?: string,
    @Query('hasSecurity') hasSecurity?: string,
    @Query('hasParking') hasParking?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.portfoliosService.findAll(
      {
        search, propertyType, listingType, status, district, minPrice, maxPrice, minArea, maxArea, agentId, scope,
        rooms, minBuildingAge, maxBuildingAge, heatingType, view, hasPool, hasGym, hasSecurity, hasParking, keyword,
      },
      user,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.portfoliosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.portfoliosService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.portfoliosService.remove(id, user);
  }
}
