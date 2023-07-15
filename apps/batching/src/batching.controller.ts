import { Controller, Get } from "@nestjs/common";
import { BatchingService } from "./batching.service";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { RmqService } from "@app/common";
import { CreateOrderRequest } from "libs/common/dto/create-order.request";

@Controller()
export class BatchingController {
  constructor(
    private readonly batchingService: BatchingService,
    private readonly rmqService: RmqService
  ) {}

  @EventPattern("order_arrival")
  async handleOrderCreated(
    @Payload() data: CreateOrderRequest,
    @Ctx() context: RmqContext
  ) {
    this.batchingService.handleOrderCreated(data);
    this.rmqService.ack(context);
  }

  @EventPattern("picker_available")
  async handlePickerAvailable(
    @Payload() data: any,
    @Ctx() context: RmqContext
  ) {
    this.batchingService.handlePickerAvailable(data);
    this.rmqService.ack(context);
  }

  @EventPattern("start")
  handleStart(@Payload() data: any, @Ctx() context: RmqContext) {
    this.batchingService.setSystemStartTime(data);
    this.rmqService.ack(context);
  }
}
