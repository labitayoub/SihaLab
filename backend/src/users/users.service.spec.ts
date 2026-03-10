import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MinioService } from '../common/minio/minio.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  // Mock du repository User
  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  // Mock du MinioService
  const mockMinioService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  // Utilisateur de test
  const mockUser: Partial<User> = {
    id: 'user-uuid-123',
    email: 'test@sihatilab.com',
    password: '$2b$10$hashedpassword',
    role: UserRole.PATIENT,
    firstName: 'Test',
    lastName: 'User',
    phone: '0612345678',
    isActive: true,
    emailVerified: true,
  };

  // Mock QueryBuilder
  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: MinioService, useValue: mockMinioService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Reset tous les mocks
    jest.clearAllMocks();
    mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // TESTS : create()
  // ==========================================
  describe('create', () => {
    const createUserDto = {
      email: 'nouveau@sihatilab.com',
      password: 'password123',
      role: UserRole.PATIENT,
      firstName: 'Nouveau',
      lastName: 'Patient',
      phone: '0612345678',
    };

    it('should create a user successfully', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      const savedUser = { ...createUserDto, id: 'new-uuid', password: '$2b$10$hashed', emailVerified: true };
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(createUserDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for role INFIRMIER', async () => {
      const dto = { ...createUserDto, role: UserRole.INFIRMIER };

      await expect(service.create(dto)).rejects.toThrow(ForbiddenException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for role ADMIN', async () => {
      const dto = { ...createUserDto, role: UserRole.ADMIN };

      await expect(service.create(dto)).rejects.toThrow(ForbiddenException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // TESTS : findOne()
  // ==========================================
  describe('findOne', () => {
    it('should return a user without password', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.findOne('user-uuid-123');

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(mockUser.email);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-123' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // TESTS : findAll()
  // ==========================================
  describe('findAll', () => {
    it('should return paginated users without passwords', async () => {
      const users = [
        { ...mockUser, id: '1' },
        { ...mockUser, id: '2', email: 'user2@sihatilab.com' },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      // Vérifie qu'aucun password n'est retourné
      result.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should filter by role when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, UserRole.MEDECIN);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.MEDECIN });
    });

    it('should filter by search when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, undefined, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: '%test%' },
      );
    });
  });

  // ==========================================
  // TESTS : update()
  // ==========================================
  describe('update', () => {
    it('should update a user successfully', async () => {
      const existingUser = { ...mockUser };
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({ ...existingUser, firstName: 'Updated' });

      const result = await service.update('user-uuid-123', { firstName: 'Updated' } as any);

      expect(result).not.toHaveProperty('password');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { firstName: 'X' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // TESTS : remove() (soft delete)
  // ==========================================
  describe('remove', () => {
    it('should deactivate a user (soft delete)', async () => {
      const user = { ...mockUser, isActive: true };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, isActive: false });

      const result = await service.remove('user-uuid-123');

      expect(result).toEqual({ message: 'User deactivated successfully' });
      expect(user.isActive).toBe(false);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // TESTS : findByRole()
  // ==========================================
  describe('findByRole', () => {
    it('should return users of a specific role without passwords', async () => {
      const doctors = [
        { ...mockUser, id: '1', role: UserRole.MEDECIN },
        { ...mockUser, id: '2', role: UserRole.MEDECIN, email: 'dr2@sihatilab.com' },
      ];
      mockUserRepository.find.mockResolvedValue(doctors);

      const result = await service.findByRole(UserRole.MEDECIN);

      expect(result).toHaveLength(2);
      result.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
      expect(mockUserRepository.find).toHaveBeenCalledWith({ where: { role: UserRole.MEDECIN, isActive: true } });
    });
  });

  // ==========================================
  // TESTS : toggleInfirmierActive()
  // ==========================================
  describe('toggleInfirmierActive', () => {
    it('should toggle infirmier active status', async () => {
      const infirmier = { ...mockUser, id: 'inf-1', role: UserRole.INFIRMIER, createdBy: 'medecin-id', isActive: false };
      mockUserRepository.findOne.mockResolvedValue(infirmier);
      mockUserRepository.save.mockResolvedValue({ ...infirmier, isActive: true });

      const result = await service.toggleInfirmierActive('medecin-id', 'inf-1');

      expect(infirmier.isActive).toBe(true); // Toggled
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ForbiddenException if medecin is not the creator', async () => {
      const infirmier = { ...mockUser, id: 'inf-1', role: UserRole.INFIRMIER, createdBy: 'other-medecin' };
      mockUserRepository.findOne.mockResolvedValue(infirmier);

      await expect(service.toggleInfirmierActive('medecin-id', 'inf-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if infirmier not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleInfirmierActive('medecin-id', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
