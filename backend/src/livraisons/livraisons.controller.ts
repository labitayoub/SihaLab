import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { LivraisonsService } from './livraisons.service';
import { CreateLivraisonDto } from './dto/create-livraison.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { LivraisonStatus } from '../common/enums/status.enum';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiTags('Livraisons')
@Controller('livraisons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LivraisonsController {
  constructor(private livraisonsService: LivraisonsService) {}

  @Post()
  @Roles(UserRole.PHARMACIEN)
  create(@CurrentUser() user: User, @Body() createLivraisonDto: CreateLivraisonDto, @Body('patientId') patientId: string) {
    return this.livraisonsService.create(user.id, patientId, createLivraisonDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status: LivraisonStatus,
  ) {
    const pharmacieId = user.role === UserRole.PHARMACIEN ? user.id : undefined;
    const patientId = user.role === UserRole.PATIENT ? user.id : undefined;
    return this.livraisonsService.findAll(status, pharmacieId, patientId);
  }

  @Get('patient')
  @Roles(UserRole.PATIENT)
  getMyLivraisons(@CurrentUser() user: User) {
    return this.livraisonsService.findAll(undefined, undefined, user.id);
  }

  @Get('pharmacie')
  @Roles(UserRole.PHARMACIEN)
  getPharmacieLivraisons(@CurrentUser() user: User) {
    return this.livraisonsService.findAll(undefined, user.id, undefined);
  }

  @Get('tracking/:codeSuivi')
  findByCodeSuivi(@Param('codeSuivi') codeSuivi: string) {
    return this.livraisonsService.findByCodeSuivi(codeSuivi);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.livraisonsService.findOne(id);
  }

  @Patch(':id/statut')
  @Roles(UserRole.PHARMACIEN)
  updateStatut(
    @Param('id') id: string,
    @Body('statut') statut: LivraisonStatus,
    @Body('description') description: string,
  ) {
    return this.livraisonsService.updateStatut(id, statut, description);
  }
}
