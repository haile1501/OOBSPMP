import { Module } from "@nestjs/common";
import { PickersController } from "./pickers.controller";
import { PickersService } from "./pickers.service";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { RmqModule } from "@app/common";
import { DECISION_SERVICE, PICKERS_SERVICE } from "./constants/services";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_DECISION_QUEUE: Joi.string().required(),
        RABBIT_MQ_PICKERS_QUEUE: Joi.string().required(),
      }),
      envFilePath: "./apps/pickers/.env",
    }),
    RmqModule.register({
      name: DECISION_SERVICE,
    }),
    RmqModule.register({
      name: PICKERS_SERVICE,
    }),
  ],
  controllers: [PickersController],
  providers: [PickersService],
})
export class PickersModule {}
