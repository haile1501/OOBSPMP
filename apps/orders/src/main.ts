import { NestFactory } from "@nestjs/core";
import { OrdersModule } from "./orders.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RmqService } from "@app/common";
import { TESTCASES_SERVICE } from "./constants/services";

async function bootstrap() {
  const app = await NestFactory.create(OrdersModule);
  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions(TESTCASES_SERVICE));
  await app.startAllMicroservices();
  await app.listen(configService.get("PORT"));
}
bootstrap();
