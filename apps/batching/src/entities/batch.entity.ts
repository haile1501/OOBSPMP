import { Order } from "./order.entity";
import { calculateBatchPickingTime } from "../algorithm/warehouse";

export class Batch {
  private batchedOrders: Order[];
  private totalPickingTime: number;
  private weight: number;

  constructor(batchedOrders: Order[]) {
    this.batchedOrders = batchedOrders;
    this.totalPickingTime = calculateBatchPickingTime(batchedOrders);
    this.calculateTotalWeight();
  }

  public getWeight(): number {
    return this.weight;
  }

  public getTotalPickingTime(): number {
    return this.totalPickingTime;
  }

  public getBatchedOrders(): Order[] {
    return this.batchedOrders;
  }

  public addOrdersToBatch(ordersToInsert: Order[]): void {
    this.batchedOrders.push(...ordersToInsert);
    this.totalPickingTime = calculateBatchPickingTime(this.batchedOrders);
    this.calculateTotalWeight();
  }

  public removeOrdersFromBatch(indicesToRemove: number[]): void {
    indicesToRemove.sort((a, b) => b - a);
    indicesToRemove.forEach((index) => {
      this.batchedOrders.splice(index, 1);
    });
    this.totalPickingTime = calculateBatchPickingTime(this.batchedOrders);
    this.calculateTotalWeight();
  }

  private calculateTotalWeight(): void {
    let total = 0;
    this.batchedOrders.forEach((order) => {
      total += order.getWeight();
    });

    this.weight = total;
  }
}
