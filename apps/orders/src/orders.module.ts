import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { RmqModule } from "@app/common";
import { DECISION_SERVICE, TESTCASES_SERVICE } from "./constants/services";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_DECISION_QUEUE: Joi.string().required(),
      }),
      envFilePath: "./apps/orders/.env",
    }),
    RmqModule.register({
      name: DECISION_SERVICE,
    }),
    RmqModule.register({
      name: TESTCASES_SERVICE,
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
