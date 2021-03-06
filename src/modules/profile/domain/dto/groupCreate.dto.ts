import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDefined,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupCreateDto {
  public static from(dto: GroupCreateDto): GroupCreateDto | null {
    if (dto) {
      const createDto = new GroupCreateDto();
      createDto.name = dto?.name;
      createDto.role = dto?.role;
      createDto.description = dto?.description;
      return createDto;
    }
    return null;
  }

  @Length(4, 128, { message: 'Name length at least 4 characters' })
  @IsNotEmpty({ message: 'Name must not empty' })
  @IsDefined({ message: 'Name must be defined' })
  @IsString({ message: 'Name must be string' })
  @ApiProperty()
  public name: string;

  @Length(4, 128, { message: 'Role length at least 4 characters' })
  @IsNotEmpty({ message: 'Role must not empty' })
  @IsDefined({ message: 'Role must be defined' })
  @IsString({ message: 'Role must be string' })
  @ApiProperty()
  public role: string;

  @IsString({ message: 'Description must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  public description: string;
}
