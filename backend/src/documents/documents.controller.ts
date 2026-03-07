import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentType } from '../entities/document.entity';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  async upload(
    @CurrentUser() user: User,
    @Body() createDocumentDto: CreateDocumentDto & { fileName: string; mimeType: string; fileSize: number },
  ) {
    const fileUrl = `/uploads/${Date.now()}-${createDocumentDto.fileName}`;
    return this.documentsService.create(
      user.id, 
      { ...createDocumentDto, fileUrl }, 
      createDocumentDto.fileSize
    );
  }

  @Get()
  findAll(@Query('patientId') patientId: string, @Query('type') type: DocumentType) {
    return this.documentsService.findAll(patientId, type);
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.documentsService.findAll(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
