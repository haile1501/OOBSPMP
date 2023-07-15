// the position of depot is on the left of the warehouse
// id of aisles, rows start from 0 from the depot

import { Order } from "../entities/order.entity";

const ROWS_NUM = 45; // number of rows per aisle
const ROW_LENGTH = 1; // m
const DIS_BETWEEN_AISLES = 5; // m
const DIS_BETWEEN_DEPOT_FIRST_AISLE = 5; // m
export const PICKERS_NUM = 5;
export const TRAVEL_SPEED = 48; // 48 row/min
export const EXTRACTION_SPEED = 6; // 6 items/min
export const BATCH_SETUP_TIME = 1; // 3 min
export const PICKING_DEVICE_CAPACITY = 45; // number of items

export const calculateBatchPickingTime = (pickList: Order[]): number => {
  let totalDistance = 0;
  let totalItems = 0;
  const aislesToTraverse = new Set<number>([]);

  pickList.forEach((order) => {
    order.getOrderlines().forEach((orderline) => {
      const aisleId = orderline.getAisleId();
      totalItems += orderline.getQuantity();
      aislesToTraverse.add(aisleId);
    });
  });

  const sortedSet = Array.from(aislesToTraverse).sort();
  for (let i = 0; i < sortedSet.length; i++) {
    if (i === 0) {
      totalDistance +=
        sortedSet[i] * DIS_BETWEEN_AISLES + DIS_BETWEEN_DEPOT_FIRST_AISLE;
    } else {
      totalDistance += (sortedSet[i] - sortedSet[i - 1]) * DIS_BETWEEN_AISLES;
    }

    if (i === sortedSet.length - 1) {
      if (sortedSet.length % 2 === 1) {
        let furthestShelfOnLastAisle = 0;
        pickList.forEach((order) => {
          order.getOrderlines().forEach((orderline) => {
            if (
              orderline.getAisleId() === sortedSet[i] &&
              orderline.getRowId() > furthestShelfOnLastAisle
            ) {
              furthestShelfOnLastAisle = orderline.getRowId();
            }
          });
        });
        totalDistance += furthestShelfOnLastAisle * ROW_LENGTH * 2; // Go to the furthest row and U-turn
        totalDistance +=
          sortedSet[i] * DIS_BETWEEN_AISLES + DIS_BETWEEN_DEPOT_FIRST_AISLE; // return to the depot
        break;
      } else {
        totalDistance +=
          sortedSet[i] * DIS_BETWEEN_AISLES + DIS_BETWEEN_DEPOT_FIRST_AISLE; // return to the depot
      }
    }

    totalDistance += ROWS_NUM * ROW_LENGTH;
  }

  const totalPickingTime =
    BATCH_SETUP_TIME +
    totalDistance / TRAVEL_SPEED +
    totalItems / EXTRACTION_SPEED; // min

  return totalPickingTime;
};
