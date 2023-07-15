import { Batch } from "../entities/batch.entity";
import { Order } from "../entities/order.entity";
import * as lodash from "lodash";

interface ISolution {
  batches: Batch[];
}

export const batchingAlgorithm = (
  orders: Order[],
  PICKING_DEVICE_CAPACITY: number
): Batch[] => {
  const initSolution = (orders: Order[]): ISolution => {
    const solution: ISolution = {
      batches: [new Batch([])],
    };

    for (const order of orders) {
      let isInserted = false;
      for (const batch of solution.batches) {
        if (batch.getWeight() + order.getWeight() <= PICKING_DEVICE_CAPACITY) {
          isInserted = true;
          batch.addOrdersToBatch([order]);
          break;
        }
      }

      if (!isInserted) {
        const newBatch = new Batch([order]);
        solution.batches.push(newBatch);
      }
    }

    return solution;
  };

  const calculateSimilarity = (
    batchedOrders: Order[],
    candidateOrder: Order
  ): number => {
    const batchedOrderAisles = new Set<number>([]);
    const candidateAisles = new Set<number>([]);
    let similarAislesNum = 0;
    batchedOrders.forEach((order) => {
      order.getOrderlines().forEach((orderline) => {
        batchedOrderAisles.add(orderline.getAisleId());
      });
    });

    candidateOrder.getOrderlines().forEach((orderline) => {
      const aisleId = orderline.getAisleId();
      if (!candidateAisles.has(aisleId) && batchedOrderAisles.has(aisleId)) {
        similarAislesNum++;
        candidateAisles.add(aisleId);
      }
    });

    const similarityDegree =
      similarAislesNum /
      (batchedOrderAisles.size + candidateAisles.size - similarAislesNum);

    return similarityDegree;
  };

  const initSolution3 = (orders: Order[]): ISolution => {
    const batches: Batch[] = [];
    const pool = orders.map((order) => order);
    let batch: Batch = new Batch([]);

    while (pool.length) {
      if (!batch.getBatchedOrders().length) {
        // select seed order
        const seedOrder = pool[0]; // first order in the pool
        batch.addOrdersToBatch([seedOrder]);
        pool.splice(0, 1);
      } else {
        // select the suitable order to add to batch
        let suitableOrderIndex = -1;
        let maxSimilarityDegree = -1;
        pool.forEach((order, index) => {
          if (
            batch.getWeight() + order.getWeight() <=
            PICKING_DEVICE_CAPACITY
          ) {
            const similarityDegree = calculateSimilarity(
              batch.getBatchedOrders(),
              order
            );
            if (similarityDegree > maxSimilarityDegree) {
              maxSimilarityDegree = similarityDegree;
              suitableOrderIndex = index;
            }
          }
        });

        if (suitableOrderIndex !== -1) {
          batch.addOrdersToBatch([pool[suitableOrderIndex]]);
          pool.splice(suitableOrderIndex, 1);
        } else {
          batches.push(batch);
          batch = new Batch([]);
        }
      }
    }

    const solution: ISolution = {
      batches,
    };
    return solution;
  };

  const evaluateSolution = (solution: ISolution) => {
    let totalTravelTime = 0;
    solution.batches.forEach((batch) => {
      totalTravelTime += batch.getTotalPickingTime();
    });

    return totalTravelTime;
  };

  const bestInsert1x0 = (solution: ISolution): ISolution | null => {
    let bestNeighborSol: ISolution | null = null;

    solution.batches.forEach((batchToRemove, batchToReMoveIndex) => {
      batchToRemove.getBatchedOrders().forEach((order, orderIndex) => {
        solution.batches.forEach((batchToInsert, batchToInsertIndex) => {
          if (batchToInsertIndex !== batchToReMoveIndex) {
            const neighborSol = lodash.cloneDeep<ISolution>(solution);
            const order =
              neighborSol.batches[batchToReMoveIndex].getBatchedOrders()[
                orderIndex
              ];
            neighborSol.batches[batchToInsertIndex].addOrdersToBatch([order]);
            neighborSol.batches[batchToReMoveIndex].removeOrdersFromBatch([
              orderIndex,
            ]);
            const insertedBatch = neighborSol.batches[batchToInsertIndex];
            if (
              insertedBatch.getWeight() <= PICKING_DEVICE_CAPACITY &&
              evaluateSolution(neighborSol) < evaluateSolution(solution)
            ) {
              bestNeighborSol = neighborSol;
            }
          }
        });
      });
    });

    return bestNeighborSol;
  };

  const bestSwap2x1 = (solution: ISolution): ISolution | null => {
    let bestNeighborSol: ISolution | null = null;

    const batches = solution.batches;
    batches.forEach((batchToSwap2, batchToSwap2Index) => {
      const batchedOrdersToSwap2 = batchToSwap2.getBatchedOrders();
      for (let i = 0; i < batchedOrdersToSwap2.length - 1; i++) {
        for (let j = i + 1; j < batchedOrdersToSwap2.length; j++) {
          const orderToSwap21 = batchedOrdersToSwap2[i];
          const orderToSwap22 = batchedOrdersToSwap2[j];
          batches.forEach((batchToSwap1, batchToSwap1Index) => {
            if (batchToSwap1Index !== batchToSwap2Index) {
              const batchedOrdersToSwap1 = batchToSwap1.getBatchedOrders();
              for (let k = 0; k < batchedOrdersToSwap1.length; k++) {
                const orderToSwap1 = batchedOrdersToSwap1[k];
                const newWeightBatchToSwap2 =
                  batchToSwap2.getWeight() -
                  orderToSwap21.getWeight() -
                  orderToSwap22.getWeight() +
                  orderToSwap1.getWeight();
                const newWeightBatchToSwap1 =
                  batchToSwap1.getWeight() +
                  orderToSwap21.getWeight() +
                  orderToSwap22.getWeight() -
                  orderToSwap1.getWeight();
                if (
                  newWeightBatchToSwap1 <= PICKING_DEVICE_CAPACITY &&
                  newWeightBatchToSwap2 <= PICKING_DEVICE_CAPACITY
                ) {
                  const neighborSol = lodash.cloneDeep<ISolution>(solution);
                  neighborSol.batches[batchToSwap2Index].removeOrdersFromBatch([
                    i,
                    j,
                  ]);
                  neighborSol.batches[batchToSwap2Index].addOrdersToBatch([
                    orderToSwap1,
                  ]);
                  neighborSol.batches[batchToSwap1Index].removeOrdersFromBatch([
                    k,
                  ]);
                  neighborSol.batches[batchToSwap1Index].addOrdersToBatch([
                    orderToSwap21,
                    orderToSwap22,
                  ]);
                  if (
                    evaluateSolution(neighborSol) < evaluateSolution(solution)
                  ) {
                    bestNeighborSol = neighborSol;
                  }
                }
              }
            }
          });
        }
      }
    });
    return bestNeighborSol;
  };

  const bestSwap1x1 = (solution: ISolution): ISolution | null => {
    let bestNeighborSol: ISolution | null = null;
    const batches = solution.batches;
    for (let i = 0; i < batches.length - 1; i++) {
      const firstBatch = batches[i];
      firstBatch.getBatchedOrders().forEach((firstOrder, firstOrderIndex) => {
        for (let j = i + 1; j < batches.length; j++) {
          const secondBatch = batches[j];
          secondBatch
            .getBatchedOrders()
            .forEach((secondOrder, secondOrderIndex) => {
              const newFirstBatchWeight =
                firstBatch.getWeight() -
                firstOrder.getWeight() +
                secondOrder.getWeight();
              const newSecondBatchWeight =
                secondBatch.getWeight() -
                secondOrder.getWeight() +
                firstOrder.getWeight();
              if (
                newFirstBatchWeight <= PICKING_DEVICE_CAPACITY &&
                newSecondBatchWeight <= PICKING_DEVICE_CAPACITY
              ) {
                const neighborSol = lodash.cloneDeep<ISolution>(solution);
                neighborSol.batches[i].removeOrdersFromBatch([firstOrderIndex]);
                neighborSol.batches[i].addOrdersToBatch([secondOrder]);
                neighborSol.batches[j].removeOrdersFromBatch([
                  secondOrderIndex,
                ]);
                neighborSol.batches[j].addOrdersToBatch([firstOrder]);
                if (
                  evaluateSolution(neighborSol) < evaluateSolution(solution)
                ) {
                  bestNeighborSol = neighborSol;
                }
              }
            });
        }
      });
    }
    return bestNeighborSol;
  };

  const bestSwap2x2 = (solution: ISolution): ISolution | null => {
    let bestNeighborSol: ISolution | null = null;

    const batches = solution.batches;
    batches.forEach((firstBatch, firstBatchIndex) => {
      const firstOrders = firstBatch.getBatchedOrders();
      for (let i = 0; i < firstOrders.length - 1; i++) {
        for (let j = i + 1; j < firstOrders.length; j++) {
          const firstOrder1 = firstOrders[i];
          const firstOrder2 = firstOrders[j];
          batches.forEach((secondBatch, secondBatchIndex) => {
            if (firstBatchIndex !== secondBatchIndex) {
              const secondOrders = secondBatch.getBatchedOrders();
              for (let k = 0; k < secondOrders.length - 1; k++) {
                for (let l = k + 1; l < secondOrders.length; l++) {
                  const secondOrder1 = secondOrders[k];
                  const secondOrder2 = secondOrders[l];
                  const newFirstBatchWeight =
                    firstBatch.getWeight() -
                    firstOrder1.getWeight() -
                    firstOrder2.getWeight() +
                    secondOrder1.getWeight() +
                    secondOrder2.getWeight();
                  const newSecondBatchWeight =
                    secondBatch.getWeight() +
                    firstOrder1.getWeight() +
                    firstOrder2.getWeight() -
                    secondOrder1.getWeight() -
                    secondOrder2.getWeight();
                  if (
                    newFirstBatchWeight <= PICKING_DEVICE_CAPACITY &&
                    newSecondBatchWeight <= PICKING_DEVICE_CAPACITY
                  ) {
                    const neighborSol = lodash.cloneDeep<ISolution>(solution);
                    neighborSol.batches[firstBatchIndex].removeOrdersFromBatch([
                      i,
                      j,
                    ]);
                    neighborSol.batches[firstBatchIndex].addOrdersToBatch([
                      secondOrder1,
                      secondOrder2,
                    ]);
                    neighborSol.batches[secondBatchIndex].removeOrdersFromBatch(
                      [k, l]
                    );
                    neighborSol.batches[secondBatchIndex].addOrdersToBatch([
                      firstOrder1,
                      firstOrder2,
                    ]);
                    if (
                      evaluateSolution(neighborSol) < evaluateSolution(solution)
                    ) {
                      bestNeighborSol = neighborSol;
                    }
                  }
                }
              }
            }
          });
        }
      }
    });
    return bestNeighborSol;
  };

  const randomInsert1x0 = (solution: ISolution): ISolution => {
    const neighborSols: ISolution[] = [];

    solution.batches.forEach((batchToRemove, batchToReMoveIndex) => {
      batchToRemove.getBatchedOrders().forEach((order, orderIndex) => {
        solution.batches.forEach((batchToInsert, batchToInsertIndex) => {
          if (batchToInsertIndex !== batchToReMoveIndex) {
            const neighborSol = lodash.cloneDeep<ISolution>(solution);
            const order =
              neighborSol.batches[batchToReMoveIndex].getBatchedOrders()[
                orderIndex
              ];
            neighborSol.batches[batchToInsertIndex].addOrdersToBatch([order]);
            neighborSol.batches[batchToReMoveIndex].removeOrdersFromBatch([
              orderIndex,
            ]);
            const insertedBatch = neighborSol.batches[batchToInsertIndex];
            if (insertedBatch.getWeight() <= PICKING_DEVICE_CAPACITY) {
              neighborSols.push(neighborSol);
            }
          }
        });
      });
    });

    return neighborSols[Math.floor(Math.random() * neighborSols.length)];
  };

  const randomSwap2x1 = (solution: ISolution): ISolution => {
    const neighborSols: ISolution[] = [];

    const batches = solution.batches;
    batches.forEach((batchToSwap2, batchToSwap2Index) => {
      const batchedOrdersToSwap2 = batchToSwap2.getBatchedOrders();
      for (let i = 0; i < batchedOrdersToSwap2.length - 1; i++) {
        for (let j = i + 1; j < batchedOrdersToSwap2.length; j++) {
          const orderToSwap21 = batchedOrdersToSwap2[i];
          const orderToSwap22 = batchedOrdersToSwap2[j];
          batches.forEach((batchToSwap1, batchToSwap1Index) => {
            if (batchToSwap1Index !== batchToSwap2Index) {
              const batchedOrdersToSwap1 = batchToSwap1.getBatchedOrders();
              for (let k = 0; k < batchedOrdersToSwap1.length; k++) {
                const orderToSwap1 = batchedOrdersToSwap1[k];
                const newWeightBatchToSwap2 =
                  batchToSwap2.getWeight() -
                  orderToSwap21.getWeight() -
                  orderToSwap22.getWeight() +
                  orderToSwap1.getWeight();
                const newWeightBatchToSwap1 =
                  batchToSwap1.getWeight() +
                  orderToSwap21.getWeight() +
                  orderToSwap22.getWeight() -
                  orderToSwap1.getWeight();
                if (
                  newWeightBatchToSwap1 <= PICKING_DEVICE_CAPACITY &&
                  newWeightBatchToSwap2 <= PICKING_DEVICE_CAPACITY
                ) {
                  const neighborSol = lodash.cloneDeep<ISolution>(solution);
                  neighborSol.batches[batchToSwap2Index].removeOrdersFromBatch([
                    i,
                    j,
                  ]);
                  neighborSol.batches[batchToSwap2Index].addOrdersToBatch([
                    orderToSwap1,
                  ]);
                  neighborSol.batches[batchToSwap1Index].removeOrdersFromBatch([
                    k,
                  ]);
                  neighborSol.batches[batchToSwap1Index].addOrdersToBatch([
                    orderToSwap21,
                    orderToSwap22,
                  ]);

                  neighborSols.push(neighborSol);
                }
              }
            }
          });
        }
      }
    });

    return neighborSols[Math.floor(Math.random() * neighborSols.length)];
  };

  const randomSwap1x1 = (solution: ISolution): ISolution => {
    const neighborSols: ISolution[] = [];

    const batches = solution.batches;
    for (let i = 0; i < batches.length - 1; i++) {
      const firstBatch = batches[i];
      firstBatch.getBatchedOrders().forEach((firstOrder, firstOrderIndex) => {
        for (let j = i + 1; j < batches.length; j++) {
          const secondBatch = batches[j];
          secondBatch
            .getBatchedOrders()
            .forEach((secondOrder, secondOrderIndex) => {
              const newFirstBatchWeight =
                firstBatch.getWeight() -
                firstOrder.getWeight() +
                secondOrder.getWeight();
              const newSecondBatchWeight =
                secondBatch.getWeight() -
                secondOrder.getWeight() +
                firstOrder.getWeight();
              if (
                newFirstBatchWeight <= PICKING_DEVICE_CAPACITY &&
                newSecondBatchWeight <= PICKING_DEVICE_CAPACITY
              ) {
                const neighborSol = lodash.cloneDeep<ISolution>(solution);
                neighborSol.batches[i].removeOrdersFromBatch([firstOrderIndex]);
                neighborSol.batches[i].addOrdersToBatch([secondOrder]);
                neighborSol.batches[j].removeOrdersFromBatch([
                  secondOrderIndex,
                ]);
                neighborSol.batches[j].addOrdersToBatch([firstOrder]);
                neighborSols.push(neighborSol);
              }
            });
        }
      });
    }

    return neighborSols[Math.floor(Math.random() * neighborSols.length)];
  };

  const randomSwap2x2 = (solution: ISolution): ISolution => {
    const neighborSols: ISolution[] = [];

    const batches = solution.batches;
    batches.forEach((firstBatch, firstBatchIndex) => {
      const firstOrders = firstBatch.getBatchedOrders();
      for (let i = 0; i < firstOrders.length - 1; i++) {
        for (let j = i + 1; j < firstOrders.length; j++) {
          const firstOrder1 = firstOrders[i];
          const firstOrder2 = firstOrders[j];
          batches.forEach((secondBatch, secondBatchIndex) => {
            if (firstBatchIndex !== secondBatchIndex) {
              const secondOrders = secondBatch.getBatchedOrders();
              for (let k = 0; k < secondOrders.length - 1; k++) {
                for (let l = k + 1; l < secondOrders.length; l++) {
                  const secondOrder1 = secondOrders[k];
                  const secondOrder2 = secondOrders[l];
                  const newFirstBatchWeight =
                    firstBatch.getWeight() -
                    firstOrder1.getWeight() -
                    firstOrder2.getWeight() +
                    secondOrder1.getWeight() +
                    secondOrder2.getWeight();
                  const newSecondBatchWeight =
                    secondBatch.getWeight() +
                    firstOrder1.getWeight() +
                    firstOrder2.getWeight() -
                    secondOrder1.getWeight() -
                    secondOrder2.getWeight();
                  if (
                    newFirstBatchWeight <= PICKING_DEVICE_CAPACITY &&
                    newSecondBatchWeight <= PICKING_DEVICE_CAPACITY
                  ) {
                    const neighborSol = lodash.cloneDeep<ISolution>(solution);
                    neighborSol.batches[firstBatchIndex].removeOrdersFromBatch([
                      i,
                      j,
                    ]);
                    neighborSol.batches[firstBatchIndex].addOrdersToBatch([
                      secondOrder1,
                      secondOrder2,
                    ]);
                    neighborSol.batches[secondBatchIndex].removeOrdersFromBatch(
                      [k, l]
                    );
                    neighborSol.batches[secondBatchIndex].addOrdersToBatch([
                      firstOrder1,
                      firstOrder2,
                    ]);
                    neighborSols.push(neighborSol);
                  }
                }
              }
            }
          });
        }
      }
    });

    return neighborSols[Math.floor(Math.random() * neighborSols.length)];
  };

  const GVNS = (initialSolution: ISolution): ISolution => {
    const kMax = 4;
    const lMax = 4;
    let notImprovedCount = 0;
    const maxNotImprovedCount = 10;
    let bestSolution = initialSolution;

    while (notImprovedCount < maxNotImprovedCount) {
      let k = 1;
      while (k <= kMax) {
        // Shaking
        let randomNeighbor = bestSolution;
        if (k === 1) {
          randomNeighbor = randomInsert1x0(bestSolution);
        } else if (k === 2) {
          randomNeighbor = randomSwap1x1(bestSolution);
        } else if (k === 3) {
          randomNeighbor = randomSwap2x1(bestSolution);
        } else if (k === 4) {
          randomNeighbor = randomSwap2x2(bestSolution);
        }

        if (!randomNeighbor) {
          if (k < kMax) {
            k = k + 1;
            continue;
          } else {
            break;
          }
        }

        // VND Local Search
        let l = 1;
        let bestNeighborSol = null;
        while (l < lMax) {
          if (l === 1) {
            bestNeighborSol = bestInsert1x0(randomNeighbor);
          } else if (l === 2) {
            bestNeighborSol = bestSwap1x1(randomNeighbor);
          } else if (l === 3) {
            bestNeighborSol = bestSwap2x1(randomNeighbor);
          } else if (l === 4) {
            bestNeighborSol = bestSwap2x2(randomNeighbor);
          }

          if (bestNeighborSol) {
            randomNeighbor = bestNeighborSol;
            l = 1;
          } else {
            l = l + 1;
          }
        }

        if (evaluateSolution(randomNeighbor) > evaluateSolution(bestSolution)) {
          bestSolution = randomNeighbor;
          notImprovedCount = 0;
          k = 1;
        } else {
          k = k + 1;
        }
      }

      notImprovedCount = notImprovedCount + 1;
    }

    return bestSolution;
  };

  const localSearch = (
    neighbor: Function,
    bestSolution: ISolution
  ): ISolution => {
    let bestNeighborSol = bestSolution;
    while (1) {
      const neighborSol = neighbor(bestNeighborSol);
      if (neighborSol) {
        bestNeighborSol = neighborSol;
      } else {
        break;
      }
    }

    return bestNeighborSol;
  };

  const BVNS = (initialSolution: ISolution): ISolution => {
    let k = 1;
    let kMax = 10 + Math.ceil(initialSolution.batches.length / 2);
    let bestSolution = initialSolution;
    while (k <= kMax) {
      // Shake
      let bestNeighborSol = bestSolution;
      if (randomSwap1x1(bestNeighborSol)) {
        bestNeighborSol = randomSwap1x1(bestNeighborSol);
      }

      if (randomSwap2x1(bestNeighborSol)) {
        bestNeighborSol = randomSwap2x1(bestNeighborSol);
      }

      bestNeighborSol = localSearch(bestSwap1x1, bestNeighborSol);
      bestNeighborSol = localSearch(bestSwap2x1, bestNeighborSol);
      if (evaluateSolution(bestNeighborSol) < evaluateSolution(bestSolution)) {
        k = 1;
        bestSolution = bestNeighborSol;
      } else {
        k = k + 1;
      }
    }

    return bestSolution;
  };

  const VND1 = (initialSolution: ISolution): ISolution => {
    let k = 1;
    let kMax = 3;
    let bestSolution = initialSolution;
    let bestNeighborSol = bestSolution;
    while (k <= kMax) {
      // Shake
      for (let i = 0; i < k; i++) {
        bestNeighborSol = randomSwap1x1(bestNeighborSol);
      }
      if (k === 1) {
        bestNeighborSol = localSearch(bestInsert1x0, bestNeighborSol);
      } else if (k === 2) {
        bestNeighborSol = localSearch(bestSwap2x1, bestNeighborSol);
      } else if (k === 3) {
        bestNeighborSol = localSearch(bestSwap1x1, bestNeighborSol);
      }
      // minimal total picking time
      if (evaluateSolution(bestNeighborSol) < evaluateSolution(bestSolution)) {
        bestSolution = bestNeighborSol;
        k = 1;
      } else {
        k = k + 1;
      }
    }

    return bestSolution;
  };

  const VND2 = (initialSolution: ISolution): ISolution => {
    let k = 1;
    let kMax = 3;
    let bestSolution = initialSolution;
    let bestNeighborSol = null;
    while (k <= kMax) {
      if (k === 1) {
        bestNeighborSol = bestInsert1x0(bestSolution);
      } else if (k === 2) {
        bestNeighborSol = bestSwap2x1(bestSolution);
      } else if (k === 3) {
        bestNeighborSol = bestSwap1x1(bestSolution);
      }
      // minimal total picking time
      if (bestNeighborSol) {
        bestSolution = bestNeighborSol;
        k = 1;
      } else {
        k = k + 1;
      }
    }

    return bestSolution;
  };

  const initialSolution = initSolution(orders);
  const improvedSolution = BVNS(initialSolution);
  return improvedSolution.batches;
};

// const evalPerformance = (orders: Order[]) => {
//   const fcfsSolution = initSolution(orders);
//   const startTime = performance.now();

//   const initialSolution = initSolution3(orders);
//   const improvedSolution = BVNS(initialSolution);

//   const endTime = performance.now();
//   const elapsedTime = (endTime - startTime) / 60000;

//   const fcfsEval = evaluateSolution(fcfsSolution);
//   const improvedEval = evaluateSolution(improvedSolution);
//   return {
//     improvementPercentage: ((fcfsEval - improvedEval) * 100) / fcfsEval,
//     elapsedTime,
//   };
// };
