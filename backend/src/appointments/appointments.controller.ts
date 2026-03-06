import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { AppointmentStatus } from '../common/enums/status.enum';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  create(@CurrentUser() user: User, @Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.id, createAppointmentDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status: AppointmentStatus,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.findAll(status, date, user.id, user.role);
  }

  @Get('doctor/:doctorId/availability')
  getDoctorAvailability(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    return this.appointmentsService.getDoctorAvailability(doctorId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Post(':id/confirm')
  @Roles(UserRole.MEDECIN)
  confirm(@Param('id') id: string) {
    return this.appointmentsService.confirm(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
