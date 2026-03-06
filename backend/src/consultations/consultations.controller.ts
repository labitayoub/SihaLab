import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private consultationsService: ConsultationsService) {}

  @Post()
  @Roles(UserRole.MEDECIN)
  create(@CurrentUser() user: User, @Body() createConsultationDto: CreateConsultationDto) {
    return this.consultationsService.create(user.id, createConsultationDto);
  }

  @Get()
  findAll(@Query('patientId') patientId: string, @Query('doctorId') doctorId: string) {
    return this.consultationsService.findAll(patientId, doctorId);
  }

  @Get('patient/:patientId/history')
  @Roles(UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER)
  getPatientHistory(@Param('patientId') patientId: string) {
    return this.consultationsService.getPatientHistory(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.MEDECIN)
  update(@Param('id') id: string, @Body() updateData: Partial<CreateConsultationDto>) {
    return this.consultationsService.update(id, updateData);
  }
}
