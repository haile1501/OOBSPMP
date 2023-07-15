import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreateOrderRequest } from "libs/common/dto/create-order.request";
import { Picker } from "./entities/picker.entity";
import { Order, OrderLine } from "./entities/order.entity";
import { PICKERS_SERVICE, TESTCASES_SERVICE } from "./constants/services";
import { ClientProxy } from "@nestjs/microservices";
import { batchingAlgorithm } from "./algorithm/batchingAlgorithm";
import { PICKING_DEVICE_CAPACITY } from "./algorithm/warehouse";
import { calculateBatchPickingTime } from "./algorithm/warehouse";
import { PICKERS_NUM } from "./algorithm/warehouse";
import { StartData } from "./dto/start-data.dto";
import * as fs from "fs";

@Injectable()
export class BatchingService {
  private timeOutId: any;
  private isWaiting = false;
  private unprocessedOrders: Order[] = [];
  private availablePickers: Picker[] = [];
  private systemStartTime: any;
  private systemEndTime: any;
  private numberOfOrders: number;
  private pickingCapacity: number;
  private numberOfHandled: number = 0;
  private fileNum: number;

  // private Workload = {}; // map pickerId - workload

  private readonly logger = new Logger(BatchingService.name);

  constructor(
    @Inject(PICKERS_SERVICE) private pickerClient: ClientProxy,
    @Inject(TESTCASES_SERVICE) private readonly testCasesClient: ClientProxy
  ) {
    for (let i = 0; i < PICKERS_NUM; i++) {
      this.availablePickers.push(new Picker(i));
    }
  }

  // possible type A or B
  handleOrderCreated(order: CreateOrderRequest) {
    this.logger.log(`Order ${order.id} comes`);
    const orderlines = order.orderlines.map(
      (orderline) =>
        new OrderLine(orderline.aisleId, orderline.rowId, orderline.quantity)
    );
    this.unprocessedOrders.push(new Order(order.id, orderlines, order.weight));

    if (
      this.isWaiting &&
      this.possibleBatchesNum() >= this.availablePickers.length
    ) {
      // type B
      this.logger.log("Decision point type BD");
      clearTimeout(this.timeOutId);
      this.handleDecisionPointBD();
    } else if (!this.isWaiting && this.availablePickers.length >= 1) {
      // type A
      this.logger.log("Decision point type AC");
      this.handleDecisionPointAC();
    }
  }

  // possible type C
  handlePickerAvailable(data: any) {
    this.logger.log(
      `picker ${data.picker.id} becomes available after collecting ${data.ordersNum} orders`
    );
    this.numberOfHandled += data.ordersNum;
    this.logger.log(`Number of handled orders: ${this.numberOfHandled}`);
    this.availablePickers.push(data.picker as Picker);
    this.logger.log(this.availablePickers);
    if (this.numberOfHandled === this.numberOfOrders) {
      this.systemEndTime = Date.now();
      this.testCasesClient.emit("finish_testcase", { fileNum: this.fileNum });
      this.logger.log(
        `Total: ${(this.systemEndTime - this.systemStartTime) / 60000} minutes`
      );
      this.logger.log(this.availablePickers);

      const filePath = "apps/batching/results/results.json";
      const data = {
        numberOfOrders: this.numberOfOrders,
        pickingCapacity: this.pickingCapacity,
        numberOfPickers: this.availablePickers.length,
        pickingTime: (this.systemEndTime - this.systemStartTime) / 60000,
        pickers: this.availablePickers,
      };

      const existingData = fs.readFileSync(filePath, "utf-8");
      const dataArray = JSON.parse(existingData) as any[];
      dataArray.push(data);
      // Convert the object to a JSON string
      const jsonData = JSON.stringify(dataArray);
      fs.writeFileSync(filePath, jsonData);
      console.log(1);
    }
    if (!this.isWaiting && this.unprocessedOrders.length > 0) {
      // type C
      this.handleDecisionPointAC();
    }
  }

  private handleDecisionPointAC() {
    console.log(1);

    if (this.possibleBatchesNum() === 1) {
      console.log(2);

      // define waiting threshold
      let longestServiceTime = -1;
      let longestServiceOrderArrivalTime = null;
      this.unprocessedOrders.forEach((order) => {
        const orderServiceTime = calculateBatchPickingTime([order]);
        if (orderServiceTime > longestServiceTime) {
          longestServiceTime = orderServiceTime;
          longestServiceOrderArrivalTime = order.getArrivalTime().getTime();
        }
      });
      const waitingThreshold =
        2 * (longestServiceOrderArrivalTime - this.systemStartTime) +
        longestServiceTime * 60 * 1000 -
        calculateBatchPickingTime(this.unprocessedOrders) * 60 * 1000 +
        this.systemStartTime;

      if (waitingThreshold > Date.now()) {
        const waitingPeriod = waitingThreshold - Date.now();
        this.isWaiting = true;
        this.logger.log(
          `Begin waiting period: ${waitingPeriod / 1000} seconds`
        );
        this.timeOutId = setTimeout(() => {
          this.handleDecisionPointBD();
        }, waitingPeriod);
      } else {
        this.batchAndAssign1();
      }
      console.log(3);
    } else {
      this.batchAndAssign1();
    }
  }

