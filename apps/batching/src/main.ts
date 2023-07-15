import { NestFactory } from "@nestjs/core";
import { BatchingModule } from "./batching.module";
import { RmqService } from "@app/common";

async function bootstrap() {
  const app = await NestFactory.create(BatchingModule);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions("DECISION"));
  await app.startAllMicroservices();
}
bootstrap();
