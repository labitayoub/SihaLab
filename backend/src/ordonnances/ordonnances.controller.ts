import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdonnancesService } from './ordonnances.service';
import { CreateOrdonnanceDto } from './dto/create-ordonnance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { OrdonnanceStatus } from '../common/enums/status.enum';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiTags('Ordonnances')
@Controller('ordonnances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdonnancesController {
  constructor(private ordonnancesService: OrdonnancesService) {}

  @Post()
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  create(@Body() createOrdonnanceDto: CreateOrdonnanceDto) {
    return this.ordonnancesService.create(createOrdonnanceDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status: OrdonnanceStatus,
  ) {
    const pharmacienId = user.role === UserRole.PHARMACIEN ? user.id : undefined;
    // Infirmier voit les ordonnances du médecin via les consultations
    return this.ordonnancesService.findAll(status, pharmacienId);
  }

  @Get('patient/me')
  @Roles(UserRole.PATIENT)
  getMyOrdonnances(@CurrentUser() user: User) {
    return this.ordonnancesService.getByPatient(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordonnancesService.findOne(id);
  }

  @Post(':id/delivrer')
  @Roles(UserRole.PHARMACIEN)
  delivrer(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordonnancesService.delivrer(id, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  update(@Param('id') id: string, @Body() body: { medicaments?: any[]; pharmacienId?: string }) {
    return this.ordonnancesService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  remove(@Param('id') id: string) {
    return this.ordonnancesService.remove(id);
  }
}