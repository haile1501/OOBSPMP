import { IsDate, IsNumber } from "class-validator";

export class StartData {
  @IsNumber()
  pickingCapacity: number;

  @IsDate()
  time: Date;

  @IsNumber()
  numberOfOrders: number;

  @IsNumber()
  fileNum: number;
}
