import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { CreateAnalyseDto } from './dto/create-analyse.dto';
import { UpdateAnalyseResultsDto } from './dto/update-analyse-results.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { AnalyseStatus } from '../entities/analyse.entity';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiTags('Analyses')
@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(private analysesService: AnalysesService) {}

  @Post()
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  create(@Body() createAnalyseDto: CreateAnalyseDto) {
    return this.analysesService.create(createAnalyseDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status: AnalyseStatus,
    @Query('consultationId') consultationId: string,
  ) {
    const labId = user.role === UserRole.LABORATOIRE ? user.id : undefined;
    return this.analysesService.findAll(status, labId, consultationId);
  }

  @Get('patient/me')
  @Roles(UserRole.PATIENT)
  getMyAnalyses(@CurrentUser() user: User) {
    return this.analysesService.getByPatient(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analysesService.findOne(id);
  }

  @Get(':id/debug')
  async debugAnalysis(@Param('id') id: string) {
    const analyse = await this.analysesService.findOne(id);
    return {
      id: analyse.id,
      status: analyse.status,
      resultat: analyse.resultat,
      resultatParsed: analyse.resultat ? JSON.parse(analyse.resultat) : null,
      resultatFileUrl: analyse.resultatFileUrl,
      description: analyse.description,
    };
  }

  @Post(':id/start')
  @Roles(UserRole.LABORATOIRE)
  startAnalysis(@Param('id') id: string, @CurrentUser() user: User) {
    return this.analysesService.startAnalysis(id, user.id);
  }

  @Post(':id/submit-results')
  @Roles(UserRole.LABORATOIRE)
  submitResults(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnalyseResultsDto,
    @CurrentUser() user: User,
  ) {
    return this.analysesService.submitResults(id, user.id, updateDto);
  }

  @Post(':id/upload-resultat')
  @Roles(UserRole.LABORATOIRE)
  uploadResultat(
    @Param('id') id: string,
    @Body('resultat') resultat: string,
    @Body('fileUrl') fileUrl: string,
  ) {
    return this.analysesService.uploadResultat(id, resultat, fileUrl);
  }

  @Patch(':id/status')
  @Roles(UserRole.LABORATOIRE)
  updateStatus(@Param('id') id: string, @Body('status') status: AnalyseStatus, @CurrentUser() user: User) {
    return this.analysesService.updateStatus(id, status, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  update(@Param('id') id: string, @Body() body: { description?: string; labId?: string }) {
    return this.analysesService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  remove(@Param('id') id: string) {
    return this.analysesService.remove(id);
  }
}
