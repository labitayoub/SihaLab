import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const forbiddenRoles = [UserRole.INFIRMIER, UserRole.ADMIN];
    if (forbiddenRoles.includes(createUserDto.role as UserRole)) {
      throw new ForbiddenException(
        'Impossible de créer un compte avec ce rôle. Les infirmiers doivent être créés par un médecin.',
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      emailVerified: true,
    });
    await this.userRepository.save(user);
    const { password, ...result } = user;
    return result;
  }

  async findAll(page = 1, limit = 20, role?: UserRole, search?: string) {
    const currentPage = Number(page) || 1;
    const currentLimit = Number(limit) || 20;
    const query = this.userRepository.createQueryBuilder('user');

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (search) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await query
      .skip((currentPage - 1) * currentLimit)
      .take(currentLimit)
      .getManyAndCount();

    return {
      data: users.map(({ password, ...user }) => user),
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  async findByRole(role: UserRole) {
    const users = await this.userRepository.find({ 
      where: { role, isActive: true } 
    });
    return users.map(({ password, ...user }) => user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);
    const { password, ...result } = user;
    return result;
  }

  async createInfirmier(medecinId: string, createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      role: UserRole.INFIRMIER,
      password: hashedPassword,
      emailVerified: true,
      isActive: false,
      createdBy: medecinId,
    });
    await this.userRepository.save(user);
    const { password, ...result } = user;
    return result;
  }

  async findInfirmiersByMedecin(medecinId: string) {
    const infirmiers = await this.userRepository.find({
      where: { role: UserRole.INFIRMIER, createdBy: medecinId },
    });
    return infirmiers.map(({ password, ...user }) => user);
  }

  async toggleInfirmierActive(medecinId: string, infirmierId: string) {
    const infirmier = await this.userRepository.findOne({ where: { id: infirmierId } });
    if (!infirmier) {
      throw new NotFoundException('Infirmier not found');
    }
    if (infirmier.createdBy !== medecinId) {
      throw new ForbiddenException('Vous ne pouvez gérer que vos propres infirmiers');
    }
    infirmier.isActive = !infirmier.isActive;
    await this.userRepository.save(infirmier);
    const { password, ...result } = infirmier;
    return result;
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = false;
    await this.userRepository.save(user);
    return { message: 'User deactivated successfully' };
  }
}
