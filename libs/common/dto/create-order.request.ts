import { Type } from "class-transformer";
import { IsArray, IsPositive, ValidateNested } from "class-validator";

export class Orderline {
  @IsPositive()
  aisleId: number;

  @IsPositive()
  rowId: number;

  @IsPositive()
  quantity: number;

  constructor(aisleId: number, rowId: number, quantity: number) {
    this.aisleId = aisleId;
    this.rowId = rowId;
    this.quantity = quantity;
  }
}

export class CreateOrderRequest {
  @IsPositive()
  id: number;

  @IsPositive()
  weight: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Orderline)
  orderlines: Orderline[];

  constructor(id: number, orderlines: [], weight: number) {
    this.id = id;
    this.orderlines = orderlines;
    this.weight = weight;
  }
}
