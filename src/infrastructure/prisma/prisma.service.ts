import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';


import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    const pool = new Pool({
      connectionString,
      max: 20, // max number of connections in the pool
      idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 5000, // return an error after 5 seconds if connection could not be established
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    const modelsWithSoftDelete = Prisma.dmmf.datamodel.models
      .filter((model) => model.fields.some((f) => f.name === 'deletedAt'))
      .map((model) => model.name);

    const client = this;

    const extended = this.$extends({
      query: {
        $allModels: {
          async findUnique({ model, args, query }) {
            if (modelsWithSoftDelete.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
              // Prisma requires findFirst instead of findUnique when querying on non-unique fields
              const modelDelegate =
                model.charAt(0).toLowerCase() + model.slice(1);
              return (client as any)[modelDelegate].findFirst(args);
            }
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (modelsWithSoftDelete.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async findMany({ model, args, query }) {
            if (modelsWithSoftDelete.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async count({ model, args, query }) {
            if (modelsWithSoftDelete.includes(model)) {
              args = args || {};
              args.where = { ...(args.where || {}), deletedAt: null };
            }
            return query(args);
          },
        },
      },
    });

    return extended as unknown as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
