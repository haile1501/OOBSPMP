import { Body, Controller, Get, Logger, Post } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import {
  CreateOrderRequest,
  Orderline,
} from "../../../libs/common/dto/create-order.request";
import * as fs from "fs";
import { lastValueFrom } from "rxjs";
import { RmqService } from "@app/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";

function parseOrderTextFile(filePath: string): CreateOrderRequest[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  const orders: CreateOrderRequest[] = [];
  let currentOrder: CreateOrderRequest | null = null;
  let orderlines: Orderline[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("Order")) {
      orderlines = [];
      const orderInfo = trimmedLine.split("\t");
      const id = parseInt(orderInfo[0].split(" ")[1], 10);
      const weight = parseInt(orderInfo[1].split(" ")[3], 10);
      currentOrder = new CreateOrderRequest(id, [], weight);
      orders.push(currentOrder);
      //const scheduledCompletionTime = parseFloat(orderInfo[2].split(" ")[3]);
    } else if (trimmedLine !== "") {
      const position = trimmedLine.split("\t");
      const aisleId = parseInt(position[1].split(" ")[1], 10);
      const rowId = parseInt(position[2].split(" ")[1], 10);
      const orderLine = new Orderline(aisleId, rowId, 1);
      orderlines.push(orderLine);
      currentOrder.orderlines = orderlines;
    }
  }

  return orders;
}

function generateExponential(rate: number): number {
  return -Math.log(Math.random()) / rate;
}

@Controller("orders")
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly rmqService: RmqService
  ) {}

  @Post()
  async createOrder(@Body() request: CreateOrderRequest) {
    this.ordersService.createOrder(request);
  }

  @Get()
  getHello(): string {
    return "ok";
  }

  @Get("start")
  async startTest() {
    // const lambdasMapping = {
    //   40: 0.6667,
    //   60: 1,
    //   80: 1.334,
    //   100: 1.667,
    //   200: 3.334,
    // };
    // const files = fs.readdirSync("./testcases");
    // files.forEach(async (file, index) => {
    //   const orders = parseOrderTextFile(`./testcases/${file}`);
    //   const PICKING_DEVICE_CAPACITY = parseInt(
    //     file.split(".")[0].split("-")[2]
    //   );
    //   const NUMBER_ORDERS = orders.length;
    //   await lastValueFrom(
    //     this.ordersService.start(PICKING_DEVICE_CAPACITY, NUMBER_ORDERS, index)
    //   );
    //   let currentTime = 0;
    //   for (let i = 0; i < orders.length; i++) {
    //     const interarrivalTime = generateExponential(
    //       lambdasMapping[orders.length]
    //     );
    //     currentTime += interarrivalTime;
    //     this.logger.log(
    //       `order ${orders[i].id} will come after ${currentTime} minutes`
    //     );
    //     setTimeout(() => {
    //       this.logger.log(`release order ${orders[i].id}`);
    //       this.ordersService.createOrder(orders[i]);
    //     }, currentTime * 60 * 1000);
    //   }
    // });
    this.ordersService.startTestCase(0);
  }

  @EventPattern("finish_testcase")
  async handleFinishTestCase(@Payload() data: any, @Ctx() context: RmqContext) {
    this.ordersService.startTestCase(data.fileNum + 1);
    this.rmqService.ack(context);
  }
}
