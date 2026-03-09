import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, User } from '../entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create user (Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('create-patient')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER)
  @ApiOperation({ summary: 'Create a patient (Doctor/Infirmier only)' })
  createPatient(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createPatient(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('role') role: UserRole,
    @Query('search') search: string,
  ) {
    return this.usersService.findAll(page, limit, role, search);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: User) {
    const { password, ...result } = user;
    return result;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload avatar' })
  async uploadAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(user.id, file.buffer, file.mimetype);
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Get all doctors' })
  getDoctors() {
    return this.usersService.findByRole(UserRole.MEDECIN);
  }

  @Get('pharmaciens')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pharmaciens filtered by pays/ville' })
  getPharmaciens(
    @Query('pays') pays?: string,
    @Query('ville') ville?: string,
  ) {
    return this.usersService.findByRoleFiltered(UserRole.PHARMACIEN, pays, ville);
  }

  @Get('laboratoires')
  @Roles(UserRole.MEDECIN, UserRole.INFIRMIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get laboratoires filtered by pays/ville' })
  getLaboratoires(
    @Query('pays') pays?: string,
    @Query('ville') ville?: string,
  ) {
    return this.usersService.findByRoleFiltered(UserRole.LABORATOIRE, pays, ville);
  }

  @Get('infirmiers')
  @Roles(UserRole.MEDECIN)
  @ApiOperation({ summary: 'Get infirmiers of current doctor' })
  getInfirmiers(@CurrentUser() user: User) {
    return this.usersService.findInfirmiersByMedecin(user.id);
  }

  @Post('infirmiers')
  @Roles(UserRole.MEDECIN)
  @ApiOperation({ summary: 'Create infirmier for current doctor' })
  createInfirmier(@CurrentUser() user: User, @Body() createUserDto: CreateUserDto) {
    return this.usersService.createInfirmier(user.id, createUserDto);
  }

  @Patch('infirmiers/:id/toggle-active')
  @Roles(UserRole.MEDECIN)
  @ApiOperation({ summary: 'Toggle infirmier active status' })
  toggleInfirmierActive(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.toggleInfirmierActive(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
