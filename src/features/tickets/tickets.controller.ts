import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';


@ApiTags('Support Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiStandardResponse()
  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  create(@CurrentUser() actor: JwtAccessPayload, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(actor, dto);
  }

  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List support tickets with filters' })
  list(@CurrentUser() actor: JwtAccessPayload, @Query() dto: QueryTicketsDto) {
    return this.ticketsService.list(actor, dto);
  }

  @ApiStandardResponse()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific support ticket by ID' })
  getOne(@CurrentUser() actor: JwtAccessPayload, @Param('id') id: string) {
    return this.ticketsService.getOne(actor, id);
  }

  @ApiStandardResponse()
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a support ticket' })
  update(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(actor, id, dto);
  }

  @ApiStandardResponse()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/Cancel a support ticket' })
  remove(@CurrentUser() actor: JwtAccessPayload, @Param('id') id: string) {
    return this.ticketsService.remove(actor, id);
  }
}
