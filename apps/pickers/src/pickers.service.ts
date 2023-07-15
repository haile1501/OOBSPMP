import { Inject, Injectable } from "@nestjs/common";
import { DECISION_SERVICE } from "./constants/services";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class PickersService {
  constructor(@Inject(DECISION_SERVICE) private batchingClient: ClientProxy) {}

  getHello(): string {
    return "Hello World!";
  }

  becomeAvailable(picker: any, ordersNum: number) {
    this.batchingClient.emit("picker_available", {
      picker,
      ordersNum,
    });
  }
}
