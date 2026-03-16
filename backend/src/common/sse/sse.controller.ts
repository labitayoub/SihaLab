import {
  Controller,
  ForbiddenException,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Public } from '../../auth/decorators/public.decorator';
import { SseService } from './sse.service';

type JwtPayload = {
  sub: string;
  role?: string;
};

@Controller('events')
export class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Sse('doctor-status')
  @Public()
  doctorStatusStream(@Query('token') token?: string): Observable<MessageEvent> {
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const role = payload.role?.toLowerCase();
    if (role !== 'medecin' && role !== 'infirmier') {
      throw new ForbiddenException('Access denied to this event stream');
    }

    return this.sseService.streamForDoctor(payload.sub);
  }
}
