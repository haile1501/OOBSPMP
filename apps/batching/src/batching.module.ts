import { Module } from "@nestjs/common";
import { BatchingController } from "./batching.controller";
import { BatchingService } from "./batching.service";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { RmqModule } from "@app/common";
import { PICKERS_SERVICE, TESTCASES_SERVICE } from "./constants/services";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_DECISION_QUEUE: Joi.string().required(),
      }),
    }),
    RmqModule,
    RmqModule.register({
      name: PICKERS_SERVICE,
    }),
    RmqModule.register({
      name: TESTCASES_SERVICE,
    }),
  ],
  controllers: [BatchingController],
  providers: [BatchingService],
})
export class BatchingModule {}
