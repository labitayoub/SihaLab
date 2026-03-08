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
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  create(@CurrentUser() user: User, @Body() createConsultationDto: CreateConsultationDto) {
    // Infirmier crée la consultation au nom de son médecin
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.consultationsService.create(doctorId, createConsultationDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('patientId') patientId: string,
    @Query('doctorId') doctorId: string,
  ) {
    // Si médecin ou infirmier, filtrer par doctorId automatiquement et retourner avec détails
    if (user.role === UserRole.MEDECIN || user.role === UserRole.INFIRMIER) {
      const effectiveDoctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
      return this.consultationsService.findAllWithDetails(effectiveDoctorId, patientId);
    }
    // Patient voit ses propres consultations avec détails
    if (user.role === UserRole.PATIENT) {
      return this.consultationsService.findAllWithDetails(undefined, user.id);
    }
    return this.consultationsService.findAll(patientId, doctorId);
  }

  @Get('my-patients')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  getMyPatients(@CurrentUser() user: User) {
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.consultationsService.getMyPatients(doctorId);
  }

  @Get('patient/:patientId/history')
  @Roles(UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER)
  getPatientHistory(@Param('patientId') patientId: string) {
    return this.consultationsService.getPatientHistory(patientId);
  }

  @Get('patient/:patientId/dossier')
  @Roles(UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER)
  getDossierMedical(@Param('patientId') patientId: string) {
    return this.consultationsService.getDossierMedical(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  update(@Param('id') id: string, @Body() updateData: Partial<CreateConsultationDto>) {
    return this.consultationsService.update(id, updateData);
  }

  @Post(':id/confirm')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  confirm(@Param('id') id: string) {
    return this.consultationsService.confirmConsultation(id);
  }
}
