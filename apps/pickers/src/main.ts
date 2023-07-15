import { NestFactory } from "@nestjs/core";
import { PickersModule } from "./pickers.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RmqService } from "@app/common";

async function bootstrap() {
  const app = await NestFactory.create(PickersModule);
  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions("PICKERS"));
  await app.startAllMicroservices();
  await app.listen(configService.get("PORT"));
}
bootstrap();
