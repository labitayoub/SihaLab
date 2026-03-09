import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorSchedule } from '../entities/doctor-schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private scheduleRepository: Repository<DoctorSchedule>,
  ) {}

  /**
   * Créer ou remplacer les horaires d'un médecin (bulk)
   * Chaque jour peut avoir 2 entrées : morning + afternoon
   */
  async bulkCreate(doctorId: string, bulkDto: BulkCreateScheduleDto) {
    // Valider que endTime > startTime pour chaque entrée
    for (const schedule of bulkDto.schedules) {
      if (schedule.startTime >= schedule.endTime) {
        throw new BadRequestException(
          `L'heure de fin doit être après l'heure de début pour le jour ${schedule.dayOfWeek} (${schedule.period})`,
        );
      }
    }

    // Supprimer les anciens horaires du médecin
    await this.scheduleRepository.delete({ doctorId });

    // Créer les nouveaux horaires
    const schedules = bulkDto.schedules.map((dto) =>
      this.scheduleRepository.create({
        ...dto,
        doctorId,
        slotDuration: dto.slotDuration || 30,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      }),
    );

    return this.scheduleRepository.save(schedules);
  }

  /**
   * Créer un seul créneau horaire pour un médecin
   */
  async create(doctorId: string, createScheduleDto: CreateScheduleDto) {
    if (createScheduleDto.startTime >= createScheduleDto.endTime) {
      throw new BadRequestException("L'heure de fin doit être après l'heure de début");
    }

    // Vérifier s'il existe déjà un horaire pour ce jour + période
    const existing = await this.scheduleRepository.findOne({
      where: { doctorId, dayOfWeek: createScheduleDto.dayOfWeek, period: createScheduleDto.period },
    });

    if (existing) {
      Object.assign(existing, createScheduleDto);
      return this.scheduleRepository.save(existing);
    }

    const schedule = this.scheduleRepository.create({
      ...createScheduleDto,
      doctorId,
    });

    return this.scheduleRepository.save(schedule);
  }

  /**
   * Récupérer tous les horaires d'un médecin
   */
  async findByDoctor(doctorId: string) {
    return this.scheduleRepository.find({
      where: { doctorId, isActive: true },
      order: { dayOfWeek: 'ASC', period: 'ASC' },
    });
  }

  /**
   * Récupérer un horaire par ID
   */
  async findOne(id: string) {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('Horaire non trouvé');
    }
    return schedule;
  }

  /**
   * Mettre à jour un horaire
   */
  async update(id: string, doctorId: string, updateScheduleDto: UpdateScheduleDto) {
    const schedule = await this.findOne(id);
    if (schedule.doctorId !== doctorId) {
      throw new BadRequestException("Vous ne pouvez modifier que vos propres horaires");
    }
    Object.assign(schedule, updateScheduleDto);
    return this.scheduleRepository.save(schedule);
  }

  /**
   * Supprimer un horaire
   */
  async remove(id: string, doctorId: string) {
    const schedule = await this.findOne(id);
    if (schedule.doctorId !== doctorId) {
      throw new BadRequestException("Vous ne pouvez supprimer que vos propres horaires");
    }
    await this.scheduleRepository.remove(schedule);
    return { message: 'Horaire supprimé avec succès' };
  }

  /**
   * Générer les créneaux disponibles à partir d'un horaire du médecin
   */
  generateSlotsFromSchedule(schedule: DoctorSchedule): string[] {
    const slots: string[] = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = schedule.slotDuration;

    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    return slots;
  }

  /**
   * Générer les créneaux pour plusieurs périodes (morning + afternoon)
   */
  generateSlotsFromSchedules(schedules: DoctorSchedule[]): string[] {
    const allSlots: string[] = [];
    for (const schedule of schedules) {
      allSlots.push(...this.generateSlotsFromSchedule(schedule));
    }
    return allSlots.sort();
  }
}
