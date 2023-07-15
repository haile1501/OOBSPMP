export class OrderLine {
  constructor(
    private aisleId: number,
    private rowId: number,
    private quantity: number
  ) {}

  public getAisleId(): number {
    return this.aisleId;
  }

  public getRowId(): number {
    return this.rowId;
  }

  public getQuantity(): number {
    return this.quantity;
  }
}

export class Order {
  private arrivalTime: Date;
  constructor(
    private id: number,
    //private scheduledCompletionTime: Date | null,
    private orderlines: OrderLine[],
    private weight: number
  ) {
    this.arrivalTime = new Date(Date.now());
  }

  public getOrderId(): number {
    return this.id;
  }

  public getOrderlines(): OrderLine[] {
    return this.orderlines;
  }

  public setOrderlines(orderlines: OrderLine[]): void {
    this.orderlines = orderlines;
  }

  public getArrivalTime(): Date {
    return this.arrivalTime;
  }

  public getWeight(): number {
    return this.weight;
  }
}
