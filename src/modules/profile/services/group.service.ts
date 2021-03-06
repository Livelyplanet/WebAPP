import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupCreateDto, GroupUpdateDto } from '../domain/dto/index.dto';
import { validate } from 'class-validator';
import { IService } from './IService';
import { GroupEntity } from '../domain/entity';
import { RoleService } from './role.service';
import { PostgresErrorCode } from './postgresErrorCode.enum';

@Injectable()
export class GroupService implements IService<GroupEntity> {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    private readonly roleService: RoleService,
  ) {}

  async create(groupDto: GroupCreateDto): Promise<GroupEntity> {
    const errors = await validate(groupDto, {
      validationError: { target: false },
      forbidUnknownValues: false,
    });
    if (errors.length > 0) {
      this.logger.log(
        `create group validation failed, dto: ${JSON.stringify(
          groupDto,
        )}, errors: ${errors}`,
      );

      throw new HttpException(
        { message: 'Input data validation failed', errors },
        HttpStatus.BAD_REQUEST,
      );
    }

    let roleEntity;
    try {
      roleEntity = await this.roleService.findByName(groupDto.role);
    } catch (error) {
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!roleEntity) {
      this.logger.log(
        `roleService.findByName failed, role not found: ${groupDto.role}`,
      );
      throw new HttpException(
        {
          message: `Create group ${groupDto.name} failed, role ${groupDto.role} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    let group = new GroupEntity();
    group.name = groupDto.name.toUpperCase();
    group.description = groupDto.description;
    group.role = roleEntity;

    try {
      group = await this.groupRepository.save(group);
    } catch (error) {
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          { message: 'Group name already exists' },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return group;
  }

  async deleteByName(name: string): Promise<void> {
    name = name.toUpperCase();

    const userCount = await this.groupRepository
      .createQueryBuilder('group')
      .select('count(*)')
      .innerJoin('group.users', 'user')
      .where('group.name = :name', { name: name })
      .groupBy('user.id')
      .getCount();

    if (userCount > 0) {
      this.logger.warn(`delete group ${name} failed, group has a users`);
      throw new UnprocessableEntityException({
        message: `Group ${name} could not delete`,
      });
    }

    let deleteResult;
    try {
      deleteResult = await this.groupRepository.softDelete({ name: name });
    } catch (err) {
      this.logger.error(`groupRepository.softDelete failed: ${name}`, err);
      throw new HttpException(
        { message: 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!deleteResult.affected) {
      throw new HttpException(
        { message: `Group ${name} Not Found` },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async delete(id: string): Promise<void> {
    const userCount = await this.groupRepository
      .createQueryBuilder('group')
      .select('count(*)')
      .innerJoin('group.users', 'user')
      .where('group.id = :id', { id: id })
      .groupBy('user.id')
      .getCount();

    if (userCount > 0) {
      this.logger.warn(`deleteByName group ${id} failed, group has a users`);
      throw new UnprocessableEntityException({
        message: `Group ${id} could not delete`,
      });
    }

    let deleteResult;
    try {
      deleteResult = await this.groupRepository.softDelete({ id: id });
    } catch (err) {
      this.logger.error(`groupRepository.softDelete failed: ${id}`, err);
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!deleteResult.affected) {
      throw new HttpException(
        { message: `Role ${id} Not Found` },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async findTotal(): Promise<number> {
    try {
      return await this.groupRepository.count();
    } catch (err) {
      this.logger.error(`userRepository.count failed`, err);
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    offset,
    limit: number,
    sortType,
    sortBy: string,
  ): Promise<{ data: Array<GroupEntity>; total: number } | null> {
    try {
      const res = await this.groupRepository.findAndCount({
        skip: offset,
        take: limit,
        order: {
          [sortBy]: sortType.toUpperCase(),
        },
      });
      return {
        data: res[0],
        total: res[1],
      };
    } catch (err) {
      this.logger.error(`groupRepository.find failed`, err);
      throw new HttpException(
        { message: 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: string): Promise<GroupEntity | null> {
    try {
      return await this.groupRepository.findOne({ where: { id: id } });
    } catch (err) {
      this.logger.error(`groupRepository.findOne failed. id: ${id}`, err);
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByName(name: string): Promise<GroupEntity | null> {
    name = name.toUpperCase();
    try {
      return await this.groupRepository.findOne({ where: { name: name } });
    } catch (err) {
      this.logger.error(`groupRepository.findOne failed, name: ${name}`, err);
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(options: object): Promise<GroupEntity | null> {
    try {
      return await this.groupRepository.findOne(options);
    } catch (err) {
      this.logger.error(
        `groupRepository.findOne failed, options: ${JSON.stringify(options)}`,
        err,
      );
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(groupDto: GroupUpdateDto): Promise<GroupEntity> {
    const errors = await validate(groupDto, {
      validationError: { target: false },
      forbidUnknownValues: false,
    });
    if (errors.length > 0) {
      this.logger.log(
        `group update validation failed, dto: ${groupDto}, errors: ${errors}`,
      );
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const group = await this.groupRepository.findOne({
      where: { name: groupDto.name.toUpperCase() },
    });
    if (!group) {
      this.logger.log(
        `groupRepository.findOne failed, group not found: ${groupDto.name.toUpperCase()}`,
      );
      throw new HttpException(
        {
          message: `Update group failed, ${groupDto.name.toUpperCase()} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    let roleEntity;
    try {
      roleEntity = await this.roleService.findByName(groupDto.role);
    } catch (error) {
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!roleEntity) {
      this.logger.log(
        `roleService.findByName failed, role not found: ${groupDto.role}`,
      );
      throw new HttpException(
        {
          message: `Update group ${groupDto.name} failed, role ${groupDto.role} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      group.description = groupDto.description;
      group.role = roleEntity;
      return await this.groupRepository.save(group);
    } catch (err) {
      this.logger.error(
        `groupRepository.save failed: ${JSON.stringify(groupDto)}`,
        err,
      );
      throw new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
