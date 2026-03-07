import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { User } from '../entities/user.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  /**
   * POST /schedules/bulk — Médecin définit tous ses horaires de la semaine
   */
  @Post('bulk')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  bulkCreate(@CurrentUser() user: User, @Body() bulkDto: BulkCreateScheduleDto) {
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.schedulesService.bulkCreate(doctorId, bulkDto);
  }

  /**
   * POST /schedules — Médecin ajoute un créneau pour un jour
   */
  @Post()
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  create(@CurrentUser() user: User, @Body() createScheduleDto: CreateScheduleDto) {
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.schedulesService.create(doctorId, createScheduleDto);
  }

  /**
   * GET /schedules/me — Médecin consulte ses propres horaires
   */
  @Get('me')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  findMySchedules(@CurrentUser() user: User) {
    // Infirmier voit les horaires de son médecin
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.schedulesService.findByDoctor(doctorId);
  }

  /**
   * GET /schedules/doctor/:doctorId — N'importe qui peut consulter les horaires d'un médecin
   */
  @Get('doctor/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.schedulesService.findByDoctor(doctorId);
  }

  /**
   * PATCH /schedules/:id — Médecin modifie un de ses créneaux
   */
  @Patch(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.schedulesService.update(id, doctorId, updateScheduleDto);
  }

  /**
   * DELETE /schedules/:id — Médecin supprime un créneau
   */
  @Delete(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const doctorId = user.role === UserRole.INFIRMIER ? user.createdBy : user.id;
    return this.schedulesService.remove(id, doctorId);
  }
}
