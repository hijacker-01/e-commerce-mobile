import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

const PUBLIC_URL =
  process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;

// Owner/employee image uploads — saved to ./uploads, served at /uploads/<name>.
@Roles(Role.OWNER, Role.EMPLOYEE)
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!/^image\//.test(file.mimetype)) {
          cb(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `${PUBLIC_URL}/uploads/${file.filename}` };
  }
}
