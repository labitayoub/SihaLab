import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../entities/user.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  // Mock du repository User
  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  // Mock du JwtService
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  // Mock du ConfigService
  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset tous les mocks avant chaque test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // TESTS : register()
  // ==========================================
  describe('register', () => {
    const registerDto = {
      email: 'nouveau@sihatilab.com',
      password: 'password123',
      role: UserRole.PATIENT,
      firstName: 'Nouveau',
      lastName: 'Patient',
      phone: '0698765432',
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // Pas d'utilisateur existant
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      mockUserRepository.create.mockReturnValue({ ...registerDto, id: 'new-uuid', password: '$2b$10$hashed' });
      mockUserRepository.save.mockResolvedValue({ ...registerDto, id: 'new-uuid', password: '$2b$10$hashed' });

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: 'User registered successfully',
        userId: 'new-uuid',
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser); // Email déjà existant

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for blocked role: infirmier', async () => {
      const dtoWithBlockedRole = { ...registerDto, role: UserRole.INFIRMIER };

      await expect(service.register(dtoWithBlockedRole as any)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for blocked role: admin', async () => {
      const dtoWithBlockedRole = { ...registerDto, role: UserRole.ADMIN };

      await expect(service.register(dtoWithBlockedRole as any)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // TESTS : login()
  // ==========================================
  describe('login', () => {
    const loginDto = { email: 'test@sihatilab.com', password: 'password123' };

    it('should login successfully and return tokens', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token-123')   // accessToken
        .mockReturnValueOnce('refresh-token-456');  // refreshToken

      const result = await service.login(loginDto);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user).not.toHaveProperty('password'); // password exclue
      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-456');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Mauvais mot de passe

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ==========================================
  // TESTS : refresh()
  // ==========================================
  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('invalid'); });

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'non-existent-id' });
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
