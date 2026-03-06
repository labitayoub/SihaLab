import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentType } from '../common/enums/status.enum';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async create(uploadedBy: string, createDocumentDto: CreateDocumentDto, fileSize: number) {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      uploadedBy,
      fileSize,
    });
    return this.documentRepository.save(document);
  }

  async findAll(patientId?: string, type?: DocumentType) {
    const query = this.documentRepository.createQueryBuilder('document')
      .leftJoinAndSelect('document.patient', 'patient')
      .leftJoinAndSelect('document.uploader', 'uploader');

    if (patientId) {
      query.andWhere('document.patientId = :patientId', { patientId });
    }

    if (type) {
      query.andWhere('document.type = :type', { type });
    }

    return query.orderBy('document.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['patient', 'uploader'],
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async remove(id: string) {
    const document = await this.findOne(id);
    await this.documentRepository.remove(document);
    return { message: 'Document deleted successfully' };
  }
}
