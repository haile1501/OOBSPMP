import { Post, Controller, Get } from "@nestjs/common";
import { PickersService } from "./pickers.service";
import { EventPattern, Payload, Ctx, RmqContext } from "@nestjs/microservices";
import { CreateOrderRequest } from "libs/common/dto/create-order.request";
import { RmqService } from "@app/common";

@Controller("pickers")
export class PickersController {
  constructor(
    private readonly pickersService: PickersService,
    private readonly rmqService: RmqService
  ) {}

  @Get()
  getHello(): string {
    return "ok";
  }

  // @Post()
  // async becomeAvailable(picker: any) {
  //   return this.pickersService.becomeAvailable(picker);
  // }

  @EventPattern("assign_batch")
  async handleBatchAssigned(@Payload() data: any, @Ctx() context: RmqContext) {
    setTimeout(
      () => this.pickersService.becomeAvailable(data.picker, data.ordersNum),
      (data.pickingTime as number) * 1000 * 60
    );
    this.rmqService.ack(context);
  }
}
