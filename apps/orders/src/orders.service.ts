import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  CreateOrderRequest,
  Orderline,
} from "../../../libs/common/dto/create-order.request";
import { DECISION_SERVICE } from "./constants/services";
import { ClientProxy } from "@nestjs/microservices";
import * as fs from "fs";
import { lastValueFrom } from "rxjs";

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

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(DECISION_SERVICE) private batchingClient: ClientProxy) {}

  createOrder(request: CreateOrderRequest) {
    this.batchingClient.emit("order_arrival", request);
  }

  start(pickingCapacity: number, numberOfOrders: number, fileNum: number) {
    return this.batchingClient.emit("start", {
      time: Date.now(),
      pickingCapacity,
      numberOfOrders,
      fileNum,
    });
  }

  async startTestCase(fileNum: number) {
    const lambdasMapping = {
      40: 0.6667,
      60: 1,
      80: 1.334,
      100: 1.667,
      200: 3.334,
    };
    const files = fs.readdirSync("apps/orders/src/testcases");
    if (fileNum < files.length) {
      const file = files[files.length - fileNum - 1];
      const orders = parseOrderTextFile(`apps/orders/src/testcases/${file}`);
      const PICKING_DEVICE_CAPACITY = parseInt(
        file.split(".")[0].split("-")[2]
      );
      const NUMBER_ORDERS = orders.length;
      await lastValueFrom(
        this.start(PICKING_DEVICE_CAPACITY, NUMBER_ORDERS, fileNum)
      );

      let currentTime = 0;
      for (let i = 0; i < orders.length; i++) {
        const interarrivalTime = generateExponential(
          lambdasMapping[orders.length]
        );
        currentTime += interarrivalTime;
        this.logger.log(
          `order ${orders[i].id} will come after ${currentTime} minutes`
        );
        setTimeout(() => {
          this.createOrder(orders[i]);
        }, currentTime * 60 * 1000);
      }
    }
  }
}
