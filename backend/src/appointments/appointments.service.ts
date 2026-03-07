import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { DoctorSchedule } from '../entities/doctor-schedule.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus } from '../common/enums/status.enum';
import { SchedulesService } from '../schedules/schedules.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(DoctorSchedule)
    private scheduleRepository: Repository<DoctorSchedule>,
    private schedulesService: SchedulesService,
  ) {}

  async create(patientId: string, createAppointmentDto: CreateAppointmentDto) {
    const { doctorId, date, time } = createAppointmentDto;

    // 0. Vérifier que le patient n'a pas déjà un RDV actif avec ce médecin
    const existingActive = await this.appointmentRepository.findOne({
      where: [
        { patientId, doctorId, status: AppointmentStatus.EN_ATTENTE },
        { patientId, doctorId, status: AppointmentStatus.CONFIRME },
      ],
    });

    if (existingActive) {
      throw new BadRequestException(
        'Vous avez déjà un rendez-vous en cours avec ce médecin. Veuillez attendre qu\'il soit terminé ou annulé avant d\'en prendre un nouveau.',
      );
    }

    // 1. Vérifier la disponibilité du médecin ce jour-là
    const availability = await this.getDoctorAvailability(doctorId, date);

    if (availability.availableSlots.length === 0) {
      throw new BadRequestException(
        'Le médecin n\'est pas disponible ce jour-là',
      );
    }

    // 2. Vérifier que le créneau demandé fait partie des créneaux disponibles
    if (!availability.availableSlots.includes(time)) {
      throw new BadRequestException(
        'Ce créneau n\'est pas disponible. Veuillez choisir parmi les créneaux disponibles.',
      );
    }

    const appointment = this.appointmentRepository.create({
      ...createAppointmentDto,
      patientId,
      date: new Date(date),
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
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam

    // 1. Récupérer tous les horaires du médecin pour ce jour (matin + après-midi)
    const daySchedules = await this.scheduleRepository.find({
      where: { doctorId, dayOfWeek, isActive: true },
      order: { period: 'ASC' },
    });

    if (daySchedules.length === 0) {
      return {
        date,
        dayOfWeek,
        hasSchedule: false,
        availableSlots: [],
        bookedSlots: [],
        morningSlots: [],
        afternoonSlots: [],
        schedule: null,
      };
    }

    // 2. Générer tous les créneaux pour toutes les périodes
    const allSlots = this.schedulesService.generateSlotsFromSchedules(daySchedules);

    // 3. Récupérer les RDV déjà pris (EN_ATTENTE ou CONFIRME)
    const appointments = await this.appointmentRepository.find({
      where: {
        doctorId,
        date: new Date(date),
        status: In([AppointmentStatus.CONFIRME, AppointmentStatus.EN_ATTENTE]),
      },
    });

    const bookedSlots = appointments.map((apt) => apt.time);

    // Filtrer les créneaux déjà passés si la date demandée est aujourd'hui
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = date === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isPast = (slot: string): boolean => {
      if (!isToday) return false;
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m <= currentMinutes;
    };

    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot) && !isPast(slot));

    // 4. Séparer les créneaux par période pour l'affichage frontend
    const morningSchedule = daySchedules.find((s) => s.period === 'morning');
    const afternoonSchedule = daySchedules.find((s) => s.period === 'afternoon');

    const morningAllSlots = morningSchedule
      ? this.schedulesService.generateSlotsFromSchedule(morningSchedule)
      : [];
    const afternoonAllSlots = afternoonSchedule
      ? this.schedulesService.generateSlotsFromSchedule(afternoonSchedule)
      : [];

    return {
      date,
      dayOfWeek,
      hasSchedule: true,
      availableSlots,
      bookedSlots,
      morningSlots: morningAllSlots.filter((s) => !bookedSlots.includes(s) && !isPast(s)),
      afternoonSlots: afternoonAllSlots.filter((s) => !bookedSlots.includes(s) && !isPast(s)),
      schedule: {
        morning: morningSchedule
          ? { startTime: morningSchedule.startTime, endTime: morningSchedule.endTime, slotDuration: morningSchedule.slotDuration }
          : null,
        afternoon: afternoonSchedule
          ? { startTime: afternoonSchedule.startTime, endTime: afternoonSchedule.endTime, slotDuration: afternoonSchedule.slotDuration }
          : null,
      },
    };
  }

  async remove(id: string) {
    const appointment = await this.findOne(id);
    await this.appointmentRepository.remove(appointment);
    return { message: 'Appointment deleted successfully' };
  }
}
