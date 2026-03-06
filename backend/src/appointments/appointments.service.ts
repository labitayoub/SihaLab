import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus } from '../common/enums/status.enum';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
  ) {}

  async create(patientId: string, createAppointmentDto: CreateAppointmentDto) {
    // Check for conflicts
    const existingAppointment = await this.appointmentRepository.findOne({
      where: {
        doctorId: createAppointmentDto.doctorId,
        date: new Date(createAppointmentDto.date),
        time: createAppointmentDto.time,
        status: AppointmentStatus.CONFIRME,
      },
    });

    if (existingAppointment) {
      throw new BadRequestException('Time slot already booked');
    }

    const appointment = this.appointmentRepository.create({
      ...createAppointmentDto,
      patientId,
      date: new Date(createAppointmentDto.date),
    });

    return this.appointmentRepository.save(appointment);
  }

  async findAll(status?: AppointmentStatus, date?: string, userId?: string, userRole?: string) {
    const query = this.appointmentRepository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor');

    if (status) {
      query.andWhere('appointment.status = :status', { status });
    }

    if (date) {
      query.andWhere('appointment.date = :date', { date });
    }

    if (userId && userRole === 'patient') {
      query.andWhere('appointment.patientId = :userId', { userId });
    }

    if (userId && userRole === 'medecin') {
      query.andWhere('appointment.doctorId = :userId', { userId });
    }

    return query.orderBy('appointment.date', 'ASC').addOrderBy('appointment.time', 'ASC').getMany();
  }

  async findOne(id: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    const appointment = await this.findOne(id);
    Object.assign(appointment, updateAppointmentDto);
    return this.appointmentRepository.save(appointment);
  }

  async confirm(id: string) {
    return this.update(id, { status: AppointmentStatus.CONFIRME });
  }

  async cancel(id: string) {
    return this.update(id, { status: AppointmentStatus.ANNULE });
  }

  async getDoctorAvailability(doctorId: string, date: string) {
    const appointments = await this.appointmentRepository.find({
      where: {
        doctorId,
        date: new Date(date),
        status: AppointmentStatus.CONFIRME,
      },
    });

    const bookedSlots = appointments.map(apt => apt.time);
    const allSlots = this.generateTimeSlots();
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    return { date, availableSlots, bookedSlots };
  }

  private generateTimeSlots(): string[] {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  async remove(id: string) {
    const appointment = await this.findOne(id);
    await this.appointmentRepository.remove(appointment);
    return { message: 'Appointment deleted successfully' };
  }
}