  private handleDecisionPointBD() {
    if (this.isWaiting) {
      this.logger.log(`End waiting period`);
      this.isWaiting = false;
      this.batchAndAssign2();
    }
  }

  private batchAndAssign1() {
    const batches = batchingAlgorithm(
      this.unprocessedOrders,
      this.pickingCapacity
    );
    let minimumArrivalBatchIndex = 0;
    let minimumArrival = -1;
    batches.forEach((batch, index) => {
      let averageArrival = 0;
      batch.getBatchedOrders().forEach((order) => {
        averageArrival += order.getArrivalTime().getTime();
      });
      averageArrival = averageArrival / batch.getBatchedOrders().length;
      if (minimumArrival < 0 || minimumArrival > averageArrival) {
        minimumArrival = averageArrival;
        minimumArrivalBatchIndex = index;
      }
    });

    const batchToPick = batches[minimumArrivalBatchIndex];
    this.availablePickers[0].workload += batchToPick.getTotalPickingTime();
    this.pickerClient.emit("assign_batch", {
      picker: this.availablePickers[0],
      pickingTime: batchToPick.getTotalPickingTime(),
      ordersNum: batchToPick.getBatchedOrders().length,
    });

    this.logger.log(
      `picker ${this.availablePickers[0].id} collects ${
        batchToPick.getBatchedOrders().length
      } orders, weight ${batchToPick.getWeight()},will be available after ${batchToPick.getTotalPickingTime()}`
    );

    const orderIdsToRemove = {};
    batchToPick.getBatchedOrders().forEach((order) => {
      this.logger.log(`remove order ${order.getOrderId()}`);
      orderIdsToRemove[order.getOrderId()] = true;
    });
    this.unprocessedOrders = this.unprocessedOrders.filter(
      (order) => !orderIdsToRemove[order.getOrderId()]
    );
    this.availablePickers.shift();
  }

  private batchAndAssign2() {
    const batches = batchingAlgorithm(
      this.unprocessedOrders,
      this.pickingCapacity
    );
    this.availablePickers.sort(
      (picker1, picker2) => picker1.workload - picker2.workload
    );
    batches.sort(
      (batch1, batch2) =>
        batch2.getTotalPickingTime() - batch1.getTotalPickingTime()
    );

    while (this.availablePickers.length > 0) {
      if (batches.length === 0) {
        break;
      } else {
        this.availablePickers[0].workload += batches[0].getTotalPickingTime();
        this.pickerClient.emit("assign_batch", {
          picker: this.availablePickers[0],
          pickingTime: batches[0].getTotalPickingTime(),
          ordersNum: batches[0].getBatchedOrders().length,
        });

        this.logger.log(
          `picker ${this.availablePickers[0].id} collects ${
            batches[0].getBatchedOrders().length
          } orders, weight ${batches[0].getWeight()} ,will be available after ${batches[0].getTotalPickingTime()} minutes`
        );

        const orderIdsToRemove = {};
        batches[0].getBatchedOrders().forEach((order) => {
          this.logger.log(`remove order ${order.getOrderId()}`);
          orderIdsToRemove[order.getOrderId()] = true;
        });
        this.unprocessedOrders = this.unprocessedOrders.filter(
          (order) => !orderIdsToRemove[order.getOrderId()]
        );
        this.availablePickers.shift();
        batches.shift();
      }
    }
  }

  private possibleBatchesNum(): number {
    let totalWeight = 0;
    this.unprocessedOrders.forEach(
      (order) => (totalWeight += order.getWeight())
    );
    return Math.ceil(totalWeight / PICKING_DEVICE_CAPACITY);
  }

  setSystemStartTime(startData: StartData) {
    this.logger.log("system start");
    this.systemStartTime = startData.time;
    this.pickingCapacity = startData.pickingCapacity;
    this.numberOfOrders = startData.numberOfOrders;
    this.fileNum = startData.fileNum;
    this.isWaiting = false;
    this.unprocessedOrders = [];
    this.availablePickers = [];
    this.numberOfHandled = 0;
    for (let i = 0; i < PICKERS_NUM; i++) {
      this.availablePickers.push(new Picker(i));
    }
    this.logger.log(
      `Picking capacity: ${this.pickingCapacity}, number of orders: ${this.numberOfOrders}, file number: ${this.fileNum}`
    );
  }
}
