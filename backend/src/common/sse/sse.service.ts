import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';

type DoctorStatusEvent = {
  doctorId: string;
  type: 'ordonnance.served';
  payload: {
    ordonnanceId: string;
    consultationId?: string;
    servedAt?: string;
    servedBy?: string | null;
  };
  occurredAt: string;
};

@Injectable()
export class SseService {
  private readonly events$ = new Subject<DoctorStatusEvent>();

  streamForDoctor(doctorId: string): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((event) => event.doctorId === doctorId),
      map((event) => ({
        type: 'doctor-status',
        data: event,
      })),
    );
  }

  emitOrdonnanceServed(event: Omit<DoctorStatusEvent, 'type' | 'occurredAt'>) {
    this.events$.next({
      ...event,
      type: 'ordonnance.served',
      occurredAt: new Date().toISOString(),
    });
  }
}
